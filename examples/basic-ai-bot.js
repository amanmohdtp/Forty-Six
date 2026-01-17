/**
 * Example: Basic AI Bot
 * 
 * This example shows how to use Forty Six with default AI handler (Groq)
 */

require('dotenv').config();
const { createBot } = require('forty-six');

// Simple usage - AI handles everything
createBot({
  session: 'session',
  prefix: '!',
  logo: 'logo2.png',
  systemPrompt: `You are a helpful AI assistant on WhatsApp.
Be friendly, concise, and helpful.
Keep responses under 3 sentences for mobile users.
Use emojis occasionally to be engaging.`,
  
  onReady: (sock) => {
    console.log('✨ Bot is ready to chat!\n');
  }
});
