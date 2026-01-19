import 'dotenv/config';
import makeWASocket, { 
  DisconnectReason, 
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import pino from 'pino';
import { MessageHandler } from './lib/message-handler.js';
import fs from 'fs';

/**
 * Forty-Six WhatsApp Bot
 * A configurable AI-powered WhatsApp bot
 */

// Configuration from environment variables
const config = {
  groqApiKey: process.env.GROQ_API_KEY,
  phoneNumber: process.env.PHONE_NUMBER,
  prefixCommands: process.env.PREFIX_COMMANDS || '!',
  prefixQueriesEnabled: process.env.PREFIX_QUERIES_ENABLED === 'true',
  prefixQueries: process.env.PREFIX_QUERIES || '?',
  aiModel: process.env.AI_MODEL || 'llama-3.3-70b-versatile',
  aiInGroups: process.env.AI_IN_GROUPS !== 'false',
  aiInDM: process.env.AI_IN_DM !== 'false',
  aiSelfOnly: process.env.AI_SELF_ONLY === 'true'
};

// Validate required configuration
if (!config.groqApiKey || config.groqApiKey === 'your_groq_api_key_here') {
  console.error('❌ Error: GROQ_API_KEY not set in .env file');
  console.error('   Get your API key from: https://console.groq.com');
  process.exit(1);
}

// Logger setup (fixed)
const logger = pino({
  level: 'info',
  transport: {
    target: 'pino-pretty',
    options: {
      colorize: true,       // colored logs
      ignore: 'pid,hostname,time' // removes extra clutter
    }
  }
});;

// Initialize message handler
const messageHandler = new MessageHandler(config);

// Main connection function
async function connectToWhatsApp() {
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['Forty-Six Bot', 'Chrome', '1.0.0'],
    markOnlineOnConnect: true,
    generateHighQualityLinkPreview: true,
    getMessage: async (key) => {
      return { conversation: '' };
    }
  });

  // Connection update handler
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log('\n📱 Scan this QR code with WhatsApp:');
      const qrcode = await import('qrcode-terminal');
      qrcode.generate(qr, { small: true });
    }

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      console.log('❌ Connection closed due to', lastDisconnect?.error, ', reconnecting:', shouldReconnect);
      
      if (shouldReconnect) {
        setTimeout(connectToWhatsApp, 3000);
      } else {
        console.log('🔓 Logged out. Please delete the session folder and restart.');
        process.exit(0);
      }
    } else if (connection === 'open') {
      console.log('\n✅ Connected to WhatsApp successfully!');
      console.log(`📱 Bot Number: ${sock.user.id.split(':')[0]}`);
      console.log(`\n⚙️  Configuration:`);
      console.log(`   • Command Prefix: ${config.prefixCommands}`);
      console.log(`   • Query Prefix: ${config.prefixQueriesEnabled ? config.prefixQueries : 'Not required'}`);
      console.log(`   • AI Model: ${config.aiModel}`);
      console.log(`   • AI in Groups: ${config.aiInGroups ? '✅' : '❌'}`);
      console.log(`   • AI in DMs: ${config.aiInDM ? '✅' : '❌'}`);
      console.log(`   • Self Only Mode: ${config.aiSelfOnly ? '✅' : '❌'}`);
      console.log(`\n🤖 Bot is ready! Send "${config.prefixCommands}help" for commands\n`);
    }
  });

  // Credentials update handler
  sock.ev.on('creds.update', saveCreds);

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type === 'notify') {
      for (const message of messages) {
        await messageHandler.handleMessage(sock, message);
      }
    }
  });

  return sock;
}

// Handle pairing code
async function usePairingCode() {
  const { state, saveCreds } = await useMultiFileAuthState('session');
  const { version } = await fetchLatestBaileysVersion();

  const sock = makeWASocket({
    version,
    logger,
    printQRInTerminal: false,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    browser: ['Forty-Six Bot', 'Chrome', '1.0.0'],
    markOnlineOnConnect: true,
  });

  if (!sock.authState.creds.registered) {
    const phoneNumber = config.phoneNumber?.replace(/[^0-9]/g, '');
    
    if (!phoneNumber) {
      console.error('❌ Error: PHONE_NUMBER not set in .env file');
      process.exit(1);
    }

    console.log(`📱 Requesting pairing code for: ${phoneNumber}`);
    const code = await sock.requestPairingCode(phoneNumber);
    console.log(`\n🔐 Pairing Code: ${code}\n`);
    console.log('   1. Open WhatsApp on your phone');
    console.log('   2. Go to Settings > Linked Devices');
    console.log('   3. Tap "Link a Device"');
    console.log(`   4. Enter this code: ${code}\n`);
  }

  sock.ev.on('creds.update', saveCreds);

  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect } = update;

    if (connection === 'close') {
      const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
      if (shouldReconnect) {
        setTimeout(usePairingCode, 3000);
      }
    } else if (connection === 'open') {
      console.log('✅ Device paired successfully!');
      console.log('🔄 Restarting with full connection...\n');
      await sock.logout();
      setTimeout(connectToWhatsApp, 2000);
    }
  });
}

// Start bot
console.log('\n🚀 Starting Forty-Six Bot...\n');

// Check if session exists
const sessionExists = fs.existsSync('./session/creds.json');

if (sessionExists) {
  connectToWhatsApp().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
} else {
  console.log('📱 No session found. Starting pairing process...\n');
  usePairingCode().catch(err => {
    console.error('❌ Fatal error:', err);
    process.exit(1);
  });
}

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});
