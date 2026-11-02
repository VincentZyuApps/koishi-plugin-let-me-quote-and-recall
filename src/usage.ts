const pkg = require('../package.json')

const detailsStyle = 'margin:10px 0;border:1px solid var(--k-color-border, #909399);border-radius:8px;background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit);overflow:hidden;box-shadow:var(--k-card-shadow, 0 1px 3px rgb(0 0 0 / 12%));transition:var(--color-transition, border-color .2s ease, background-color .2s ease)'
const summaryStyle = 'padding:9px 12px;background:var(--k-hover-bg, rgba(127, 127, 127, .12));color:var(--k-text-dark, inherit);cursor:pointer;user-select:none'
const detailsBodyStyle = 'padding:2px 14px 8px;border-top:1px solid var(--k-color-divider, rgba(127, 127, 127, .28));background:var(--k-card-bg, transparent);color:var(--k-text-dark, inherit)'

export const usage = `
<h1>Koishi 插件：指令自动引用与联动撤回 let-me-quote-and-recall</h1>
<h2>🎯 插件版本：v${pkg.version}</h2>

<p>
  <a href="https://www.npmjs.com/package/koishi-plugin-let-me-quote-and-recall" target="_blank">
    <img src="https://img.shields.io/npm/v/koishi-plugin-let-me-quote-and-recall?style=flat-square&logo=npm" alt="npm version">
  </a>
  <a href="https://npm-stat.com/charts.html?package=koishi-plugin-let-me-quote-and-recall" target="_blank">
    <img src="https://img.shields.io/npm/dm/koishi-plugin-let-me-quote-and-recall?style=flat-square&logo=npm" alt="npm downloads">
  </a>
  <br>
  <a href="https://github.com/VincentZyuApps/koishi-plugin-let-me-quote-and-recall" target="_blank">
    <img src="https://img.shields.io/badge/GitHub-181717?style=for-the-badge&logo=github&logoColor=white" alt="GitHub">
  </a>
  <a href="https://gitee.com/vincent-zyu/koishi-plugin-let-me-quote-and-recall" target="_blank">
    <img src="https://img.shields.io/badge/Gitee-C71D23?style=for-the-badge&logo=gitee&logoColor=white" alt="Gitee">
  </a>
  <br>
  <a href="https://qm.qq.com/q/ZHj33L5cuC" target="_blank">
    <img src="https://img.shields.io/badge/awa群_zyu建的qq群-1085190201-12B7F5?style=flat-square&logo=qq&logoColor=white" alt="awa群-zyu建的qq群">
  </a>
</p>

<h2>💬 交流反馈</h2>
<p>🐛 Bug 反馈 / 💡 建议 / 👨‍💻 插件开发交流，欢迎加群：</p>
<p>💬 插件使用问题 / 🐛 Bug反馈 / 👨‍💻 插件开发交流，欢迎加入 awa群-zyu建的qq群：<b style="color: #12B7F5;">1085190201</b> 🎉</p>
<p>💡 在群里直接艾特我，回复得更快哦~ ✨</p>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #ff8a00;">🧩 工作原理与触发判定机制</b></summary>
<div style="${detailsBodyStyle}">
<p><b>🎯 仅针对指令生效：</b>很多群聊希望只有执行指令时才带有引用，而普通对话、定时推送、欢迎加群等不要带引用。本插件精准监听 <code>command/before-execute</code> 生命周期，在底层会话上注入指令溯源签名。</p>
<p><b>🛡️ 出站精准拦截：</b>在出站事件 <code>before-send</code> 中，通过检查发起发送的原始会话标记，精准判定该条消息是否源于某条指令触发。非指令出站消息（如定时任务广播、普通中间件触发）完全不会被干扰。</p>
<p><b>⚡ 零性能损耗：</b>判定逻辑基于纯内存引用匹配与属性标记，单次判定开销在纳秒级，几乎零 CPU 与内存开销。</p>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #2f855a;">💬 三档引用模式详细说明 (A / B / C)</b></summary>
<div style="${detailsBodyStyle}">
<p><b>🔘 A 档 - 完全不引用 (<code>never</code>)：</b>完全禁用自动补充引用功能，即使是指令触发的消息也保持插件原本的输出形态。</p>
<p><b>🔘 B 档 - 缺省时引用 (<code>if-missing</code>，默认推荐)：</b>智能自适应。如果其他插件或指令返回的消息本身已经带了 <code>&lt;quote&gt;</code> 元素，则保持原有引用不变；仅当消息不带任何引用时，自动在消息最前方补充对指令消息的前置引用。</p>
<p><b>🔘 C 档 - 强制引用 (<code>always</code>)：</b>强行置顶。无论该插件原本是否生成了引用，均自动清洗掉旧引用，并将触发指令的原始消息作为唯一的置顶引用。</p>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #0ea5e9;">🔄 联动撤回机制与延迟说明</b></summary>
<div style="${detailsBodyStyle}">
<p><b>⛓️ 消息级溯源绑定：</b>通过对底层 <code>bot.sendMessage</code> 进行非侵入式包装，安全收集 Bot 对某条指令作出的所有回复消息 ID（支持捕获同一指令执行中分批发送的多条消息）。</p>
<p><b>🗑️ 联动自动销毁：</b>监听平台 <code>message-deleted</code> 撤回事件。一旦用户撤回了打错或不再需要的指令，Bot 会秒级自动撤回对应的回复消息，彻底避免群聊被废弃指令和过时回复刷屏。</p>
<p><b>⏱️ 撤回延迟 <code>recallDelay</code>：</b>部分聊天平台在客户端消息撤回时可能存在动画播放延迟或服务端消息未落库竞态，如遇平台报错可适当调整为 <code>500 ~ 1000</code> 毫秒缓冲。</p>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #7c3aed;">🛡️ 双重内存安全策略 (LRU 熔断 + TTL 过期)</b></summary>
<div style="${detailsBodyStyle}">
<p><b>💾 纯内存存储优势：</b>撤回与引用属于时效性极强的瞬态交互，纯内存（<code>Map</code>）存储避免了每次发消息都写入磁盘数据库的 I/O 开销，零依赖开箱即用。</p>
<p><b>⏰ 时间上限 <code>expireTime</code>（默认 180 秒）：</b>各大平台（如 QQ、企业微信）普通撤回窗口一般为 2 分钟（120 秒）。本插件默认保留 3 分钟，超时后自动注销映射并释放定时器。</p>
<p><b>🚪 空间容量熔断 <code>maxEntries</code>（默认 1000 条）：</b>如果遇到恶意刷屏或超高并发，当内存条数达到上限时，将自动淘汰最旧的一条记录（FIFO / LRU 策略），彻底消除内存泄漏隐患。</p>
</div>
</details>

<details style="${detailsStyle}">
<summary style="${summaryStyle}"><b style="color: #b45309;">⚠️ 平台特性与注意事项</b></summary>
<div style="${detailsBodyStyle}">
<p><b>🤖 权限考量：</b>Bot 撤回自己发送的回复消息通常只需要平台基础权限；但请注意平台允许撤回的时效（QQ 官方 Bot 仅允许撤回 2 分钟内的消息）。超时的撤回请求即使收到事件也会被平台服务端拒绝。</p>
<p><b>🎯 场景支持 <code>enabledScenes</code>：</b>支持群聊（<code>group</code>）与私聊（<code>direct</code>）多选配置，默认全部开启。如果不需要在私聊或群聊中生效，可以在控制台取消对应勾选。</p>
<p><b>🛠️ 异常静默保护：</b>撤回操作均内置全局错误捕获，若因网络抖动、平台鉴权或时效超期导致撤回失败，仅会在开启 <code>debug</code> 时输出调试日志，绝不抛出未捕获异常阻塞系统运行。</p>
</div>
</details>
`
