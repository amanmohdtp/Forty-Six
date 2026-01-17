/**
 * Forty Six - Main Library
 * A simple, minimal WhatsApp bot library built on Baileys
 */

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

/**
 * Create a WhatsApp bot instance
 * @param {Object} config - Bot configuration
 * @param {string} config.session - Session folder name (default: 'session')
 * @param {string} config.prefix - Command prefix (default: '!')
 * @param {Function} config.onMessage - Message handler callback
 * @param {Function} config.onReady - Ready callback
 * @param {string} config.logo - Path to logo image for startup DM
 * @param {boolean} config.printQR - Show QR code in terminal (default: true)
 * @param {string} config.phoneNumber - Phone number for pairing code
 * @returns {Promise<Object>} Socket instance
 */
async function createBot(config = {}) {
  const {
    session = 'session',
    prefix = '!',
    onMessage,
    onReady,
    logo = 'logo.png',
    printQR = true,
    phoneNumber = null
  } = config;

  const sessionPath = path.resolve(process.cwd(), session);

  // Ensure session directory exists
  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  // Create silent logger
  const logger = pino({ level: 'silent' });

  console.log('🤖 Forty Six - Initializing...\n');

  // Load auth state
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  // Create socket
  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: printQR,
    logger,
    browser: ['Forty Six', 'Chrome', '1.0.0'],
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr && phoneNumber) {
      try {
        const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
        console.log('\n📱 Pairing Code:\n');
        console.log(`   ${code}\n`);
        console.log('Enter this code in WhatsApp > Linked Devices\n');
      } catch (err) {
        console.error('Failed to get pairing code:', err.message);
      }
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true;

      console.log('❌ Connection closed:', lastDisconnect?.error?.message || 'Unknown reason');

      if (shouldReconnect) {
        console.log('🔄 Reconnecting in 3 seconds...\n');
        await delay(3000);
        createBot(config);
      } else {
        console.log('🚪 Logged out. Delete session folder to login again.');
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp!\n');

      // Send startup DM
      await sendStartupDM(sock, logo);

      // Call onReady callback
      if (onReady && typeof onReady === 'function') {
        await onReady(sock);
      }
    }
  });

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
      if (!m.message) continue;
      if (m.key.fromMe) continue; // Ignore own messages

      const msg = parseMessage(m, prefix);

      // Call user's message handler
      if (onMessage && typeof onMessage === 'function') {
        try {
          await onMessage(msg, sock);
        } catch (err) {
          console.error('Error in onMessage handler:', err.message);
        }
      }
    }
  });

  return sock;
}

/**
 * Send startup DM with logo
 */
async function sendStartupDM(sock, logoPath) {
  try {
    await delay(2000);

    const ownJid = sock.user.id;
    const fullLogoPath = path.resolve(process.cwd(), logoPath);

    if (fs.existsSync(fullLogoPath)) {
      await sock.sendMessage(ownJid, {
        image: fs.readFileSync(fullLogoPath),
        caption: '🎉 *Forty Six Is Loaded* 🎉\n\nBot is now online and ready to assist!'
      });
      console.log('✅ Startup DM sent with logo\n');
    } else {
      await sock.sendMessage(ownJid, {
        text: '🎉 *Forty Six Is Loaded* 🎉\n\nBot is now online and ready to assist!\n\n⚠️ Note: Logo image not found at: ' + logoPath
      });
      console.log('⚠️  Startup DM sent (logo not found)\n');
    }
  } catch (err) {
    console.error('❌ Failed to send startup DM:', err.message);
  }
}

/**
 * Parse incoming message into simplified format
 */
function parseMessage(m, prefix) {
  const messageType = Object.keys(m.message)[0];
  let body = '';

  // Extract text from different message types
  if (messageType === 'conversation') {
    body = m.message.conversation;
  } else if (messageType === 'extendedTextMessage') {
    body = m.message.extendedTextMessage.text;
  } else if (messageType === 'imageMessage') {
    body = m.message.imageMessage.caption || '';
  } else if (messageType === 'videoMessage') {
    body = m.message.videoMessage.caption || '';
  }

  const isCommand = body.startsWith(prefix);
  const command = isCommand ? body.slice(prefix.length).split(' ')[0].toLowerCase() : '';
  const args = isCommand ? body.slice(prefix.length + command.length).trim().split(' ').filter(Boolean) : [];

  return {
    from: m.key.remoteJid,
    sender: m.key.participant || m.key.remoteJid,
    body,
    isGroup: m.key.remoteJid.endsWith('@g.us'),
    isCommand,
    command,
    args,
    messageType,
    timestamp: m.messageTimestamp,
    raw: m
  };
}

/**
 * Helper to send text message
 */
async function sendText(sock, to, text) {
  try {
    await sock.sendMessage(to, { text });
  } catch (err) {
    console.error('Failed to send message:', err.message);
  }
}

/**
 * Helper to send image
 */
async function sendImage(sock, to, imagePath, caption = '') {
  try {
    const image = fs.readFileSync(imagePath);
    await sock.sendMessage(to, { image, caption });
  } catch (err) {
    console.error('Failed to send image:', err.message);
  }
}

module.exports = {
  createBot,
  sendText,
  sendImage
};
