import { Context, h, Bot } from 'koishi'
import { Config, QUOTE_MODE, SCENE_MODE, type QuoteModeType, type SceneModeType } from './config'
import { usage } from './usage'

export const name = 'let-me-quote-and-recall'

export { Config, usage, QUOTE_MODE, SCENE_MODE }
export type { QuoteModeType, SceneModeType }

interface CommandRecord {
  channelId: string
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
          logDebug(`[Cache] 达到最大缓存条目 (${config.maxEntries})，淘汰最旧记录: ${oldestKey}`)
        }
      }

      // 时间维度保障：到期自动清理
      const timer = setTimeout(() => {
        commandMap.delete(userMsgId)
        logDebug(`[Cache] 指令记录超时过期已清理: ${userMsgId}`)
      }, config.expireTime * 1000)

      commandMap.set(userMsgId, {
        channelId: session.channelId,
        botMsgIds: [],
        timer,
      })
      logDebug(`[Track] 记录指令触发消息 ID: ${userMsgId} (频道: ${session.channelId}, 当前缓存: ${commandMap.size}/${config.maxEntries})`)
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

    const hasQuote = session.elements.some(el => el.type === 'quote')
    logDebug(`[before-send] 触发消息: ${triggerMsgId}, 当前已有 quote: ${hasQuote}, 模式: ${config.quoteMode}`)

    if (config.quoteMode === 'if-missing') {
      if (!hasQuote) {
        session.elements.unshift(h('quote', { id: triggerMsgId }))
        logDebug(`[before-send] 已前置补充 quote 元素 (id: ${triggerMsgId})`)
      }
    } else if (config.quoteMode === 'always') {
      // 过滤旧 quote 并将触发指令的 quote 强制置顶
      const nonQuotes = session.elements.filter(el => el.type !== 'quote')
      session.elements = [h('quote', { id: triggerMsgId }), ...nonQuotes]
      logDebug(`[before-send] 已强制设置唯一 quote 元素 (id: ${triggerMsgId})`)
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
        logDebug(`[Track] 关联 Bot 回复消息 ID: [${sentIds.join(', ')}] -> 指令消息: ${triggerMsgId}`)
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
    ctx.on('message-deleted', async (session) => {
      // 兼容各平台撤回消息 ID 提取：
      // @satorijs/adapter-kook 在 deleted_message 事件中存在 Bug：
      // 将系统通知外层的 data.msg_id 赋值给了 session.messageId，而真实被删除的消息 ID 存放在 internal.extra.body.msg_id 中。
      const anySession = session as any
      const kookTargetId = session.platform === 'kook'
        ? (anySession.internal?.extra?.body?.msg_id || anySession.kook?.extra?.body?.msg_id)
        : undefined

      const deletedMsgId = kookTargetId || session.messageId

      logDebug(`[message-deleted] 捕获撤回事件: platform=${session.platform}, rawId=${session.messageId}, resolvedId=${deletedMsgId}`)

      if (!deletedMsgId || !commandMap.has(deletedMsgId)) return
      if (!isSceneEnabled(session.isDirect)) return

      const record = commandMap.get(deletedMsgId)!
      clearTimeout(record.timer)
      commandMap.delete(deletedMsgId)

      logDebug(`[Recall] 收到指令撤回事件: ${deletedMsgId}, 准备联动撤回 Bot 消息: [${record.botMsgIds.join(', ')}]`)

      if (config.recallDelay > 0) {
        await new Promise(resolve => setTimeout(resolve, config.recallDelay))
      }

      for (const botMsgId of record.botMsgIds) {
        await session.bot.deleteMessage(record.channelId || session.channelId, botMsgId).catch((err) => {
          logDebug(`[Recall] 撤回 Bot 消息 ${botMsgId} 失败:`, err?.message || err)
        })
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
