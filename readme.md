# koishi-plugin-let-me-quote-and-recall

[![npm](https://img.shields.io/npm/v/koishi-plugin-let-me-quote-and-recall?style=flat-square)](https://www.npmjs.com/package/koishi-plugin-let-me-quote-and-recall)

💬 智能为指令回复添加引用 ⚡ 并在指令被撤回时联动撤回 Bot 消息 🔄

## 📺 效果预览

![效果预览](./docs/preview/preview.gif)

## 🌟 功能特性

1. **指令自动引用 (Quote)**
   - 智能识别指令触发消息（普通聊天、定时广播等非指令出站消息不会受影响）。
   - 提供单选控制策略：
     - **完全不引用 (A)**：保持原样，不自动补充任何引用。
     - **缺省时引用 (B)**：如果插件或指令准备发出的消息未包含 `quote`，自动前置补充对指令消息的引用；若已有 `quote` 则不重复添加。
     - **强制引用 (C)**：无论原回复是否包含 `quote`，均强制前置引用触发指令的消息。

2. **指令撤回联动 (Recall)**
   - 当用户撤回了触发指令的原始消息时，Bot 会自动查找并撤回回复该指令的所有消息。
   - **双重缓存防护**：内置 FIFO/LRU 空间容量上限 + TTL 时间主动过期，杜绝刷屏导致的内存膨胀。
   - 支持设置撤回延迟，防止部分平台动画或网络竞态问题。

3. **场景细粒度控制 (Scenes)**
   - 支持多选框控制生效场景：**群聊 (`group`)** 与 **私聊 (`direct`)**。
   - 默认群聊与私聊全部开启。

## ⚙️ 配置项说明

| 配置项 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `quoteMode` | `'never' \| 'if-missing' \| 'always'` | `'if-missing'` | 指令回复引用策略 (A/B/C 三档单选) |
| `autoRecall` | `boolean` | `true` | 是否在指令被撤回时联动撤回回复 |
| `recallDelay` | `number` | `0` | 联动撤回延迟时间（毫秒，0 为即时） |
| `maxEntries` | `number` | `1000` | 内存中最多保留的指令映射数量（条，防刷屏熔断保护） |
| `expireTime` | `number` | `180` | 指令映射最长保留时长（秒，默认 3 分钟，对齐平台撤回窗口） |
| `enabledScenes` | `('group' \| 'direct')[]` | `['group', 'direct']` | 插件生效场景多选 (群聊 / 私聊，默认全开) |
| `debug` | `boolean` | `false` | 是否开启详细控制台调试日志 |

## 📄 授权许可

[MIT License](LICENSE)
