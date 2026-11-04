# 更新日志

## 0.1.1-beta.1+20261104

### 🚀 平台支持与兼容增强 (KOOK)
- 🎮 **KOOK 平台指令撤回兼容适配**：
  - 针对 `@satorijs/adapter-kook` 将 `deleted_message` 事件外层系统通知 UUID 赋值给 `session.messageId` 导致真实被删消息 ID 丢失的 upstream 缺陷，插件侧内置向下兼容层，优先从 `session.internal.extra.body.msg_id` 提取目标消息 ID。
  - 实测 KOOK 客户端删除指令后，Bot 能够秒级精准联动撤回回复。
- 📚 **文档与兼容性证据**：
  - README 平台兼容矩阵更新加入 KOOK 平台支持状态。
  - 新增实测截图证据资源 `docs/compatibility/kook-deleted-message-issue.png`。
  - 新增 1:1 正方形高清效果演示动图 `docs/preview/preview.kook.gif`。

---

## 0.1.0+20261103

### 🎉 正式版发布 (v0.1.0)
- 🚀 **全平台功能实测落地**：
  - **指令自动引用 (Quote)**：经作者实机测试，在 OneBot、QQ 官方 Bot、Discord、Telegram 所有测试平台**均已 100% 完美支持**。
  - **指令联动撤回 (Recall)**：在 OneBot (NapCat / LLOneBot) 与 Discord 下完美联动撤回；QQ 官方 Bot 与 Telegram 官方 Bot API 受限于上游平台不广播消息删除事件，在文档中进行了明确标注与技术原理说明。
- 🎬 **文档与媒体资源完善**：
  - 提供了 OneBot 与 Discord 的高清正方形操作演示动图。
  - 提供了各平台兼容性实测截图与 [Issue #1 协议深度排查追踪](https://github.com/VincentZyuApps/koishi-plugin-let-me-quote-and-recall/issues/1)。
- 🛡️ **生产级稳定性与缓存防护**：
  - 支持单选控制策略（`never` / `if-missing` / `always`）。
  - 双重缓存防护（FIFO/LRU 空间容量上限 + TTL 主动过期清理），杜绝内存泄露。
  - 支持群聊 (`group`) 与私聊 (`direct`) 场景细粒度控制及可调节撤回延迟。

---

## 0.1.0-rc.3+20261102

### 📚 文档与兼容性说明
- ⚠️ **平台兼容性矩阵**：在 README 增设全平台支持矩阵，明确指出所有平台均完美支持自动引用（Quote），而 QQ 官方 Bot 与 Telegram 官方 Bot API 因上游网关不广播删除事件无法支持联动撤回，并附带针对开放平台协议与源码证据的 [Issue #1 详细分析](https://github.com/VincentZyuApps/koishi-plugin-let-me-quote-and-recall/issues/1)。
- 🎬 **效果动图更新**：新增 Discord 平台实装效果演示动图，统一动图资源扩展名为标准 `.gif` 格式。

---

## 0.1.0-rc.2+20261102

### 📚 文档与界面优化
- 🖼️ README 接入 Circuit Board 电路板背景的 Socialify 项目横幅。
- 🏷️ 补充全套徽标与直链（NPM、下载量、GitHub、Gitee、Koishi 论坛 13788、QQ 交流群）。
- 💬 顶部规范增加交流反馈与加群社区指引。
- 📖 新增并发布规范的更新日志（`CHANGELOG.md`）。

---

## 0.1.0-rc.1+20261102

### 📺 效果预览与文档
- 🎬 新增正方形（720×720）高清效果预览 GIF 动图，精准居中展示指令交互全流程。
- 💡 README 补充两大功能（智能引用与撤回联动）的 TS 伪代码原理解析。
- 🔗 附带官方 Satori 源码仓库精确 Commit Hash 与行号引用跳转。
- 🏷️ 补充全套徽标（NPM、下载量、GitHub、Gitee、Koishi 论坛 13788、QQ 交流群）。

---

## 0.1.0-beta.2+20261102

### 🔧 改进与重构
- 🎛️ 将生效场景由单 boolean 配置（`enableDirect`）重构为多选框（`enabledScenes: ('group' | 'direct')[]`），支持更细粒度控制。
- 📑 控制台配置界面全面采用圆角渐变卡片组件美化，提供清晰的模式说明。

---

## 0.1.0-beta.1+20261102

### ✨ 初始功能发布
- 💬 **指令自动引用 (Quote)**：实现 `never`、`if-missing`、`always` 三档自适应引用策略。
- 🔄 **指令撤回联动 (Recall)**：监听平台 `message-deleted` 事件，支持设置延迟并联动撤回 Bot 消息。
- 🛡️ **双重缓存防护**：内置 FIFO/LRU 空间容量上限 + TTL 时间主动过期，杜绝刷屏导致的内存膨胀。
