import 'dotenv/config';
import makeWASocket from '@whiskeysockets/baileys';
import { 
  DisconnectReason, 
  useMultiFileAuthState,
  makeCacheableSignalKeyStore,
  fetchLatestBaileysVersion
} from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import { MessageHandler } from './lib/message-handler.js';

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
  aiSelfOnly: process.env.AI_SELF_ONLY === 'true',
  BOT_NAME: process.env.BOT_NAME || 'Forty-Six Bot'
};

// Validate required configuration
if (!config.groqApiKey || config.groqApiKey === 'your_groq_api_key_here') {
  console.error('❌ Error: GROQ_API_KEY not set in .env file');
  console.error('   Get your API key from: https://console.groq.com');
  process.exit(1);
}

// Session directory
const authDir = './session';
const credsFile = path.join(authDir, 'creds.json');

// Ensure auth directory exists
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

// Global error handlers - PREVENT CRASHES
process.on('unhandledRejection', (err) => {
  console.error('⚠️  Unhandled Rejection:', err.message);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️  Uncaught Exception:', err.message);
});

// Global variables
let pairingCodeSent = false;
let connectionAttempts = 0;

// Initialize message handler
const messageHandler = new MessageHandler(config);

const startBot = async () => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    // Silent logger
    const logger = {
      info: () => {},
      warn: () => {},
      error: () => {},
      debug: () => {},
      trace: () => {},
      fatal: () => {},
      child: () => logger
    };

    const sock = makeWASocket({
      version,
      logger,
      printQRInTerminal: false,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      browser: ['Forty-Six Bot', 'Chrome', '1.0.0'],
      getMessage: async (key) => {
        return { conversation: 'Message not found' };
      },
      defaultQueryTimeoutMs: undefined,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000
    });

    // Store credentials
    sock.ev.on('creds.update', saveCreds);

    /* ========== CONNECTION HANDLER ========== */
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      // REQUEST PAIRING CODE WHEN CONNECTION STARTS - THIS IS THE KEY
      if (connection === 'connecting' && !state.creds.registered && !pairingCodeSent) {
        console.log('🔄 Socket connecting...');
        
        // Give socket time to be ready, then request code
        setTimeout(async () => {
          try {
            if (!config.phoneNumber) {
              console.error('❌ PHONE_NUMBER is not set in .env file!');
              console.error('   Example: PHONE_NUMBER=919862466381');
              process.exit(1);
            }

            const phoneNumber = config.phoneNumber.replace(/[^0-9]/g, '');
            console.log(`📲 Requesting pairing code for +${phoneNumber}...`);
            
            // THIS IS THE ACTUAL PAIRING CODE REQUEST
            const code = await sock.requestPairingCode(phoneNumber);
            pairingCodeSent = true;
            
            console.log('\n' + '='.repeat(50));
            console.log('  📱 PAIRING CODE: ' + code);
            console.log('='.repeat(50) + '\n');
            
            console.log('📖 Instructions:');
            console.log('  1. Open WhatsApp on your phone');
            console.log('  2. Go to Settings → Linked Devices');
            console.log('  3. Tap "Link a Device"');
            console.log('  4. Tap "Link with phone number instead"');
            console.log(`  5. Enter: ${code}`);
            console.log('\n⏱️  Code expires in 60 seconds!\n');
            
          } catch (err) {
            pairingCodeSent = false;
            console.error('❌ Pairing code request failed:', err.message);
            
            if (err.message.includes('timed out') || err.message.includes('closed')) {
              console.log('\n💡 The connection closed too quickly.');
              console.log('   This usually happens due to:');
              console.log('   1. Unstable internet connection');
              console.log('   2. Firewall blocking WhatsApp servers');
              console.log('   3. Old Baileys version\n');
              
              // Retry after 5 seconds
              setTimeout(async () => {
                try {
                  const phoneNumber = config.phoneNumber.replace(/[^0-9]/g, '');
                  console.log('🔄 Retrying pairing code request...');
                  const code = await sock.requestPairingCode(phoneNumber);
                  pairingCodeSent = true;
                  
                  console.log('\n' + '='.repeat(50));
                  console.log('  📱 PAIRING CODE: ' + code);
                  console.log('='.repeat(50) + '\n');
                } catch (retryErr) {
                  console.error('❌ Retry also failed:', retryErr.message);
                }
              }, 5000);
            }
          }
        }, 3000); // Wait 3 seconds for socket to be ready
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log(`\n⚠️  Connection closed. Reason: ${statusCode || 'Unknown'}`);
        
        if (statusCode === DisconnectReason.loggedOut) {
          console.log('\n❌ Device Logged Out!');
          console.log('   Delete "session" folder and restart.\n');
          process.exit(0);
        }
        
        if (shouldReconnect) {
          connectionAttempts++;
          const delay = Math.min(connectionAttempts * 2000, 30000); // Max 30s
          console.log(`🔄 Reconnecting in ${delay/1000}s... (Attempt ${connectionAttempts})\n`);
          pairingCodeSent = false; // Allow new pairing request
          setTimeout(() => startBot(), delay);
        } else {
          console.log('❌ Cannot reconnect. Exiting.\n');
          process.exit(1);
        }
      } else if (connection === 'open') {
        connectionAttempts = 0; // Reset on successful connection
        pairingCodeSent = false; // Reset flag
        
        console.log('\n' + '='.repeat(50));
        console.log(`  ✅ ${config.BOT_NAME} CONNECTED!`);
        console.log('='.repeat(50));
        console.log(`  📱 Number: ${sock.user.id.split(':')[0]}`);
        console.log(`  👤 Name: ${sock.user.name || 'Unknown'}`);
        console.log(`  ⏰ Time: ${new Date().toLocaleString()}`);
        console.log('='.repeat(50) + '\n');

        // Save session ID
        try {
          if (fs.existsSync(credsFile)) {
            const credsData = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
            credsData.SESSION = 'FortySix-' + Date.now().toString(36);
            fs.writeFileSync(credsFile, JSON.stringify(credsData, null, 2));
          }
        } catch (err) {
          // Ignore
        }

        console.log('⚙️  Configuration:');
        console.log(`   • Command Prefix: ${config.prefixCommands}`);
        console.log(`   • Query Prefix: ${config.prefixQueriesEnabled ? config.prefixQueries : 'Not required'}`);
        console.log(`   • AI Model: ${config.aiModel}`);
        console.log(`   • AI in Groups: ${config.aiInGroups ? '✅' : '❌'}`);
        console.log(`   • AI in DMs: ${config.aiInDM ? '✅' : '❌'}`);
        console.log(`   • Self Only Mode: ${config.aiSelfOnly ? '✅' : '❌'}`);
        console.log(`\n🤖 Bot is ready! Send "${config.prefixCommands}help" for commands\n`);

        // Send welcome message to self
        try {
          const jid = sock.user.id;
          await sock.sendMessage(jid, { 
            text: `✅ *${config.BOT_NAME} Online!*\n\n` +
                  `📱 Number: ${sock.user.id.split(':')[0]}\n` +
                  `⏰ Connected: ${new Date().toLocaleString()}\n\n` +
                  `Type ${config.prefixCommands}help for commands`
          });
        } catch (err) {
          // Ignore welcome message errors
        }
      }
    });

    /* ========== MESSAGE HANDLER ========== */
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      try {
        if (type !== 'notify') return;
        
        for (const message of messages) {
          await messageHandler.handleMessage(sock, message);
        }
      } catch (err) {
        console.error('Message error:', err.message);
      }
    });

    return sock;
  } catch (err) {
    console.error('\n❌ Fatal error:', err.message);
    console.log('🔄 Retrying in 15 seconds...\n');
    setTimeout(() => startBot(), 15000);
  }
};

/* ========== STARTUP ========== */
console.log(`
╔════════════════════════════════════╗
║     🤖 ${config.BOT_NAME}           ║
║     Starting...                    ║
╚════════════════════════════════════╝
`);

// Check if already authenticated
const alreadyAuthenticated = fs.existsSync(credsFile);
if (alreadyAuthenticated) {
  console.log('✓ Found existing session, connecting...\n');
} else {
  console.log('⚠️  No session found, will request pairing code...\n');
  
  // Check if phone number is set
  if (!config.phoneNumber) {
    console.error('❌ Error: PHONE_NUMBER not set in .env file');
    console.error('   Add PHONE_NUMBER=your-number to your .env file');
    console.error('   Example: PHONE_NUMBER=919862466381 (without +)');
    process.exit(1);
  }
}

// Start bot
startBot().catch(err => {
  console.error('Startup failed:', err);
  process.exit(1);
});

// Handle process termination
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down gracefully...');
  process.exit(0);
});
