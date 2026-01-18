/**
 * Forty Six - Core Library
 * WhatsApp bot framework built on Baileys
 */

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState, delay, makeCacheableSignalKeyStore, fetchLatestBaileysVersion } = require('@whiskeysockets/baileys');
const { Boom } = require('@hapi/boom');
const pino = require('pino');
const fs = require('fs');
const path = require('path');

/**
 * Create WhatsApp bot
 */
async function createBot(config = {}) {
  const {
    session = 'session',
    prefix = '!',
    onMessage,
    onReady,
    logo = 'logo.png',
    phoneNumber = null
  } = config;

  const sessionPath = path.resolve(process.cwd(), session);

  if (!fs.existsSync(sessionPath)) {
    fs.mkdirSync(sessionPath, { recursive: true });
  }

  const logger = pino({ level: 'silent' });

  console.log('🤖 Forty Six - Initializing...\n');

  try {
    const { version } = await fetchLatestBaileysVersion();
    const { state, saveCreds } = await useMultiFileAuthState(sessionPath);

    const sock = makeWASocket({
      version,
      auth: {
        creds: state.creds,
        keys: makeCacheableSignalKeyStore(state.keys, logger),
      },
      printQRInTerminal: !phoneNumber,
      logger,
      browser: ['Forty Six', 'Chrome', '1.0.0'],
      markOnlineOnConnect: true,
      getMessage: async (key) => ({ conversation: '' })
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && phoneNumber) {
        try {
          const code = await sock.requestPairingCode(phoneNumber.replace(/[^0-9]/g, ''));
          console.log('\n📱 Pairing Code:\n');
          console.log(`   ${code}\n`);
          console.log('Enter this in: WhatsApp → Linked Devices → Link a Device\n');
        } catch (err) {
          console.error('Pairing code error:', err.message);
        }
      }

      if (connection === 'close') {
        const shouldReconnect = (lastDisconnect?.error instanceof Boom)
          ? lastDisconnect.error.output.statusCode !== DisconnectReason.loggedOut
          : true;

        console.log('❌ Connection closed');

        if (shouldReconnect) {
          console.log('🔄 Reconnecting in 5 seconds...\n');
          await delay(5000);
          createBot(config);
        } else {
          console.log('🚪 Logged out. Delete session folder to login again.');
        }
      } else if (connection === 'open') {
        console.log('✅ Connected to WhatsApp!\n');

        await sendStartupDM(sock, logo);

        if (onReady) await onReady(sock);
      }
    });

    sock.ev.on('messages.upsert', async ({ messages, type }) => {
      if (type !== 'notify') return;

      for (const m of messages) {
        if (!m.message || m.key.fromMe) continue;

        const msg = parseMessage(m, prefix);

        if (onMessage) {
          try {
            await onMessage(msg, sock);
          } catch (err) {
            console.error('Error in onMessage:', err.message);
          }
        }
      }
    });

    return sock;

  } catch (err) {
    console.error('❌ Failed to start:', err.message);
    throw err;
  }
}

async function sendStartupDM(sock, logoPath) {
  try {
    await delay(2000);

    const ownJid = sock.user.id;
    const fullLogoPath = path.resolve(process.cwd(), logoPath);

    if (fs.existsSync(fullLogoPath)) {
      await sock.sendMessage(ownJid, {
        image: fs.readFileSync(fullLogoPath),
        caption: '🎉 *Forty Six Is Loaded* 🎉\n\nBot is online and ready!'
      });
      console.log('✅ Startup DM sent\n');
    } else {
      await sock.sendMessage(ownJid, {
        text: '🎉 *Forty Six Is Loaded* 🎉\n\nBot is online!'
      });
      console.log('⚠️  Startup DM sent (logo not found)\n');
    }
  } catch (err) {
    console.error('Startup DM error:', err.message);
  }
}

function parseMessage(m, prefix) {
  const messageType = Object.keys(m.message)[0];
  let body = '';

  if (messageType === 'conversation') {
    body = m.message.conversation;
  } else if (messageType === 'extendedTextMessage') {
    body = m.message.extendedTextMessage.text;
  } else if (messageType === 'imageMessage') {
    body = m.message.imageMessage.caption || '';
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
    timestamp: m.messageTimestamp,
    raw: m
  };
}

module.exports = { createBot };
