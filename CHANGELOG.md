# 更新日志

## 0.1.0-rc.3+20261102

### 📚 文档与兼容性说明
- ⚠️ **平台兼容性提示**：在 README 醒目位置增设警示说明，明确暂不支持 QQ 官方 Bot 的群聊与私聊环境，并附带针对腾讯开放平台协议与网关事件排查的 [Issue #1 详细分析](https://github.com/VincentZyuApps/koishi-plugin-let-me-quote-and-recall/issues/1#issuecomment-6577660989)。
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
