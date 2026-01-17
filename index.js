/**
 * Forty Six - Example Bot
 * 
 * This is a basic example showing how to use Forty Six
 */

const { createBot } = require('./forty-six');
const fs = require('fs');

// Read AI prompt from prompt.txt
const aiPrompt = fs.existsSync('prompt.txt') 
  ? fs.readFileSync('prompt.txt', 'utf8')
  : 'You are a helpful AI assistant.';

console.log('📝 System Prompt loaded:\n');
console.log(aiPrompt);
console.log('\n' + '='.repeat(50) + '\n');

// Simple AI response generator (replace with real AI)
function generateAIResponse(userMessage, prompt) {
  const lower = userMessage.toLowerCase();
  
  // Simple pattern matching (replace with real AI)
  if (lower.includes('hello') || lower.includes('hi')) {
    return 'Hello! 👋 How can I help you today?';
  }
  
  if (lower.includes('how are you')) {
    return 'I\'m doing great! Thanks for asking! 😊';
  }
  
  if (lower.includes('bye')) {
    return 'Goodbye! Have a great day! 👋';
  }
  
  if (lower.includes('thanks') || lower.includes('thank you')) {
    return 'You\'re welcome! Happy to help! 😊';
  }
  
  // Default response
  return 'I heard you! I\'m a simple AI bot built with Forty Six. Try saying hello! 😊';
}

// Create bot
createBot({
  session: 'session',
  prefix: '!',
  phoneNumber: '', // Add phone number for pairing code (optional)
  logo: 'logo2.png', // Will send this image on startup
  
  onReady: async (sock) => {
    console.log('🚀 Bot is ready!\n');
    console.log('💬 Waiting for messages...\n');
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
          const helpText = `📚 *Available Commands:*

!ping - Test bot response
!help - Show this help
!about - About this bot

Or just chat normally - I'll respond with AI! 💬`;
          await sock.sendMessage(msg.from, { text: helpText });
          console.log('✅ Sent: help\n');
          break;
          
        case 'about':
          const aboutText = `🤖 *Forty Six Bot*

Built with Forty Six - a simple, minimal WhatsApp bot library.

Powered by:
• Baileys (WhatsApp Web API)
• Custom AI responses
• Node.js

Version: 1.0.0`;
          await sock.sendMessage(msg.from, { text: aboutText });
          console.log('✅ Sent: about\n');
          break;
          
        default:
          await sock.sendMessage(msg.from, { 
            text: `Unknown command: ${msg.command}\n\nType !help for available commands.` 
          });
      }
    } 
    // Handle regular messages (AI responses)
    else if (msg.body.trim()) {
      // Generate AI response
      const response = generateAIResponse(msg.body, aiPrompt);
      
      // Send response
      await sock.sendMessage(msg.from, { text: response });
      console.log(`✅ Sent: ${response}\n`);
    }
  }
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down Forty Six...');
  process.exit(0);
});
