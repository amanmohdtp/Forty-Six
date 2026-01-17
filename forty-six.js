/**
 * Forty Six - A simple, minimal WhatsApp bot library
 * Built on top of Baileys
 */

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, delay, makeCacheableSignalKeyStore } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

/**
 * Create a WhatsApp bot
 * @param {Object} config - Bot configuration
 * @param {string} config.session - Session folder name
 * @param {string} config.prefix - Command prefix (default: "!")
 * @param {Function} config.onMessage - Message handler
 * @param {Function} config.onReady - Called when bot is ready
 * @param {string} config.logo - Path to logo image for startup DM
 */
async function createBot(config = {}) {
  const {
    session = 'session',
    prefix = '!',
    onMessage,
    onReady,
    logo = 'logo2.png'
  } = config;

  const sessionPath = path.join(process.cwd(), session);

  // Create logger
  const logger = pino({ level: 'silent' });

  console.log('🤖 Forty Six - Starting...\n');

  // Load auth state
  const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

  // Create socket
  const sock = makeWASocket({
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    printQRInTerminal: false,
    logger,
    browser: ['Forty Six', 'Chrome', '1.0.0'],
  });

  // Save credentials on update
  sock.ev.on('creds.update', saveCreds);

  // Connection updates
  sock.ev.on('connection.update', async (update) => {
    const { connection, lastDisconnect, qr, isNewLogin } = update;

    if (qr) {
      console.log('\n📱 Scan this pairing code in WhatsApp:\n');
      const code = await sock.requestPairingCode(config.phoneNumber || '');
      console.log(`\n   ${code}\n`);
      console.log('Go to: WhatsApp > Settings > Linked Devices > Link a Device\n');
      console.log('Enter the code above ⬆️\n');
    }

    if (connection === 'close') {
      const shouldReconnect = (lastDisconnect?.error instanceof Boom)
        ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
        : true;

      console.log('❌ Connection closed:', lastDisconnect?.error?.message);

      if (shouldReconnect) {
        console.log('🔄 Reconnecting...\n');
        await delay(3000);
        createBot(config);
      }
    } else if (connection === 'open') {
      console.log('✅ Connected to WhatsApp!\n');

      // Send startup DM
      await sendStartupDM(sock, logo);

      // Call onReady callback
      if (onReady) {
        await onReady(sock);
      }
    }
  });

  // Message handler
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;

    for (const m of messages) {
      if (!m.message) continue;
      if (m.key.fromMe) continue;

      const msg = parseMessage(m, prefix);

      // Call user's message handler
      if (onMessage) {
        await onMessage(msg, sock);
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
    const fullLogoPath = path.join(process.cwd(), logoPath);

    if (fs.existsSync(fullLogoPath)) {
      await sock.sendMessage(ownJid, {
        image: fs.readFileSync(fullLogoPath),
        caption: '🎉 *Forty Six Is Loaded* 🎉\n\nBot is now online and ready to assist!'
      });
      console.log('✅ Startup DM sent with logo!\n');
    } else {
      await sock.sendMessage(ownJid, {
        text: '🎉 *Forty Six Is Loaded* 🎉\n\nBot is now online and ready to assist!\n\n⚠️ Note: logo2.png not found'
      });
      console.log('⚠️  Startup DM sent (logo2.png not found)\n');
    }
  } catch (err) {
    console.error('❌ Failed to send startup DM:', err.message);
  }
}

/**
 * Parse incoming message
 */
function parseMessage(m, prefix) {
  const messageType = Object.keys(m.message)[0];
  let body = '';

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
  const args = isCommand ? body.slice(prefix.length + command.length).trim().split(' ') : [];

  return {
    from: m.key.remoteJid,
    sender: m.key.participant || m.key.remoteJid,
    body,
    isGroup: m.key.remoteJid.endsWith('@g.us'),
    isCommand,
    command,
    args,
    raw: m
  };
}

/**
 * Request pairing code (for phone number login)
 */
async function requestPairingCode(sock, phoneNumber) {
  try {
    const code = await sock.requestPairingCode(phoneNumber);
    return code;
  } catch (err) {
    console.error('Failed to request pairing code:', err.message);
    return null;
  }
}

module.exports = {
  createBot,
  requestPairingCode
};
