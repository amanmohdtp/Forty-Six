/**
 * Quick Start Template
 * Copy this to get started quickly!
 */

require('dotenv').config();
const { createBot } = require('forty-six');
const GroqAI = require('forty-six/lib/groq-ai');

const ai = new GroqAI(process.env.GROQ_API_KEY);

createBot({
  session: 'session',
  prefix: '!',
  logo: 'logo.png',
  
  onMessage: async (msg, sock) => {
    if (msg.isCommand) {
      // Handle commands
      if (msg.command === 'ping') {
        await sock.sendMessage(msg.from, { text: 'pong 🏓' });
      }
    } else {
      // AI chat
      const response = await ai.chat(msg.sender, msg.body, 'You are a helpful assistant.');
      await sock.sendMessage(msg.from, { text: response });
    }
  }
});
