# 按模型设置上游协议与参数

同一网关中的模型可能使用不同 API，或同为 Chat 但使用不同思考参数。供应商级协议和参数无法同时描述这些模型。普通第三方 Claude Code、Codex 供应商现在可在“模型协议覆盖”中逐模型指定协议，并在行内“该模型的上游参数”中选择覆盖项。

Codex → 本地代理（Responses）→ 根据最终上游模型选协议与参数 → 供应商。
响应转换回 Codex 的 Responses；Claude Code 下游仍使用 Messages。这里选择的是供应商接受的上游接口，不是客户端接口。

## 配置与继承

供应商默认值保留。模型 ID 在模型映射、Stack 路由后精确匹配，忽略末尾 `[1M]` 标记。空白行不保存；重复模型、不完整行、非法输出上限不能保存。模型可以从已有目录选取，也可手动输入。

```json
{
  "apiFormat": "openai_chat",
  "modelApiFormats": {
    "claude-haiku-5-5": "anthropic",
    "deepseek-v4.1-flash": "openai_chat",
    "another-chat-model": "openai_chat"
  },
  "modelApiOptions": {
    "claude-haiku-5-5": {
      "apiKeyField": "ANTHROPIC_API_KEY",
      "maxOutputTokens": 4096
    },
    "deepseek-v4.1-flash": {
      "codexChatReasoning": {
        "supportsThinking": true,
        "supportsEffort": true,
        "thinkingParam": "none",
        "effortParam": "reasoning_effort",
        "effortValueMode": "passthrough"
      }
    },
    "another-chat-model": {
      "codexChatReasoning": {
        "supportsThinking": true,
        "supportsEffort": false,
        "thinkingParam": "enable_thinking"
      }
    }
  }
}
```

这是供应商 `meta` 的示例；所有模型共用 Base URL 与 API Key。示例第二个 Chat 模型是占位，不表示任何网关实际提供它。

- 没有模型协议条目：完整保留原行为，关联的孤立参数条目不生效。
- 有协议条目，但参数未设置：继承供应商默认设置和既有推断逻辑。
- Chat 参数按字段覆盖，`false` 表示明确不支持。已有“支持等级即支持思考”的规则继续适用；要禁用全部思考参数，请把模式和等级都设为不支持。
- 恢复“继承供应商默认值”可清除单项覆盖；删除整行恢复供应商默认协议与参数。切换协议会清除该行旧参数，防止残留。
- Messages 的认证方式选择 `x-api-key` 或 Bearer，不更换 Key。输出上限仅用于 Codex → Messages 转换，Claude Code 的原生 `max_tokens` 保留客户端语义。
- Chat thinking 参数支持 `none`、`thinking`、`enable_thinking`、`reasoning_split`；effort 参数支持 `none`、`reasoning_effort`、`reasoning.effort`，值映射复用既有模式。`zen` 模式继续按模型目录的 reasoningLevels 校准；没有声明的模型不发送 effort。

## 首版边界

需要开启本地路由；完整端点 URL 与模型覆盖互斥。普通第三方 Claude Code 支持逐模型 Messages 认证方式；Codex 另外支持 Messages 输出上限和 Chat 思考参数映射。Claude Code 的 Chat 转换不消费 Codex reasoning 参数。Responses 模型沿用原生处理规则，没有新增参数控制。

官方账号、托管 OAuth、Copilot、云供应商沿用原规则。无需数据库迁移，不自动探测模型协议、不添加新的转换器。不覆盖模型目录中的能力声明；Codex 目录仍按有效协议生成工具能力，发布 Messages 模型时禁用全局 hosted web search。

User-Agent、模拟 Claude Code、缓存路由、通用请求头/请求体覆盖继续作为供应商设置。通用覆盖最后应用于所有模型，不会自动变成逐模型设置；同时配置模型协议时，不允许通用请求体覆盖 `model`，避免转换完成后再换模型。

## 验证

模拟上游覆盖两个客户端 × 三种协议 × 流式/非流式的实际转发与响应转换，包含工具调用、认证头、模型映射、`[1M]`、重试、默认回退、目录能力。附加测试验证多个 Chat 模型的不同参数映射、显式关闭、默认/推断继承、Messages 认证与输出上限、故障转移重新解析和模型覆写冲突。

已有 OpenCode Go Key 的短编码请求曾验证 Haiku Messages、DS Chat 和 Codex reasoning 转换。该实测不代替完整 CLI 会话或真实网关工具执行；新参数覆盖的最新实测结果以 PR 说明为准。
