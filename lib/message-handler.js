import { GroqAI } from './groq-ai.js';

export class MessageHandler {
  constructor(config) {
    this.config = config;
    this.groqAI = new GroqAI(config.groqApiKey, config.aiModel);
    this.history = new Map();
  }

  async handleMessage(sock, msg) {
    try {
      if (!msg.message || msg.key.fromMe) return;
      
      const from = msg.key.remoteJid;
      const text = this.extractText(msg);
      if (!text || !text.trim()) return;

      const isGroup = from.endsWith('@g.us');
      const sender = msg.key.participant || from;
      const senderNum = sender.split('@')[0];
      const isSelf = senderNum === sock.user.id.split(':')[0];

      // Log incoming message
      console.log(`📨 [${isGroup ? 'GROUP' : isSelf ? 'SELF' : 'DM'}] ${senderNum}: ${text.substring(0, 60)}${text.length > 60 ? '...' : ''}`);

      // Handle commands
      if (text.startsWith(this.config.prefixCommands)) {
        const cmd = text.slice(this.config.prefixCommands.length).trim().toLowerCase().split(' ')[0];
        console.log(`✍🏻  Executed command !${cmd} in ${isSelf ? 'self dm' : isGroup ? 'group' : 'dm'}`);
        await this.handleCommand(sock, from, cmd, msg, sender);
        return;
      }

      // Handle AI queries
      await this.handleAI(sock, from, sender, text, isGroup, msg, isSelf);
      
    } catch (err) {
      console.error('❌ Handler error:', err.message);
    }
  }

  extractText(msg) {
    const m = msg.message;
    if (m.conversation) return m.conversation;
    if (m.extendedTextMessage?.text) return m.extendedTextMessage.text;
    if (m.imageMessage?.caption) return m.imageMessage.caption;
    if (m.videoMessage?.caption) return m.videoMessage.caption;
    return '';
  }

  async handleCommand(sock, from, cmd, msg, sender) {
    try {
      switch (cmd) {
        case 'ping':
          const start = Date.now();
          await sock.sendMessage(from, { 
            text: `🏓 *Pong!*\n\n⚡ Latency: ${Date.now() - start}ms` 
          }, { quoted: msg });
          break;

        case 'help':
          const help = `╔═══════════════════════════╗
║  🤖 *${this.config.BOT_NAME}* - Help      ║
╚═══════════════════════════╝

*📚 Commands:*
${this.config.prefixCommands}help - Show this menu
${this.config.prefixCommands}ping - Test bot latency
${this.config.prefixCommands}clear - Clear your chat history
${this.config.prefixCommands}stats - Bot statistics
${this.config.prefixCommands}config - Current settings

*🤖 AI Chat:*
${this.config.prefixQueriesEnabled 
  ? `Use prefix "${this.config.prefixQueries}" before your message\nExample: ${this.config.prefixQueries}What is JavaScript?` 
  : 'Just send any message to chat with AI!'}

*⚙️ Settings:*
• Model: \`${this.config.aiModel}\`
• Groups: ${this.config.aiInGroups ? '✅' : '❌'}
• DMs: ${this.config.aiInDM ? '✅' : '❌'}

━━━━━━━━━━━━━━━━━━━━━
🔗 *GitHub Repository:*
https://github.com/amanmohdtp/Forty-Six.git

_Powered by Groq AI & WhatsApp_`;
          await sock.sendMessage(from, { text: help }, { quoted: msg });
          break;

        case 'clear':
          const userId = from.endsWith('@g.us') ? sender : from;
          if (this.history.has(userId)) {
            this.history.delete(userId);
            await sock.sendMessage(from, { 
              text: '✅ *Chat history cleared!*' 
            }, { quoted: msg });
          } else {
            await sock.sendMessage(from, { 
              text: '📭 *No history found.*' 
            }, { quoted: msg });
          }
          break;

        case 'stats':
          const uptime = process.uptime();
          const hours = Math.floor(uptime / 3600);
          const mins = Math.floor((uptime % 3600) / 60);
          const stats = `╔═══════════════════════════╗
║  📊 *Statistics*           ║
╚═══════════════════════════╝

*💬 Conversations:*
• Active Users: ${this.history.size}

*⚙️ System:*
• Uptime: ${hours}h ${mins}m
• Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB

*🤖 AI:*
• Model: \`${this.config.aiModel}\``;
          await sock.sendMessage(from, { text: stats }, { quoted: msg });
          break;

        case 'config':
          const configMsg = `╔═══════════════════════════╗
║  ⚙️ *Configuration*        ║
╚═══════════════════════════╝

*🔧 Prefixes:*
• Commands: \`${this.config.prefixCommands}\`
• Queries: ${this.config.prefixQueriesEnabled ? `\`${this.config.prefixQueries}\`` : '❌ Not required'}

*🤖 AI Settings:*
• Model: \`${this.config.aiModel}\`
• Groups: ${this.config.aiInGroups ? '✅ Enabled' : '❌ Disabled'}
• DMs: ${this.config.aiInDM ? '✅ Enabled' : '❌ Disabled'}
• Self Only: ${this.config.aiSelfOnly ? '✅ Enabled' : '❌ Disabled'}`;
          await sock.sendMessage(from, { text: configMsg }, { quoted: msg });
          break;

        default:
          await sock.sendMessage(from, { 
            text: `❓ Unknown command: ${this.config.prefixCommands}${cmd}\n\nType ${this.config.prefixCommands}help for available commands.` 
          }, { quoted: msg });
      }
    } catch (err) {
      await sock.sendMessage(from, { 
        text: '❌ Command failed. Try again.' 
      });
    }
  }

  async handleAI(sock, from, sender, text, isGroup, msg, isSelf) {
    try {
      // Check if AI should respond
      if (isGroup && !this.config.aiInGroups) return;
      if (!isGroup && !this.config.aiInDM) return;
      
      if (!isGroup && this.config.aiSelfOnly && !isSelf) return;

      // Check prefix
      let query = text;
      if (this.config.prefixQueriesEnabled) {
        if (!text.startsWith(this.config.prefixQueries)) return;
        query = text.slice(this.config.prefixQueries.length).trim();
        if (!query) return;
      }

      console.log(`🤖 AI Query: "${query.substring(0, 50)}${query.length > 50 ? '...' : ''}"`);

      // Typing
      await sock.sendPresenceUpdate('composing', from);

      // Get history
      const userId = isGroup ? sender : from;
      if (!this.history.has(userId)) {
        this.history.set(userId, []);
      }
      const history = this.history.get(userId);

      // Get AI response
      const response = await this.groqAI.chat(query, history);

      // Update history
      history.push({ role: 'user', content: query });
      history.push({ role: 'assistant', content: response });
      if (history.length > 20) {
        history.splice(0, 2);
      }

      // Send response
      await sock.sendPresenceUpdate('paused', from);
      await sock.sendMessage(from, { text: response }, { quoted: msg });

      console.log(`✅ AI Response sent (${response.length} chars)`);

    } catch (err) {
      await sock.sendPresenceUpdate('paused', from);
      await sock.sendMessage(from, { 
        text: '❌ AI error. Please try again.' 
      });
      console.error('❌ AI Error:', err.message);
    }
  }
}

export default MessageHandler;
