/**
 * Forty Six - Basic Bot Example
 * Full-featured WhatsApp bot with Groq AI
 */

require('dotenv').config();
const { createBot } = require('../lib/index');
const GroqAI = require('../lib/groq-ai');
const fs = require('fs');

// Check environment
if (!process.env.GROQ_API_KEY) {
  console.error('❌ GROQ_API_KEY not found!\n');
  console.error('Create .env file with:\n');
  console.error('GROQ_API_KEY=your_key_here');
  console.error('PHONE_NUMBER=your_number_here\n');
  console.error('Get free API key: https://console.groq.com/keys\n');
  process.exit(1);
}

if (!process.env.PHONE_NUMBER) {
  console.warn('⚠️  PHONE_NUMBER not set - will use QR code\n');
}

// Initialize AI
const ai = new GroqAI(process.env.GROQ_API_KEY);

// Load prompt
const systemPrompt = fs.existsSync('prompt.txt')
  ? fs.readFileSync('prompt.txt', 'utf8')
  : 'You are a helpful AI assistant. Be friendly and concise.';

console.log('📝 System Prompt:\n');
console.log(systemPrompt);
console.log('\n' + '='.repeat(60) + '\n');

// Create bot
createBot({
  session: 'session',
  prefix: '!',
  logo: 'logo.png',
  phoneNumber: process.env.PHONE_NUMBER,
  
  onReady: async (sock) => {
    console.log('🚀 Bot Ready!\n');
    console.log('💬 Waiting for messages...\n');
  },
  
  onMessage: async (msg, sock) => {
    console.log(`📨 From ${msg.sender}: ${msg.body}`);
    
    try {
      // Commands
      if (msg.isCommand) {
        switch (msg.command) {
          case 'ping':
            await sock.sendMessage(msg.from, { text: 'pong 🏓' });
            console.log('✅ Sent: pong\n');
            break;
            
          case 'help':
            await sock.sendMessage(msg.from, { 
              text: `📚 *Forty Six Bot*

*Commands:*
!ping - Test
!help - This help
!clear - Clear history
!about - About bot

*AI Chat:*
Just send any message! 🤖` 
            });
            console.log('✅ Sent: help\n');
            break;
            
          case 'clear':
            ai.clearHistory(msg.sender);
            await sock.sendMessage(msg.from, { text: '✨ History cleared!' });
            console.log('✅ Cleared history\n');
            break;
            
          case 'about':
            await sock.sendMessage(msg.from, { 
              text: `🤖 *Forty Six*

Open-source WhatsApp bot
Powered by Groq AI
Built with Baileys

GitHub: github.com/amanmohdtp/forty-six` 
            });
            console.log('✅ Sent: about\n');
            break;
            
          default:
            await sock.sendMessage(msg.from, { 
              text: `Unknown: !${msg.command}\nTry !help` 
            });
        }
      } 
      // AI chat
      else if (msg.body.trim()) {
        await sock.sendPresenceUpdate('composing', msg.from);
        
        const response = await ai.chat(msg.sender, msg.body, systemPrompt);
        
        await sock.sendMessage(msg.from, { text: response });
        
        console.log(`✅ AI: ${response.substring(0, 50)}...\n`);
        
        await sock.sendPresenceUpdate('available', msg.from);
      }
    } catch (err) {
      console.error('❌ Error:', err.message);
      await sock.sendMessage(msg.from, { 
        text: '❌ Error occurred. Try again!' 
      });
    }
  }
}).catch(err => {
  console.error('\n❌ Failed:', err.message);
  console.error('\nTroubleshooting:');
  console.error('1. Check .env has GROQ_API_KEY and PHONE_NUMBER');
  console.error('2. Delete session: rm -rf session/');
  console.error('3. Run: npm install\n');
});

process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  process.exit(0);
});
