/**
 * Forty Six - Basic Bot Example
 * Full-featured WhatsApp bot with Groq AI
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const chalk = require('chalk');
const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, fetchLatestBaileysVersion, Browsers } = require('@whiskeysockets/baileys');
const pino = require('pino');
const GroqAI = require('../lib/groq-ai');

// Check environment
if (!process.env.GROQ_API_KEY) {
  console.error(chalk.red('❌ GROQ_API_KEY not found!\n'));
  console.error('Create .env file with:\n');
  console.error('GROQ_API_KEY=your_key_here');
  console.error('PHONE_NUMBER=your_number_here\n');
  console.error('Get free API key: https://console.groq.com/keys\n');
  process.exit(1);
}

if (!process.env.PHONE_NUMBER) {
  console.error(chalk.red('❌ PHONE_NUMBER not found!\n'));
  console.error('Add to .env file:\n');
  console.error('PHONE_NUMBER=1234567890  (your phone number, digits only)\n');
  process.exit(1);
}

// Global error handlers - PREVENT CRASHES
process.on('unhandledRejection', (err) => {
  console.error(chalk.red('⚠️  Unhandled Rejection:'), err.message);
});

process.on('uncaughtException', (err) => {
  console.error(chalk.red('⚠️  Uncaught Exception:'), err.message);
});

// Initialize AI
const ai = new GroqAI(process.env.GROQ_API_KEY);

// Load prompt
const systemPrompt = fs.existsSync('prompt.txt')
  ? fs.readFileSync('prompt.txt', 'utf8')
  : 'You are a helpful AI assistant. Be friendly and concise.';

console.log(chalk.cyan('📝 System Prompt:\n'));
console.log(systemPrompt);
console.log('\n' + '='.repeat(60) + '\n');

// Session setup
const authDir = './auth_info';
const credsFile = path.join(authDir, 'creds.json');

// Ensure auth directory exists
if (!fs.existsSync(authDir)) {
  fs.mkdirSync(authDir, { recursive: true });
}

const BOT_NUMBER = process.env.PHONE_NUMBER;
const BOT_NAME = "Forty Six";
const PREFIX = "!";

const startBot = async () => {
  try {
    const { state, saveCreds } = await useMultiFileAuthState(authDir);
    const { version } = await fetchLatestBaileysVersion();
    
    const sock = makeWASocket({
      version,
      logger: pino({ level: 'silent' }),
      printQRInTerminal: false,
      auth: state,
      browser: Browsers.ubuntu('Chrome'),
      getMessage: async (key) => {
        return { conversation: 'Message not found' };
      },
      defaultQueryTimeoutMs: undefined,
      connectTimeoutMs: 60000,
      keepAliveIntervalMs: 30000
    });

    // Store credentials
    sock.ev.on('creds.update', saveCreds);

    let pairingCodeSent = false;
    let connectionAttempts = 0;

    /* ========== CONNECTION HANDLER ========== */
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, isNewLogin, qr } = update;

      // Request pairing code when connection starts
      if (connection === 'connecting' && !state.creds.registered && !pairingCodeSent) {
        console.log(chalk.cyan('🔄 Socket connecting...'));
        
        // Give socket time to be ready, then request code
        const requestPairing = async () => {
          try {
            if (!BOT_NUMBER) {
              console.error(chalk.red('❌ BOT_NUMBER is not set!'));
              process.exit(1);
            }

            const phoneNumber = BOT_NUMBER.replace(/[^0-9]/g, '');
            console.log(chalk.cyan(`📲 Requesting pairing code for +${phoneNumber}...`));
            
            const code = await sock.requestPairingCode(phoneNumber);
            pairingCodeSent = true;
            
            console.log(chalk.green('\n' + '='.repeat(50)));
            console.log(chalk.green.bold('  📱 PAIRING CODE: ') + chalk.yellow.bold(code));
            console.log(chalk.green('='.repeat(50) + '\n'));
            
            console.log(chalk.cyan('📖 Instructions:'));
            console.log(chalk.white('  1. Open WhatsApp on your phone'));
            console.log(chalk.white('  2. Go to Settings → Linked Devices'));
            console.log(chalk.white('  3. Tap "Link a Device"'));
            console.log(chalk.white('  4. Tap "Link with phone number instead"'));
            console.log(chalk.white(`  5. Enter: `) + chalk.yellow.bold(code));
            console.log(chalk.cyan('\n⏱️  Code expires in 60 seconds!\n'));
            
          } catch (err) {
            pairingCodeSent = false;
            console.error(chalk.red('❌ Pairing code request failed:'), err.message);
            
            if (err.message.includes('timed out') || err.message.includes('closed')) {
              console.log(chalk.yellow('\n💡 The connection closed too quickly.'));
              console.log(chalk.yellow('   This usually happens due to:'));
              console.log(chalk.yellow('   1. Unstable internet connection'));
              console.log(chalk.yellow('   2. Firewall blocking WhatsApp servers'));
              console.log(chalk.yellow('   3. Old Baileys version\n'));
            }
          }
        };

        // Wait a bit for socket initialization
        setTimeout(requestPairing, 5000);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
        
        console.log(chalk.yellow(`\n⚠️  Connection closed. Reason: ${statusCode || 'Unknown'}`));
        
        if (statusCode === DisconnectReason.loggedOut) {
          console.log(chalk.red('\n❌ Device Logged Out!'));
          console.log(chalk.yellow('   Delete "auth_info" folder and restart.\n'));
          process.exit(0);
        }
        
        if (shouldReconnect) {
          connectionAttempts++;
          const delay = Math.min(connectionAttempts * 2000, 30000); // Max 30s
          console.log(chalk.cyan(`🔄 Reconnecting in ${delay/1000}s... (Attempt ${connectionAttempts})\n`));
          pairingCodeSent = false; // Allow new pairing request
          setTimeout(() => startBot(), delay);
        } else {
          console.log(chalk.red('❌ Cannot reconnect. Exiting.\n'));
          process.exit(1);
        }
      } else if (connection === 'open') {
        connectionAttempts = 0; // Reset on successful connection
        pairingCodeSent = false; // Reset flag
        
        console.log(chalk.green('\n' + '='.repeat(50)));
        console.log(chalk.green.bold(`  ✅ ${BOT_NAME} CONNECTED!`));
        console.log(chalk.green('='.repeat(50)));
        console.log(chalk.white(`  📱 Number: ${sock.user.id.split(':')[0]}`));
        console.log(chalk.white(`  👤 Name: ${sock.user.name || BOT_NAME}`));
        console.log(chalk.white(`  ⏰ Time: ${new Date().toLocaleString()}`));
        console.log(chalk.green('='.repeat(50) + '\n'));

        // Generate or load session ID
        let sessionId;
        if (fs.existsSync(credsFile)) {
          try {
            const credsData = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
            if (credsData.SESSION) {
              sessionId = credsData.SESSION;
            }
          } catch (err) {
            // Ignore
          }
        }
        
        if (!sessionId) {
          sessionId = 'FortySix~' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
          try {
            const credsData = fs.existsSync(credsFile) 
              ? JSON.parse(fs.readFileSync(credsFile, 'utf8')) 
              : {};
            credsData.SESSION = sessionId;
            fs.writeFileSync(credsFile, JSON.stringify(credsData, null, 2));
          } catch (err) {
            console.error(chalk.yellow('⚠️  Could not save session'));
          }
        }

        console.log(chalk.blue(`🔑 Session ID: ${sessionId}\n`));

        // Send success message
        try {
          const jid = sock.user.id;
          await sock.sendMessage(jid, { 
            text: `✅ *${BOT_NAME} Online!*\n\n` +
                  `🔑 Session: \`${sessionId}\`\n` +
                  `📱 Number: ${sock.user.id.split(':')[0]}\n` +
                  `⏰ Connected: ${new Date().toLocaleString()}\n\n` +
                  `Type ${PREFIX}help for commands`
          });
        } catch (err) {
          console.log(chalk.yellow('⚠️  Could not send welcome message'));
        }

        console.log(chalk.cyan('💬 Waiting for messages...\n'));
      }
    });

    /* ========== MESSAGE HANDLER ========== */
    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      try {
        if (type !== 'notify') return;
        const msg = messages[0];
        if (!msg.message || msg.key.fromMe) return;

        const from = msg.key.remoteJid;
        const sender = msg.key.participant || msg.key.remoteJid;
        const isGroup = from.endsWith('@g.us');
        
        const body = msg.message?.conversation || 
                     msg.message?.extendedTextMessage?.text || 
                     msg.message?.imageMessage?.caption || 
                     msg.message?.videoMessage?.caption || '';

        if (!body) return;

        const senderNumber = sender.split('@')[0];
        console.log(chalk.cyan(`📨 From ${senderNumber}: ${body}`));

        // Commands
        if (body.startsWith(PREFIX)) {
          const command = body.slice(PREFIX.length).trim().split(' ')[0].toLowerCase();
          
          try {
            switch (command) {
              case 'ping':
                await sock.sendMessage(from, { text: '🏓 Pong!\n\n_Response time: Fast_' });
                console.log(chalk.green('✅ Sent: pong\n'));
                break;
                
              case 'help':
                await sock.sendMessage(from, { 
                  text: `📚 *${BOT_NAME} Bot*

*Commands:*
${PREFIX}ping - Test bot response
${PREFIX}help - Show this help
${PREFIX}clear - Clear AI chat history
${PREFIX}about - About this bot
${PREFIX}session - Session info

*AI Chat:*
Just send any message (without ${PREFIX}) and I'll respond using Groq AI 🤖

*Features:*
✨ Powered by Groq LLaMA
💬 Natural conversations
🧠 Context-aware responses` 
                });
                console.log(chalk.green('✅ Sent: help\n'));
                break;
                
              case 'clear':
                ai.clearHistory(sender);
                await sock.sendMessage(from, { text: '✨ Chat history cleared!\n\n_Starting fresh conversation..._' });
                console.log(chalk.green('✅ Cleared history\n'));
                break;
                
              case 'about':
                await sock.sendMessage(from, { 
                  text: `🤖 *${BOT_NAME} Bot*

*Version:* 1.0.0
*AI Model:* Groq LLaMA
*Framework:* Baileys

*Features:*
✅ AI-powered conversations
✅ Command system
✅ Pairing code connection
✅ Session management

*Open Source:*
github.com/amanmohdtp/forty-six

_Built with ❤️ using Node.js_` 
                });
                console.log(chalk.green('✅ Sent: about\n'));
                break;

              case 'session':
                const sessionExists = fs.existsSync(credsFile);
                let sessionInfo = '🔐 *Session Status*\n\n';
                
                if (sessionExists) {
                  try {
                    const credsData = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
                    sessionInfo += `✅ Session Active\n`;
                    sessionInfo += `📁 Location: auth_info/creds.json\n`;
                    sessionInfo += `🔑 ID: ${credsData.SESSION || 'N/A'}\n`;
                    sessionInfo += `📱 Phone: ${BOT_NUMBER}\n`;
                  } catch (err) {
                    sessionInfo += `⚠️ Session file exists but unreadable`;
                  }
                } else {
                  sessionInfo += `❌ No saved session found`;
                }
                
                await sock.sendMessage(from, { text: sessionInfo });
                console.log(chalk.green('✅ Sent: session info\n'));
                break;
                
              default:
                await sock.sendMessage(from, { 
                  text: `❌ Unknown command: ${PREFIX}${command}\n\nTry ${PREFIX}help for available commands` 
                });
            }
          } catch (err) {
            console.error(chalk.red('Command error:'), err.message);
            await sock.sendMessage(from, { text: '❌ Command failed. Please try again.' });
          }
        } 
        // AI chat
        else if (body.trim()) {
          try {
            await sock.sendPresenceUpdate('composing', from);
            
            const response = await ai.chat(sender, body, systemPrompt);
            
            await sock.sendMessage(from, { text: response });
            
            console.log(chalk.green(`✅ AI responded\n`));
            
            await sock.sendPresenceUpdate('available', from);
          } catch (err) {
            console.error(chalk.red('AI error:'), err.message);
            await sock.sendMessage(from, { text: '❌ AI error occurred. Please try again.' });
          }
        }
      } catch (err) {
        console.error(chalk.red('Message handler error:'), err.message);
      }
    });

    return sock;
  } catch (err) {
    console.error(chalk.red('\n❌ Fatal error:'), err.message);
    console.log(chalk.cyan('🔄 Retrying in 15 seconds...\n'));
    setTimeout(() => startBot(), 15000);
  }
};

/* ========== STARTUP ========== */
console.log(chalk.cyan.bold(`
╔════════════════════════════════════╗
║     🤖 ${BOT_NAME}                    ║
║     Starting...                    ║
╚════════════════════════════════════╝
`));

// Check if already authenticated
const alreadyAuthenticated = fs.existsSync(path.join(authDir, 'creds.json'));
if (alreadyAuthenticated) {
  console.log(chalk.green('✓ Found existing session, connecting...\n'));
} else {
  console.log(chalk.yellow('⚠️  No session found, will request pairing code...\n'));
}

startBot().catch(err => {
  console.error(chalk.red('Startup failed:'), err);
  process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log(chalk.yellow('\n\n👋 Shutting down gracefully...'));
  process.exit(0);
});
