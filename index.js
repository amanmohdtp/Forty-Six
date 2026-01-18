/**
 * Forty Six - Basic Bot Example
 * Full-featured WhatsApp bot with Groq AI
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createBot } = require('../lib/index');
const GroqAI = require('../lib/groq-ai');

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

// Session management functions
function setupSessionManagement() {
  const authFolder = 'auth_info';
  
  // Create auth folder if it doesn't exist
  if (!fs.existsSync(authFolder)) {
    fs.mkdirSync(authFolder, { recursive: true });
    console.log(`📁 Created auth folder: ${authFolder}`);
  }
  
  // Check for existing credentials
  const credsPath = path.join(authFolder, 'creds.json');
  
  if (fs.existsSync(credsPath)) {
    console.log('🔍 Found existing credentials');
    try {
      const credsData = fs.readFileSync(credsPath, 'utf8');
      const creds = JSON.parse(credsData);
      
      if (creds && (creds.me || creds.sessionId)) {
        console.log('✅ Valid credentials found');
        return {
          useExisting: true,
          creds: creds
        };
      }
    } catch (err) {
      console.error('❌ Error reading credentials:', err.message);
    }
  }
  
  console.log('📱 No valid credentials found, will generate new pair code');
  return {
    useExisting: false,
    creds: null
  };
}

async function saveCredentials(creds, phoneNumber) {
  const authFolder = 'auth_info';
  const credsPath = path.join(authFolder, 'creds.json');
  
  try {
    // Save the full credentials
    fs.writeFileSync(credsPath, JSON.stringify(creds, null, 2));
    console.log('✅ Credentials saved to:', credsPath);
    
    return credsPath;
  } catch (err) {
    console.error('❌ Error saving credentials:', err.message);
    return null;
  }
}

// Function to send credentials to user
async function sendCredentialsFile(sock, phoneNumber, credsPath) {
  try {
    // Send success message
    const successMessage = `✅ *Forty-Six Wa Bot Successfully Connected!*\n\nYour session has been saved. You can now restart the bot without scanning QR code again.`;
    
    // Send credentials file
    const fileBuffer = fs.readFileSync(credsPath);
    
    await sock.sendMessage(
      `${phoneNumber}@s.whatsapp.net`, 
      { 
        text: successMessage,
        document: fileBuffer,
        fileName: 'creds.json',
        mimetype: 'application/json'
      }
    );
    
    console.log('📤 Credentials file sent to WhatsApp');
    return true;
  } catch (err) {
    console.error('❌ Error sending credentials:', err.message);
    return false;
  }
}

// Main bot setup
async function startBot() {
  console.log('🤖 Forty Six Bot Starting...\n');
  
  // Check for existing session
  const sessionInfo = setupSessionManagement();
  
  let botOptions = {
    session: 'session',
    prefix: '!',
    logo: 'logo.png',
    phoneNumber: process.env.PHONE_NUMBER || '',
    pairCode: true, // Enable pair code generation
    usePairCode: true, // Force pair code usage
  };
  
  // Add auth credentials if available
  if (sessionInfo.useExisting && sessionInfo.creds) {
    console.log('🔄 Connecting with saved credentials...');
    botOptions.auth = sessionInfo.creds;
  } else {
    console.log('📲 New connection required');
    console.log('A pair code will be generated for you to connect.\n');
  }
  
  try {
    const sock = await createBot(botOptions);
    
    // Set up event handlers
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr, isNewLogin } = update;
      
      if (qr) {
        console.log('\n🔢 Pair Code Generated:');
        console.log('Use this code in WhatsApp:');
        console.log('1. Open WhatsApp');
        console.log('2. Go to Settings → Linked Devices → Link a Device');
        console.log('3. Enter this code:', qr);
        console.log('');
      }
      
      if (connection === 'open') {
        console.log('✅ Connected to WhatsApp!');
        
        // Get credentials from auth state
        if (sock.authState && sock.authState.creds) {
          const creds = sock.authState.creds;
          
          // Save credentials
          const credsPath = await saveCredentials(creds, process.env.PHONE_NUMBER);
          
          if (credsPath && process.env.PHONE_NUMBER) {
            // Send credentials to user
            console.log('📤 Sending credentials to your WhatsApp...');
            await sendCredentialsFile(sock, process.env.PHONE_NUMBER, credsPath);
          }
        }
      }
      
      if (connection === 'close') {
        console.log('🔌 Connection closed');
        
        // Check if it's a normal close or error
        const shouldReconnect = !lastDisconnect?.error || 
                               lastDisconnect.error.output?.statusCode !== 401;
        
        if (shouldReconnect) {
          console.log('🔄 Attempting to reconnect in 5 seconds...');
          setTimeout(startBot, 5000);
        } else {
          console.log('❌ Cannot reconnect. Please delete auth_info/ and restart.');
        }
      }
    });
    
    // Message handler
    sock.ev.on('messages.upsert', async (m) => {
      const msg = m.messages[0];
      
      // Ignore if message is from status broadcast or not a text message
      if (msg.key.remoteJid === 'status@broadcast' || !msg.message?.conversation) {
        return;
      }
      
      // Extract message details
      const from = msg.key.remoteJid;
      const body = msg.message.conversation;
      
      console.log(`📨 From ${from}: ${body}`);
      
      try {
        // Check if it's a command
        if (body.startsWith('!')) {
          const command = body.slice(1).split(' ')[0].toLowerCase();
          
          switch (command) {
            case 'ping':
              await sock.sendMessage(from, { text: 'pong 🏓' });
              console.log('✅ Sent: pong\n');
              break;
              
            case 'help':
              await sock.sendMessage(from, { 
                text: `📚 *Forty Six Bot*

*Commands:*
!ping - Test
!help - This help
!clear - Clear AI history
!about - About bot
!session - Get session info

*AI Chat:*
Just send any message! 🤖` 
              });
              console.log('✅ Sent: help\n');
              break;
              
            case 'clear':
              ai.clearHistory(from);
              await sock.sendMessage(from, { text: '✨ AI history cleared!' });
              console.log('✅ Cleared AI history\n');
              break;
              
            case 'about':
              await sock.sendMessage(from, { 
                text: `🤖 *Forty Six*

Open-source WhatsApp bot
Powered by Groq AI
Built with Baileys

GitHub: github.com/amanmohdtp/forty-six` 
              });
              console.log('✅ Sent: about\n');
              break;
              
            case 'session':
              const sessionInfo = setupSessionManagement();
              if (sessionInfo.useExisting) {
                await sock.sendMessage(from, { 
                  text: `🔐 *Session Status*

✅ Session saved and active
Location: auth_info/creds.json
Phone: ${process.env.PHONE_NUMBER || 'Not set'}` 
                });
              } else {
                await sock.sendMessage(from, { 
                  text: 'No saved session found. Session will be saved after connection.' 
                });
              }
              console.log('✅ Sent: session info\n');
              break;
              
            default:
              await sock.sendMessage(from, { 
                text: `Unknown command: !${command}\nTry !help` 
              });
          }
        } 
        // AI chat
        else if (body.trim()) {
          await sock.sendPresenceUpdate('composing', from);
          
          const response = await ai.chat(from, body, systemPrompt);
          
          await sock.sendMessage(from, { text: response });
          
          console.log(`✅ AI Response sent\n`);
          
          await sock.sendPresenceUpdate('available', from);
        }
      } catch (err) {
        console.error('❌ Error:', err.message);
        try {
          await sock.sendMessage(from, { 
            text: '❌ Error occurred. Please try again!' 
          });
        } catch (sendErr) {
          console.error('Failed to send error message:', sendErr.message);
        }
      }
    });
    
    console.log('🚀 Bot Ready!\n');
    console.log('💬 Waiting for messages...\n');
    
  } catch (err) {
    console.error('\n❌ Failed to start bot:', err.message);
    
    if (err.message.includes('pair code') || err.message.includes('QR')) {
      console.error('\n💡 Pair Code Troubleshooting:');
      console.error('1. Make sure WhatsApp is installed on your phone');
      console.error('2. Check if WhatsApp Web is working in browser');
      console.error('3. Try deleting auth_info/ folder and restarting');
      console.error('4. Ensure your phone has internet connection');
    } else {
      console.error('\n💡 Troubleshooting:');
      console.error('1. Check .env file has GROQ_API_KEY');
      console.error('2. Delete auth folder: rm -rf auth_info/ session/');
      console.error('3. Update dependencies: npm install');
    }
    
    console.log('\n🔄 Restarting in 10 seconds...');
    setTimeout(startBot, 10000);
  }
}

// Start the bot
startBot();

// Handle shutdown
process.on('SIGINT', () => {
  console.log('\n\n👋 Shutting down...');
  process.exit(0);
});

process.on('uncaughtException', (err) => {
  console.error('⚠️ Uncaught Exception:', err.message);
});

process.on('unhandledRejection', (err) => {
  console.error('⚠️ Unhandled Rejection:', err.message);
});
