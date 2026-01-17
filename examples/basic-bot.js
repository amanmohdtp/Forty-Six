/**
 * Forty Six - Example Bot with Groq AI
 * 
 * This is a complete example showing how to use Forty Six with Groq AI
 */

require('dotenv').config();
const { createBot } = require('forty-six');
const GroqAI = require('forty-six/lib/groq-ai');
const fs = require('fs');

// Check for Groq API key
if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not found in .env file!\n');
  console.error('Please create a .env file with:\n');
  console.error('GROQ_API_KEY=your_api_key_here\n');
  console.error('Get your API key at: https://console.groq.com/keys\n');
  process.exit(1);
}

// Initialize Groq AI
const ai = new GroqAI(process.env.GROQ_API_KEY);

// Load system prompt from prompt.txt
const systemPrompt = fs.existsSync('prompt.txt')
  ? fs.readFileSync('prompt.txt', 'utf8')
  : 'You are a helpful AI assistant chatting via WhatsApp. Be friendly and concise.';

console.log('📝 System Prompt loaded:\n');
console.log(systemPrompt);
console.log('\n' + '='.repeat(60) + '\n');

// Create bot
createBot({
  session: 'session',
  prefix: '!',
  logo: 'logo.png', // Put your logo as logo.png in the same folder
  phoneNumber: process.env.PHONE_NUMBER, // Optional: for pairing code
  
  onReady: async (sock) => {
    console.log('🚀 Bot is ready!\n');
    console.log('💬 Waiting for messages...\n');
    console.log('Try sending: !help\n');
  },
  
  onMessage: async (msg, sock) => {
    console.log(`📨 Message from ${msg.sender}: ${msg.body}`);
    
    // Handle commands
    if (msg.isCommand) {
      switch (msg.command) {
        case 'ping':
          await sock.sendMessage(msg.from, { text: 'pong 🏓' });
          console.log('✅ Sent: pong\n');
          break;
          
        case 'help':
          const helpText = `📚 *Forty Six Bot Commands*

*Commands:*
!ping - Test bot response
!help - Show this help
!clear - Clear conversation history
!about - About this bot

*AI Chat:*
Just send any message (without !) to chat with AI powered by Groq! 🤖

Example: "Tell me a joke"`;
          
          await sock.sendMessage(msg.from, { text: helpText });
          console.log('✅ Sent: help\n');
          break;
          
        case 'clear':
          ai.clearHistory(msg.sender);
          await sock.sendMessage(msg.from, { 
            text: '✨ Conversation history cleared! Starting fresh!' 
          });
          console.log('✅ Cleared history\n');
          break;
          
        case 'about':
          const aboutText = `🤖 *Forty Six Bot*

Built with Forty Six - a simple, minimal WhatsApp bot library.

*Powered by:*
• Baileys (WhatsApp Web API)
• Groq AI (${ai.constructor.getAvailableModels()[0]})
• Node.js

*Features:*
✅ AI conversations
✅ Command support
✅ Session management
✅ Auto-reconnect

Built with ❤️ using Forty Six`;
          
          await sock.sendMessage(msg.from, { text: aboutText });
          console.log('✅ Sent: about\n');
          break;
          
        default:
          await sock.sendMessage(msg.from, { 
            text: `❌ Unknown command: !${msg.command}\n\nType !help for available commands.` 
          });
      }
    } 
    // Handle AI chat (non-command messages)
    else if (msg.body.trim()) {
      try {
        // Show typing indicator (optional)
        await sock.sendPresenceUpdate('composing', msg.from);
        
        // Generate AI response using Groq
        const response = await ai.chat(msg.sender, msg.body, systemPrompt);
        
        // Send AI response
        await sock.sendMessage(msg.from, { text: response });
        
        console.log(`✅ AI Response: ${response.substring(0, 50)}...\n`);
        
        // Mark as available
        await sock.sendPresenceUpdate('available', msg.from);
        
      } catch (err) {
        console.error('Error generating AI response:', err.message);
        await sock.sendMessage(msg.from, { 
          text: '❌ Sorry, I encountered an error. Please try again!' 
        });
      }
    }
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down Forty Six...');
  process.exit(0);
});
