> [!CAUTION]
> BOT IS CURRENTLY NOT WORKING!

# 🤖 Forty-Six - Configurable WhatsApp AI Bot

A clean, configurable WhatsApp AI chatbot built with Baileys and Groq AI. Simple setup, powerful features.

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node Version](https://img.shields.io/badge/node-%3E%3D16.0-green)

---

## ✨ Features

- 🎛️ **Fully Configurable** - Control everything via `.env` file
- 🤖 **Multiple AI Models** - Choose from 7+ Groq AI models
- 💬 **Smart Messaging** - Separate prefixes for commands and AI queries
- 👥 **Group Control** - Enable/disable AI in groups and DMs separately
- 🔒 **Self-Only Mode** - Restrict bot usage to owner only
- 📝 **Conversation Memory** - Maintains context across messages
- 🚀 **Easy Pairing** - QR code or pairing code support

---

## 📦 Quick Start

### 1. Clone & Install

```bash
git clone https://github.com/amanmohdtp/Forty-Six.git
cd Forty-Six
npm install
```

### 2. Configure

Edit `.env` file:

```env
# Required
GROQ_API_KEY=your_groq_api_key_here
PHONE_NUMBER=1234567890

# Command Prefix (default: !)
PREFIX_COMMANDS=!

# Query Prefix
PREFIX_QUERIES_ENABLED=false
PREFIX_QUERIES=?

# AI Model (see available models below)
AI_MODEL=llama-3.3-70b-versatile

# AI Behavior
AI_IN_GROUPS=true
AI_IN_DM=true
AI_SELF_ONLY=false
```

### 3. Get Groq API Key

1. Visit [console.groq.com](https://console.groq.com)
2. Sign up (free tier available)
3. Create an API key
4. Add to `.env` file

### 4. Run

```bash
npm start
```

---

## ⚙️ Configuration Guide

### Environment Variables

| Variable | Description | Default | Options |
|----------|-------------|---------|---------|
| `GROQ_API_KEY` | Your Groq API key (required) | - | - |
| `PHONE_NUMBER` | Your phone number for pairing | - | - |
| `PREFIX_COMMANDS` | Prefix for bot commands | `!` | Any character(s) |
| `PREFIX_QUERIES_ENABLED` | Require prefix for AI queries | `false` | `true`/`false` |
| `PREFIX_QUERIES` | Prefix for AI queries | `?` | Any character(s) |
| `AI_MODEL` | Groq AI model to use | `llama-3.3-70b-versatile` | See models below |
| `AI_IN_GROUPS` | Enable AI in group chats | `true` | `true`/`false` |
| `AI_IN_DM` | Enable AI in direct messages | `true` | `true`/`false` |
| `AI_SELF_ONLY` | Only bot owner can use in DM | `false` | `true`/`false` |

### Available AI Models

- `llama-3.3-70b-versatile` (Default - Best performance)
- `llama-3.1-70b-versatile`
- `llama-3.1-8b-instant` (Fastest)
- `mixtral-8x7b-32768`
- `gemma2-9b-it`
- `llama3-70b-8192`
- `llama3-8b-8192`

---

## 🎮 Usage

### Commands

All commands use the configured prefix (default: `!`):

| Command | Description |
|---------|-------------|
| `!help` | Show help message |
| `!ping` | Check if bot is alive |
| `!models` | List available AI models |
| `!config` | Show current configuration |
| `!clear` | Clear conversation history |

### AI Queries

**Without prefix requirement** (default):
```
Just send any message and get AI response
```

**With prefix requirement** (`PREFIX_QUERIES_ENABLED=true`):
```
?What's the weather like?
?Tell me a joke
```

---

## 📋 Configuration Examples

### Example 1: Public Group Bot
```env
PREFIX_COMMANDS=!
PREFIX_QUERIES_ENABLED=true
PREFIX_QUERIES=?
AI_IN_GROUPS=true
AI_IN_DM=false
AI_SELF_ONLY=false
```
- Users must use `?` prefix in groups
- AI disabled in DMs

### Example 2: Personal Assistant
```env
PREFIX_COMMANDS=/
PREFIX_QUERIES_ENABLED=false
AI_IN_GROUPS=false
AI_IN_DM=true
AI_SELF_ONLY=true
```
- Only works in DM with owner
- No prefix needed for queries

### Example 3: Hybrid Mode
```env
PREFIX_COMMANDS=!
PREFIX_QUERIES_ENABLED=false
AI_IN_GROUPS=true
AI_IN_DM=true
AI_SELF_ONLY=false
```
- Works everywhere
- No prefix needed

---

## 🔧 Advanced

### Customize AI Personality

Edit `prompt.txt`:

```txt
You are a professional business assistant.
- Always be formal and professional
- Provide detailed, well-structured responses
- Use business terminology when appropriate
```

### Session Management

- Session stored in `./session` folder
- To logout: Delete `./session` folder and restart
- To change number: Delete session and update `PHONE_NUMBER`

### Logging

Enable detailed logs in `index.js`:
```javascript
const logger = pino({
  level: 'info', // Changed from 'silent'
  // ...
});
```

---

## 📁 Project Structure

```
forty-six/
├── index.js              # Main bot file
├── lib/
│   ├── groq-ai.js        # AI handler
│   └── message-handler.js # Message processing
├── logs/                 # Log files
├── session/              # WhatsApp session (auto-generated)
├── .env                  # Configuration
├── prompt.txt            # AI personality
├── package.json
└── README.md
```

---

## 🐛 Troubleshooting

### Bot not responding
- Check `AI_IN_GROUPS` and `AI_IN_DM` settings
- Verify prefix configuration
- Check Groq API key is valid

### "Connection closed" error
- Delete `session` folder
- Restart bot
- Scan QR/enter pairing code again

### AI errors
- Check internet connection
- Verify Groq API key
- Check API quota at console.groq.com

---

## 🔒 Privacy & Security

- ✅ All data stored locally
- ✅ No telemetry or tracking
- ✅ Open source code
- ⚠️ Keep `.env` file private
- ⚠️ Never share session files
- ⚠️ Use responsibly per WhatsApp ToS

---

## 🤝 Contributing

Contributions welcome! Please:

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file

---

## 🙏 Acknowledgments

- [Baileys](https://github.com/WhiskeySockets/Baileys) - WhatsApp Web API
- [Groq](https://groq.com) - Fast AI inference
- Community contributors

---

## 💬 Support

- **Issues**: [GitHub Issues](https://github.com/amanmohdtp/forty-six/issues)
- **Discussions**: [GitHub Discussions](https://github.com/amanmohdtp/forty-six/discussions)

---

**Made with ❤️ for the WhatsApp bot community**

⭐ **Star this repo if you find it useful!** ⭐
