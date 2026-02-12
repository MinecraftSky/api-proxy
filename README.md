# API 代理服务器

这是一个使用 [Deno](https://console.deno.com/) 构建的 API 代理服务器，支持代理以下 AI API：

- **ChatGPT** (OpenAI)
- **Claude** (Anthropic)
- **Gemini** (Google)
- **Groq**
- **Grok** (X.AI)

## 📖 使用方法

### API 路径映射

| 原始 API | 代理路径 | 示例 |
|---------|---------|------|
| `https://api.openai.com/v1/...` | `/chatgpt/v1/...` | `/chatgpt/v1/chat/completions` |
| `https://api.anthropic.com/v1/...` | `/claude/v1/...` | `/claude/v1/messages` |
| `https://generativelanguage.googleapis.com/v1/...` | `/gemini/v1/...` | `/gemini/v1beta/models` |
| `https://api.groq.com/openai/v1/...` | `/groq/v1/...` | `/groq/v1/chat/completions` |
| `https://api.x.ai/v1/...` | `/grok/v1/...` | `/grok/v1/chat/completions` |

## ⚙️ 功能特性

- ✅ 支持所有 HTTP 方法（GET, POST, PUT, DELETE 等）
- ✅ 自动转发请求头和请求体
- ✅ CORS 支持
- ✅ 完整的错误处理
- ✅ 请求日志记录
- ✅ 美观的首页界面

## 📝 许可证

MIT License

## ⚒️ 構造

本項目完全使用 Claude Sonnet 4.5 編寫

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！
