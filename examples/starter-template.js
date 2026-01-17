/**
 * Forty Six - Simple Starter Template
 * 
 * 1. Get Groq API key from: https://console.groq.com/keys
 * 2. Create .env file and add: GROQ_API_KEY=your_key
 * 3. (Optional) Add logo2.png to your project root
 * 4. Run: node index.js
 */

require('dotenv').config();
const { createBot } = require('forty-six');

// Configure your bot
createBot({
  // Session folder (auto-created)
  session: 'session',
  
  // Command prefix
  prefix: '!',
  
  // Your startup logo (optional)
  logo: 'logo2.png',
  
  // AI personality (customize this!)
  systemPrompt: `You are a helpful AI assistant on WhatsApp.
  
Be friendly and conversational.
Keep responses under 3 sentences for mobile users.
Use emojis occasionally to be engaging.
Be helpful and informative.`,

  // Called when bot is ready
  onReady: (sock) => {
    console.log('✨ Your bot is ready to chat!\n');
  }
  
  // That's it! Bot will respond to all messages with AI
  // To add custom commands, see examples/custom-commands.js
});
