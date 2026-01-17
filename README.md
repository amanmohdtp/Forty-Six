Forty Six 🤖

<p align="center">
  <img src="https://github.com/amanmohdtp/Forty-Six/blob/2162f82470b10c2e954d3ca107d3e936369484b7/logo.png" width="300" alt="Forty Six Logo">
</p>

<h1 align="center">Forty Six</h1>

<p align="center">
  <strong>A simple, minimal Node.js framework for building WhatsApp chatbots on top of Baileys</strong>
</p>

<p align="center">
  <a href="https://github.com/amanmohdtp/forty-six/blob/main/LICENSE">
    <img src="https://img.shields.io/badge/license-MIT-blue.svg" alt="License">
  </a>
  <img src="https://img.shields.io/badge/node-%3E%3D16.0-green" alt="Node Version">
  <img src="https://img.shields.io/badge/status-active-success" alt="Status">
  <img src="https://img.shields.io/github/stars/amanmohdtp/forty-six?style=social" alt="GitHub Stars">
</p>

---

✨ What is Forty Six?

Forty Six is a lightweight, open-source WhatsApp bot framework built on top of Baileys. It removes the complexity and boilerplate, letting you focus on building amazing chatbots.

---


📦 Quick Start

1. Clone the Repository

```bash
git clone https://github.com/amanmohdtp/forty-six.git
cd forty-six
```

2. Install Dependencies

```bash
npm install
```

3. Set Up Environment

Create a .env file:

```bash
cp .env.example .env
```

Edit .env and add your Groq API key (get it from console.groq.com):

```env
GROQ_API_KEY=your_groq_api_key_here
```

4. Customize Your Prompt (Optional)

Edit prompt.txt to customize your AI's personality and behavior.

5. Run the Bot

```bash
node examples/basic-bot.js
```

6. Scan QR Code

Enter the  paircode with WhatsApp → Linked Devices 

Done! Your bot is now running. 🎉

---


🤖 AI Integration

Forty Six comes with built-in Groq AI support:

1. Get API Key: Sign up at console.groq.com
2. Add to .env: GROQ_API_KEY=your_key_here
3. Customize Prompt: Edit prompt.txt

---


🔒 Privacy & Security

· No Data Collection: Forty Six doesn't collect or store your data
· Local Sessions: All WhatsApp sessions are stored locally
· No Telemetry: No tracking or analytics
· Open Source: Fully transparent code

Important Notes:

· ⚠️ Keep your .env file private
· ⚠️ Never share your session files
· ⚠️ Use responsibly and comply with WhatsApp's Terms of Service

---


🤝 Contributing

Contributions are welcome!

Development Setup

```bash
git clone https://github.com/amanmohdtp/forty-six.git
cd forty-six
npm install
```


---

❓ FAQ

Q: Do I need to pay for Groq API?

A: Groq offers free tier with generous limits. Check groq.com/pricing

Q: Any Payment Requires?

A: No, completly free

Q: Is this against WhatsApp's ToS?

A: Use at your own risk. Always comply with WhatsApp's Terms of Service.

Q: How do I reset the bot?

A: Delete the session/ folder and restart.

Q: Can I host this 24/7?

A: Yes, use PM2, Docker, or a VPS with persistent storage.

---

📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

---

🙏 Acknowledgments

· Baileys - WhatsApp Web API
· Groq - AI Inference API
· All contributors and users of Forty Six

---

📞 Support

· Issues: GitHub Issues
· Discussions: GitHub Discussions
· Email: Check GitHub profile

---

<p align="center">
  Made with ❤️ for the WhatsApp bot community
  <br>
  <br>
  ⭐ <strong>If you like this project, give it a star!</strong> ⭐
</p>
