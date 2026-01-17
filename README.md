<p align="center">
  <img src="https://github.com/amanmohdtp/Forty-Six/blob/2162f82470b10c2e954d3ca107d3e936369484b7/logo.png" width="500" alt="Forty Six Logo">
</p>

<h1 align="center">Forty Six</h1>

<p align="center">
  A simple, minimal Node.js library for building WhatsApp chatbots on top of Baileys.
</p>

<p align="center">
  <img src="https://img.shields.io/npm/v/forty-six">
  <img src="https://img.shields.io/npm/dm/forty-six">
  <img src="https://img.shields.io/github/license/amanmohdtp/forty-six">
</p>

---

## ✨ What is Forty Six?

**Forty Six** is a lightweight abstraction layer over **Baileys**, designed to make WhatsApp bot development stupidly simple.

No complex boilerplate.  
No 200-file frameworks.  
Just install, write your prompt or commands, and run.

---

## 🚀 Features

- Built on top of Baileys
- Clean and minimal API
- Auto session handling
- Command & text-based bot support
- Plug-and-play structure
- Perfect for AI + WhatsApp bots
- Beginner friendly, production ready

---

## 📦 Installation

```bash
npm install forty-six
```
or
```bash
yarn add forty-six
```

---

🧠 Basic Usage

```
const { createBot } = require("forty-six")

createBot({
  session: "session",
  prefix: "!",
  onMessage: async (msg, sock) => {
    if (msg.body === "!ping") {
      await sock.sendMessage(msg.from, { text: "pong 🏓" })
    }
  }
})
```

Run it:

node index.js

Then Enter Paircode To Whatsapp Bot Number using linked devices option on whatsapp. Done.

---
## 🔑 API Setup (Important)

To use AI features, you **must** get a Groq API key.

1. Create an account at https://console.groq.com  
2. Generate your API key  
3. Create a `.env` file in your project root  
4. Paste your key like this:

```env
GROQ_API_KEY=your_groq_api_key_here
```

That’s it.
Forty Six will automatically read it from the environment.

⚠️ Don’t hardcode your API key.
⚠️ Never commit .env to GitHub.
---

📁 Additional Note

Put your AI/system prompt inside prompt.txt
Forty Six takes care of the rest.


---

🤖 AI Ready

Forty Six is designed to work smoothly with:

Custom AI models

Local LLMs

API-based AI (OpenAI, etc.)


Just read your prompt and respond.


---

🔒 Powered By

Baileys (WhatsApp Web API)

Node.js


Forty Six does not reinvent the wheel, it simplifies it.


---

🛠️ Roadmap

Plugin system

Built-in AI handler

Multi-device helpers

Better error handling

CLI support



---

📜 License

MIT License © 2026
Built with ❤️ for WhatsApp devs


---

<p align="center">
  ⭐ If you like this project, give it a star
</p>
