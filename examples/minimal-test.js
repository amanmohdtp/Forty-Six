/**
 * Minimal Test Bot
 * Simple bot to test connection
 */

require('dotenv').config();
const { createBot } = require('../lib/index');

const PHONE = process.env.PHONE_NUMBER || '';

if (!PHONE) {
  console.error('❌ Set PHONE_NUMBER in .env');
  process.exit(1);
}

console.log('🧪 Testing connection...\n');

createBot({
  session: 'test-session',
  phoneNumber: PHONE,
  
  onReady: () => {
    console.log('✅ Connected!\n');
    console.log('Send "ping" to test\n');
  },
  
  onMessage: async (msg, sock) => {
    console.log(`📨 ${msg.body}`);
    
    if (msg.body === 'ping') {
      await sock.sendMessage(msg.from, { text: 'pong!' });
      console.log('✅ Sent: pong\n');
    }
  }
});
