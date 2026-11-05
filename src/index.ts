import { Context, h, Bot } from 'koishi'
import { Config, QUOTE_MODE, SCENE_MODE, type QuoteModeType, type SceneModeType, type QuoteExcludeRule } from './config'
import { usage } from './usage'

export const name = 'let-me-quote-and-recall'

export { Config, usage, QUOTE_MODE, SCENE_MODE }
export type { QuoteModeType, SceneModeType, QuoteExcludeRule }

interface CommandRecord {
  channelId: string
  isDirect?: boolean
  botMsgIds: string[]
  timer: NodeJS.Timeout
}

const kCommandTrigger = Symbol('let-me-quote-and-recall.commandTrigger')

declare module 'koishi' {
  interface Session {
    [kCommandTrigger]?: string
  }
}

export function apply(ctx: Context, config: Config) {
  const logger = ctx.logger(name)
  const commandMap = new Map<string, CommandRecord>()
  const unhooks: (() => void)[] = []

  function logDebug(...args: any[]) {
    if (config.debug) {
      logger.info(args[0], ...args.slice(1))
    }
  }

  function isSceneEnabled(isDirect: boolean): boolean {
    const scene = isDirect ? SCENE_MODE.DIRECT : SCENE_MODE.GROUP
    return Array.isArray(config.enabledScenes) && config.enabledScenes.includes(scene)
  }

  function matchElementType(element: h, targetType: string): boolean {
    const lowerTarget = targetType.trim().toLowerCase()
    const lowerType = String(element.type || '').trim().toLowerCase()

    if (lowerType === lowerTarget) return true

    // 特殊类型语义兼容与语法糖
    if (lowerTarget === 'audio') {
      if (lowerType === 'audio' || lowerType === 'record' || lowerType.endsWith(':audio') || lowerType.endsWith(':record') || lowerType.endsWith(':tts')) return true
    }

    if (lowerTarget === 'video') {
      if (lowerType === 'video' || lowerType.endsWith(':video')) return true
    }

    if (lowerTarget === 'file') {
      if (lowerType === 'file' || lowerType.endsWith(':file')) return true
    }

    if (lowerTarget === 'ark') {
      if (lowerType === 'ark' || lowerType.endsWith(':ark') || lowerType.endsWith(':json')) return true
    }

    if (lowerTarget === 'card') {
      if (lowerType === 'card' || lowerType.endsWith(':card') || lowerType.endsWith(':cardimage')) return true
    }

    if (lowerTarget === 'forward') {
      if (lowerType === 'figure') return true
      if (lowerType === 'message' && ('forward' in element.attrs || element.attrs.forward !== undefined)) return true
      if (lowerType.endsWith(':forward')) return true
    }

    if (lowerTarget === 'markdown') {
      if (lowerType === 'markdown' || lowerType.includes('markdown')) return true
    }

    return false
  }

  function hasMatchingElement(elements: h[], targetType: string): boolean {
    if (!Array.isArray(elements)) return false
    for (const el of elements) {
      if (matchElementType(el, targetType)) return true
      if (Array.isArray(el.children) && el.children.length > 0) {
        if (hasMatchingElement(el.children, targetType)) return true
      }
    }
    return false
  }

  function findMatchingExcludeRule(session: { platform?: string, elements?: h[] }, rules?: QuoteExcludeRule[]): QuoteExcludeRule | undefined {
    if (!Array.isArray(rules) || !rules.length || !Array.isArray(session.elements)) return undefined
    const currentPlatform = String(session.platform || '').trim().toLowerCase()

    for (const rule of rules) {
      if (!rule?.type) continue
      const rulePlatform = String(rule.platform || '').trim().toLowerCase()
      if (rulePlatform !== '*' && rulePlatform !== currentPlatform) continue

      if (hasMatchingElement(session.elements, rule.type)) {
        return rule
      }
    }
    return undefined
  }

  // 1. 监听指令执行前生命周期
  ctx.on('command/before-execute', ({ session }) => {
    if (!session?.messageId) return
    if (!isSceneEnabled(session.isDirect)) return

    const userMsgId = session.messageId
    // 在 session 实例上打上标记，使得后续由该 session 触发的 session.send 能够准确溯源
    session[kCommandTrigger] = userMsgId

    if (!commandMap.has(userMsgId)) {
      // 空间维度保障：若超出容量上限，淘汰最旧的条目 (FIFO / LRU)
      if (commandMap.size >= config.maxEntries) {
        const oldestKey = commandMap.keys().next().value
        if (oldestKey) {
          const oldRecord = commandMap.get(oldestKey)
          clearTimeout(oldRecord?.timer)
          commandMap.delete(oldestKey)
          logDebug(`📦 [Cache] 达到最大缓存条目容量 (${config.maxEntries})，淘汰最旧记录 🚪: ${oldestKey}`)
        }
      }

      // 时间维度保障：到期自动清理
      const timer = setTimeout(() => {
        commandMap.delete(userMsgId)
        logDebug(`⏰ [Cache] 指令记录超时过期已自动清理 🧹: ${userMsgId}`)
      }, config.expireTime * 1000)

      commandMap.set(userMsgId, {
        channelId: session.channelId,
        isDirect: session.isDirect,
        botMsgIds: [],
        timer,
      })
      logDebug(`🎯 [Track] 记录指令触发消息 ID 📌: ${userMsgId} (频道: ${session.channelId}, 当前缓存: ${commandMap.size}/${config.maxEntries} 📊)`)
    }
  })

  // 2. 出站消息拦截处理 (before-send)
  ctx.on('before-send', (session, options) => {
    const triggerMsgId = options?.session?.[kCommandTrigger] || (options?.session?.messageId && commandMap.has(options.session.messageId) ? options.session.messageId : undefined)
    if (!triggerMsgId || !commandMap.has(triggerMsgId)) {
      return
    }

    if (config.quoteMode === 'never') {
      return
    }

    // 检查是否命中出站引用排除黑名单规则（如 OneBot 语音/转发/音乐卡片、QQ Markdown 卡片等）
    const matchedRule = findMatchingExcludeRule(session, config.quoteExcludeRules)
    if (matchedRule) {
      logDebug(`🚫 [before-send] 出站消息命中 quote 排除黑名单规则 [${matchedRule.platform}:${matchedRule.type}${matchedRule.comment ? ` - ${matchedRule.comment}` : ''}] 🛡️，跳过添加引用 (元素: [${session.elements.map(e => e.type).join(', ')}])`)
      return
    }

    const hasQuote = session.elements.some(el => el.type === 'quote')
    logDebug(`💬 [before-send] 触发消息 📌: ${triggerMsgId}, 当前已有 quote: ${hasQuote ? '🟢 是' : '🔴 否'}, 模式: ${config.quoteMode} ⚙️`)

    if (config.quoteMode === 'if-missing') {
      if (!hasQuote) {
        session.elements.unshift(h('quote', { id: triggerMsgId }))
        logDebug(`✨ [before-send] 已前置补充 quote 元素 (id: ${triggerMsgId}) 🔗`)
      }
    } else if (config.quoteMode === 'always') {
      // 过滤旧 quote 并将触发指令的 quote 强制置顶
      const nonQuotes = session.elements.filter(el => el.type !== 'quote')
      session.elements = [h('quote', { id: triggerMsgId }), ...nonQuotes]
      logDebug(`📌 [before-send] 已强制设置唯一 quote 元素 (id: ${triggerMsgId}) 🔝`)
    }
  })

  // 3. 拦截 bot.sendMessage 收集发送成功的消息 ID
  function hookBot(bot: Bot) {
    const originalSendMessage = bot.sendMessage
    bot.sendMessage = async function (channelId, content, referrer, options) {
      const triggerMsgId = options?.session?.[kCommandTrigger] || options?.session?.messageId
      const sentIds = await originalSendMessage.call(this, channelId, content, referrer, options)

      if (triggerMsgId && commandMap.has(triggerMsgId) && Array.isArray(sentIds) && sentIds.length) {
        const record = commandMap.get(triggerMsgId)!
        record.botMsgIds.push(...sentIds)
        logDebug(`🔗 [Track] 关联 Bot 回复消息 ID 📤: [${sentIds.join(', ')}] -> 指令消息 📥: ${triggerMsgId}`)
      }

      return sentIds
    }

    unhooks.push(() => {
      bot.sendMessage = originalSendMessage
    })
  }

  // 为已有 bot 以及新接入的 bot 安装 hook
  ctx.bots.forEach(hookBot)
  ctx.on('bot-added', hookBot)

  // 4. 监听消息撤回事件 (message-deleted)
  if (config.autoRecall) {
    async function handleRecall(bot: Bot, deletedMsgId: string, channelId?: string, isDirect?: boolean) {
      if (!deletedMsgId || !commandMap.has(deletedMsgId)) return

      const record = commandMap.get(deletedMsgId)!
      const resolvedDirect = isDirect ?? record.isDirect ?? false
      if (!isSceneEnabled(resolvedDirect)) return

      clearTimeout(record.timer)
      commandMap.delete(deletedMsgId)

      logDebug(`🗑️ [Recall] 收到指令撤回事件 ⚡: ${deletedMsgId}, 准备联动撤回 Bot 回复消息 🔄: [${record.botMsgIds.join(', ')}]`)

      if (config.recallDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, config.recallDelay))
      }

      const targetChannelId = record.channelId || channelId
      for (const botMsgId of record.botMsgIds) {
        await bot.deleteMessage(targetChannelId, botMsgId).catch((err) => {
          logDebug(`⚠️ [Recall] 撤回 Bot 消息 ${botMsgId} 失败 ❌:`, err?.message || err)
        })
      }
    }

    // 标准 Satori message-deleted 事件监听
    ctx.on('message-deleted', async (session) => {
      // 兼容各平台撤回消息 ID 提取：
      // @satorijs/adapter-kook 在 deleted_message 事件中存在 Bug：
      // 将系统通知外层的 data.msg_id 赋值给了 session.messageId，而真实被删除的消息 ID 存放在 internal.extra.body.msg_id 中。
      const anySession = session as any
      const kookTargetId = session.platform === 'kook'
        ? (anySession.internal?.extra?.body?.msg_id || anySession.kook?.extra?.body?.msg_id)
        : undefined

      const deletedMsgId = kookTargetId || session.messageId

      logDebug(`📨 [message-deleted] 捕获撤回事件 ⚡: platform=${session.platform}, rawId=${session.messageId}, resolvedId=${deletedMsgId} 🎯`)

      await handleRecall(session.bot, deletedMsgId, session.channelId, session.isDirect)
    })

    // Lark (飞书) 官方适配器向下兼容：
    // 在旧版或未修复的 @satorijs/adapter-lark 中，im.message.recalled_v1 事件未被转换为 message-deleted，
    // 但 Satori 核心 dispatch 时会派发 internal/session 并携带包含原始 payload 的 session。
    ctx.on('internal/session', async (session) => {
      if (session.platform !== 'lark') return

      const anySession = session as any
      const raw = anySession.event?._data || anySession.lark || anySession.internal
      const eventType = raw?.header?.event_type || raw?.type || session.event?.referrer?.type

      if (eventType === 'im.message.recalled_v1') {
        const recalledMsgId = raw?.event?.message_id
        const chatId = raw?.event?.chat_id
        const chatType = raw?.event?.chat_type
        const isDirect = chatType ? chatType === 'p2p' : undefined

        logDebug(`🐦 [Lark-Compat] 捕获飞书原生撤回事件 ⚡: msgId=${recalledMsgId}, chatId=${chatId}, chatType=${chatType} 🔍`)
        if (recalledMsgId) {
          await handleRecall(session.bot, recalledMsgId, chatId, isDirect)
        }
      }
    })
  }

  // 5. 插件销毁时清理状态与还原原型
  ctx.on('dispose', () => {
    for (const record of commandMap.values()) {
      clearTimeout(record.timer)
    }
    commandMap.clear()
    unhooks.forEach(unhook => unhook())
    unhooks.length = 0
  })
}
