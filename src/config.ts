import { Schema } from 'koishi'

// ==========================================
// ⚙️ 插件配置入口：常量、类型与分组 Schema
// ==========================================

// ====================
// 📦 常量与枚举定义
// ====================

/** 💬 指令回复引用模式 */
export const QUOTE_MODE = {
  NEVER: 'never',
  IF_MISSING: 'if-missing',
  ALWAYS: 'always',
} as const

export type QuoteModeType = typeof QUOTE_MODE[keyof typeof QUOTE_MODE]

/** 🎯 生效场景类型 */
export const SCENE_MODE = {
  GROUP: 'group',
  DIRECT: 'direct',
} as const

export type SceneModeType = typeof SCENE_MODE[keyof typeof SCENE_MODE]

// ====================
// 📋 配置接口类型定义
// ====================

export interface Config {
  // 💬 指令引用配置
  quoteMode: QuoteModeType

  // 🔄 联动撤回配置
  autoRecall: boolean
  recallDelay: number

  // 🛡️ 内存安全与防刷屏策略
  maxEntries: number
  expireTime: number

  // ⚙️ 作用域与调试选项
  enabledScenes: SceneModeType[]
  debug: boolean
}

// ====================
// ⚙️ 分组配置 Schema
// ====================

export const Config: Schema<Config> = Schema.intersect([
  // ==================
  // 💬 指令引用配置分组
  // ==================
  Schema.object({
    quoteMode: Schema.union([
      Schema.const(QUOTE_MODE.NEVER).description('【🔘 A】完全不引用：保持原样，不自动补充任何引用'),
      Schema.const(QUOTE_MODE.IF_MISSING).description('【💬 B】缺省时引用（推荐）：若回复未带 quote 元素则自动前置补充，已有引用则保持原有逻辑'),
      Schema.const(QUOTE_MODE.ALWAYS).description('【📌 C】强制引用：无论原回复是否自带 quote，均清洗旧引用并强制置顶对指令消息的引用'),
    ])
      .role('radio')
      .default(QUOTE_MODE.IF_MISSING)
      .description('💬 指令回复引用策略。智能识别指令触发消息（非指令出站消息不受影响）。'),
  }).description('💬 指令引用配置'),

  // ==================
  // 🔄 联动撤回配置分组
  // ==================
  Schema.object({
    autoRecall: Schema.boolean()
      .default(true)
      .description('🗑️ 是否开启联动撤回。当用户在聊天中撤回触发指令的消息时，Bot 会自动追溯并撤回回复该指令的所有消息。'),
    recallDelay: Schema.natural()
      .default(0)
      .description('⏱️ 联动撤回延迟时间 (毫秒)。默认 0 即刻撤回；如遇平台动画或消息未落库服务端竞态，可适当设置 500~1000 毫秒缓冲。'),
  }).description('🔄 联动撤回配置'),

  // ==================
  // 🛡️ 内存与防刷屏安全策略分组
  // ==================
  Schema.object({
    maxEntries: Schema.natural()
      .default(1000)
      .description('🚪 内存中最多保留的指令映射数量 (条)。默认 1000 条；当并发条数达到上限时，自动淘汰最旧的一条记录 (FIFO/LRU 策略)，形成防刷屏容量熔断保护。'),
    expireTime: Schema.natural()
      .default(180)
      .description('⏰ 指令映射最长保留时长 (单位：秒)。默认 180 秒 (3 分钟)；主流平台普通撤回窗口为 2 分钟，超时后自动注销映射并释放定时器。'),
  }).description('🛡️ 内存安全与防刷屏策略'),

  // ==================
  // ⚙️ 作用域与调试选项分组
  // ==================
  Schema.object({
    enabledScenes: Schema.array(Schema.union([
      Schema.const(SCENE_MODE.GROUP).description('👥 群聊场景 (包括群组、频道等多人聊天环境)'),
      Schema.const(SCENE_MODE.DIRECT).description('👤 私聊场景 (一对一好友私聊，部分平台私聊可能不支持撤回)'),
    ]))
      .role('checkbox')
      .default([SCENE_MODE.GROUP, SCENE_MODE.DIRECT])
      .description('🎯 插件生效的场景类型 (多选框，默认全部开启)。'),
    debug: Schema.boolean()
      .default(false)
      .description('🐛 开启详细控制台调试日志。开启后将在控制台输出 [Track]、[before-send]、[Recall] 和 [Cache] 的具体流转细节。'),
  }).description('⚙️ 作用域与调试选项'),
])
