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

/** 🚫 出站引用排除规则定义 */
export interface QuoteExcludeRule {
  platform: string // 🎯 平台名称（如 onebot、qq、* 通配）
  type: string // 🏷️ 消息元素类型（如 audio、forward、markdown、onebot:music 等）
  comment?: string // 📝 规则说明 / 跳过原因
}

// ====================
// 📋 配置接口类型定义
// ====================

export interface Config {
  // 💬 指令引用配置
  quoteMode: QuoteModeType
  quoteExcludeRules: QuoteExcludeRule[]

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
    quoteExcludeRules: Schema.array(Schema.object({
      platform: Schema.string().required().description('🎯 平台名称（如 onebot、qq、* 通配全部平台）'),
      type: Schema.string().required().description('🏷️ 消息元素类型（如 audio、forward、onebot:music、markdown 等）'),
      comment: Schema.string().description('📝 规则说明 / 跳过原因'),
    }))
      .role('table')
      .default([
        { platform: 'onebot', type: 'audio', comment: '🎙️ OneBot 语音 (PTT) 原生不支持引用，混发会导致空回复消息与 1200 错误 ❌' },
        { platform: 'onebot', type: 'video', comment: '🎬 OneBot 视频不支持引用，混发会被拆包成空引用消息或导致发送异常 🚫' },
        { platform: 'onebot', type: 'file', comment: '📁 OneBot 文件通过群文件 API 异步上传，无消息 ID 且不支持引用 🚫' },
        { platform: 'onebot', type: 'forward', comment: '📦 OneBot 合并转发消息不支持引用 🚫' },
        { platform: 'onebot', type: 'figure', comment: '🖼️ OneBot 合并转发容器不支持引用 🚫' },
        { platform: 'onebot', type: 'onebot:tts', comment: '🗣️ OneBot 文本转语音 (TTS) 原生不能混发引用 ❌' },
        { platform: 'onebot', type: 'onebot:poke', comment: '👉 OneBot 戳一戳属于特殊互动事件，不支持引用 🚫' },
        { platform: 'onebot', type: 'onebot:gift', comment: '🎁 OneBot 送礼物专属事件，不支持引用 🚫' },
        { platform: 'onebot', type: 'onebot:share', comment: '🔗 OneBot 链接分享卡片独占单段，不支持引用 🚫' },
        { platform: 'onebot', type: 'onebot:cardimage', comment: '🖼️ OneBot 卡片式大图独立协议，不支持引用 🚫' },
        { platform: 'onebot', type: 'onebot:music', comment: '🎵 OneBot 音乐卡片不支持引用 ❌' },
        { platform: 'onebot', type: 'music', comment: '🎶 通用音乐卡片不支持引用 ❌' },
        { platform: 'onebot', type: 'onebot:json', comment: '📜 OneBot Ark JSON 卡片（如第三方音乐签名、特殊卡片等） 🚫' },
        { platform: 'onebot', type: 'onebot:xml', comment: '📑 OneBot XML 卡片 🚫' },
        { platform: 'qq', type: 'markdown', comment: '📝 QQ 官方平台 Markdown 消息不支持引用或混发会被拆包 ⚠️' },
        { platform: 'qq', type: 'qq:markdown', comment: '🎨 QQ 官方平台自定义模版 Markdown 卡片 ⚠️' },
        { platform: 'qq', type: 'qq:rawmarkdown', comment: '📋 QQ 官方平台原生 Markdown 卡片 ⚠️' },
        { platform: 'qq', type: 'audio', comment: '🎙️ QQ 官方平台语音消息不支持引用 ❌' },
        { platform: 'qq', type: 'video', comment: '🎬 QQ 官方平台视频富媒体消息不支持引用，混发会被拆包 ⚠️' },
        { platform: 'qq', type: 'file', comment: '📁 QQ 官方平台文件通道独立，不支持携带 message_reference 引用 🚫' },
        { platform: 'qq', type: 'ark', comment: '📜 QQ 官方平台 Ark 模板卡片不支持混发引用 🚫' },
        { platform: 'qq', type: 'qq:ark', comment: '📜 QQ 官方平台 Ark 模板卡片不支持混发引用 🚫' },
        { platform: 'qq', type: 'card', comment: '📑 QQ 官方平台图文卡片不支持混发引用 🚫' },
        { platform: 'qq', type: 'forward', comment: '📦 QQ 官方平台合并转发不支持引用 🚫' },
      ])
      .description('🚫 引用排除黑名单规则列表。当出站消息包含匹配的元素类型时，自动跳过为其添加引用。'),
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
