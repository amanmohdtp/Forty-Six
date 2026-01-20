import 'dotenv/config';
import makeWASocket from '@whiskeysockets/baileys';
import {
  DisconnectReason,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  Browsers
} from '@whiskeysockets/baileys';
import fs from 'fs';
import path from 'path';
import pino from 'pino';
import { MessageHandler } from './lib/message-handler.js';

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
  BOT_NAME: process.env.BOT_NAME || 'Forty-Six'
};

if (!config.groqApiKey || config.groqApiKey === 'your_groq_api_key_here') {
  console.error('❌ GROQ_API_KEY not set in .env');
  process.exit(1);
}

if (!config.phoneNumber || config.phoneNumber === 'your_phone_number_here') {
  console.error('❌ PHONE_NUMBER not set in .env');
  process.exit(1);
}

const authDir = './session';
const credsFile = path.join(authDir, 'creds.json');

if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

process.on('unhandledRejection', (err) => {
  console.error('❌ Unhandled Rejection:', err);
});
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
});

let pairingCodeSent = false;
let connectionAttempts = 0;
const messageHandler = new MessageHandler(config);

const startBot = async () => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();

    const sock = makeWASocket({
      version,
      logger: pino({ level: 'fatal' }),
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      syncFullHistory: false,
      markOnlineOnConnect: true,
      fireInitQueries: false,
      generateHighQualityLinkPreview: false,
      getMessage: async () => ({ conversation: '' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect } = update;

      if (connection === 'connecting' && !state.creds.registered && !pairingCodeSent) {
        console.log('🔄 Connecting...');

        setTimeout(async () => {
          try {
            const phoneNumber = config.phoneNumber.replace(/[^0-9]/g, '');
            const code = await sock.requestPairingCode(phoneNumber);
            pairingCodeSent = true;

            console.log('\n' + '═'.repeat(40));
            console.log(`  📱 PAIRING CODE: ${code}`);
            console.log('═'.repeat(40));
            console.log('1. WhatsApp → Settings → Linked Devices');
            console.log('2. Link a Device → Phone Number');
            console.log(`3. Enter: ${code}`);
            console.log('⏱️  60 seconds to enter!\n');
          } catch (err) {
            pairingCodeSent = false;
            console.error('❌ Pairing failed:', err.message);
          }
        }, 3000);
      }

      if (connection === 'close') {
        const code = lastDisconnect?.error?.output?.statusCode;

        if (code === DisconnectReason.loggedOut) {
          console.log('\n❌ Logged out. Delete "session" folder.\n');
          process.exit(0);
        }

        connectionAttempts++;
        const delay = Math.min(connectionAttempts * 3000, 15000);
        console.log(`🔄 Reconnecting in ${delay / 1000}s...`);
        pairingCodeSent = false;
        setTimeout(startBot, delay);
      }

      if (connection === 'open') {
        connectionAttempts = 0;
        pairingCodeSent = false;

        console.log('\n' + '═'.repeat(40));
        console.log('  ✅ CONNECTED SUCCESSFULLY!');
        console.log('═'.repeat(40));
        console.log(`  📱 Number: ${sock.user.id.split(':')[0]}`);
        console.log(`  👤 Name: ${sock.user.name || 'User'}`);
        console.log(`  ⏰ Time: ${new Date().toLocaleTimeString()}`);
        console.log('═'.repeat(40) + '\n');

        try {
          const creds = fs.existsSync(credsFile)
            ? JSON.parse(fs.readFileSync(credsFile, 'utf8'))
            : {};
          creds.SESSION = 'FS~' + Date.now().toString(36);
          fs.writeFileSync(credsFile, JSON.stringify(creds, null, 2));
        } catch (err) {
          console.error('⚠️  Could not update creds:', err.message);
        }

        console.log('🤖 Bot Ready! Listening for messages...\n');

        try {
          const welcomeImage =
            'https://raw.githubusercontent.com/amanmohdtp/Forty-Six/2162f82470b10c2e954d3ca107d3e936369484b7/logo.png';

          const welcomeText = `╔═══════════════════════════╗
║  ✅ *BOT CONNECTED!*        ║
╚═══════════════════════════╝

🤖 *${config.BOT_NAME}*

📱 *Number:* ${sock.user.id.split(':')[0]}
⏰ *Time:* ${new Date().toLocaleString()}
🔧 *Model:* ${config.aiModel}

━━━━━━━━━━━━━━━━━━━━
*Quick Start:*
• Send ${config.prefixCommands}help for commands
• ${config.prefixQueriesEnabled ? `Use ${config.prefixQueries} for AI queries` : 'Just send any message for AI'}

━━━━━━━━━━━━━━━━━━━━
🔗 *Repository:*
https://github.com/amanmohdtp/Forty-Six.git`;

          await sock.sendMessage(sock.user.id, {
            image: { url: welcomeImage },
            caption: welcomeText
          });
          
          console.log('✅ Welcome message sent\n');
        } catch (err) {
          console.log('⚠️  Could not send welcome message:', err.message);
        }
      }
    });

    // FIXED: Proper message event handling
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;
      
      for (const msg of messages) {
        // Process each message
        try {
          await messageHandler.handleMessage(sock, msg);
        } catch (err) {
          console.error('❌ Message handling error:', err.message);
        }
      }
    });

    // Auto-reject calls
    sock.ev.on('call', async (calls) => {
      for (const call of calls) {
        if (call.status === 'offer') {
          try {
            await sock.rejectCall(call.id, call.from);
            console.log(`📞 Rejected call from ${call.from}`);
          } catch (err) {
            console.error('❌ Error rejecting call:', err.message);
          }
        }
      }
    });

    return sock;
  } catch (err) {
    console.error('❌ Fatal error:', err.message);
    console.log('Retrying in 15s...');
    setTimeout(startBot, 15000);
  }
};

console.log(`🤖 ${config.BOT_NAME} starting...`);
startBot();

process.on('SIGINT', () => {
  console.log('\n👋 Shutting down gracefully...');
  process.exit(0);
});
