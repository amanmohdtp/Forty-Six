import { GroqAI } from './groq-ai.js';

/**
 * Message Handler
 * Processes incoming WhatsApp messages based on configuration
 */
export class MessageHandler {
  constructor(config) {
    this.config = config;
    this.groqAI = new GroqAI(config.groqApiKey, config.aiModel);
    this.conversationHistory = new Map(); // Store conversation history per user
  }

  /**
   * Main message processing function
   */
  async handleMessage(sock, message) {
    try {
      // Ignore if no message content
      if (!message.message) return;
      
      // Ignore messages from self
      if (message.key.fromMe) return;

      const from = message.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = message.key.participant || from;

      // Extract text from message
      const text = this.extractText(message);
      if (!text || !text.trim()) return;

      const trimmedText = text.trim();

      console.log(`📩 [${isGroup ? 'GROUP' : 'DM'}] ${sender.split('@')[0]}: ${trimmedText}`);

      // Check for commands first (commands always work regardless of settings)
      if (trimmedText.startsWith(this.config.prefixCommands)) {
        await this.handleCommand(sock, from, trimmedText, message);
        return;
      }

      // Handle AI queries based on configuration
      await this.handleAIQuery(sock, from, sender, trimmedText, isGroup, message);

    } catch (error) {
      console.error('❌ Error handling message:', error);
      // Try to send error message to user
      try {
        await sock.sendMessage(message.key.remoteJid, { 
          text: '❌ Sorry, an error occurred while processing your message.' 
        });
      } catch (sendError) {
        console.error('❌ Could not send error message:', sendError);
      }
    }
  }

  /**
   * Extract text from various message types
   */
  extractText(message) {
    try {
      const msg = message.message;

      // Standard text message
      if (msg.conversation) {
        return msg.conversation;
      }

      // Extended text (replies, links, etc)
      if (msg.extendedTextMessage?.text) {
        return msg.extendedTextMessage.text;
      }

      // Image with caption
      if (msg.imageMessage?.caption) {
        return msg.imageMessage.caption;
      }

      // Video with caption
      if (msg.videoMessage?.caption) {
        return msg.videoMessage.caption;
      }

      // Button response
      if (msg.buttonsResponseMessage?.selectedButtonId) {
        return msg.buttonsResponseMessage.selectedButtonId;
      }

      // List response
      if (msg.listResponseMessage?.singleSelectReply?.selectedRowId) {
        return msg.listResponseMessage.singleSelectReply.selectedRowId;
      }

      // Template button reply
      if (msg.templateButtonReplyMessage?.selectedId) {
        return msg.templateButtonReplyMessage.selectedId;
      }

      return null;
    } catch (error) {
      console.error('❌ Error extracting text:', error);
      return null;
    }
  }

  /**
   * Handle bot commands
   */
  async handleCommand(sock, from, text, message) {
    try {
      const commandText = text.slice(this.config.prefixCommands.length).trim();
      const command = commandText.toLowerCase().split(' ')[0];
      const args = commandText.split(' ').slice(1);

      console.log(`🔧 Command: ${command}${args.length > 0 ? ' [' + args.join(', ') + ']' : ''}`);

      switch (command) {
        case 'help':
          await this.sendHelpMessage(sock, from);
          break;

        case 'ping':
          const start = Date.now();
          const sent = await sock.sendMessage(from, { text: '🏓 Pinging...' });
          const latency = Date.now() - start;
          await sock.sendMessage(from, { 
            text: `🏓 *Pong!*\n\n⚡ Latency: ${latency}ms`,
            edit: sent.key
          });
          break;

        case 'models':
          const models = GroqAI.getAvailableModels();
          const modelList = `🤖 *Available AI Models:*\n\n${models.map((m, i) => `${i + 1}. \`${m}\``).join('\n')}\n\n📌 *Current:* ${this.config.aiModel}`;
          await sock.sendMessage(from, { text: modelList }, { quoted: message });
          break;

        case 'config':
          const configInfo = this.getConfigInfo();
          await sock.sendMessage(from, { text: configInfo }, { quoted: message });
          break;

        case 'clear':
          const sender = message.key.participant || from;
          const userId = from.endsWith('@g.us') ? sender : from;
          
          if (this.conversationHistory.has(userId)) {
            this.conversationHistory.delete(userId);
            await sock.sendMessage(from, { 
              text: '🗑️ *Your conversation history has been cleared!*' 
            }, { quoted: message });
          } else {
            await sock.sendMessage(from, { 
              text: '📭 *No conversation history found.*' 
            }, { quoted: message });
          }
          break;

        case 'clearall':
          // Only allow in self-chat or DM with bot owner
          const botNumber = sock.user.id.split(':')[0];
          const senderNumber = (message.key.participant || from).split('@')[0];
          
          if (senderNumber === botNumber) {
            const count = this.conversationHistory.size;
            this.conversationHistory.clear();
            await sock.sendMessage(from, { 
              text: `🗑️ *Cleared ${count} conversation histories!*` 
            }, { quoted: message });
          } else {
            await sock.sendMessage(from, { 
              text: '❌ Only bot owner can use this command.' 
            }, { quoted: message });
          }
          break;

        case 'stats':
          const stats = this.getStats();
          await sock.sendMessage(from, { text: stats }, { quoted: message });
          break;

        default:
          await sock.sendMessage(from, { 
            text: `❓ *Unknown command:* ${this.config.prefixCommands}${command}\n\nType ${this.config.prefixCommands}help for available commands.` 
          }, { quoted: message });
      }
    } catch (error) {
      console.error('❌ Command error:', error);
      await sock.sendMessage(from, { 
        text: '❌ *Error executing command.* Please try again.' 
      });
    }
  }

  /**
   * Handle AI queries based on configuration
   */
  async handleAIQuery(sock, from, sender, text, isGroup, message) {
    try {
      // Check if AI should respond based on configuration
      if (isGroup && !this.config.aiInGroups) {
        console.log('⏭️  Skipped: AI disabled in groups');
        return;
      }

      if (!isGroup && !this.config.aiInDM) {
        console.log('⏭️  Skipped: AI disabled in DMs');
        return;
      }

      // Check self-only mode for DMs
      if (!isGroup && this.config.aiSelfOnly) {
        const botNumber = sock.user.id.split(':')[0];
        const senderNumber = sender.split('@')[0];
        if (senderNumber !== botNumber) {
          console.log('⏭️  Skipped: Self-only mode enabled');
          return;
        }
      }

      // Check prefix requirements for queries
      let queryText = text;
      if (this.config.prefixQueriesEnabled) {
        if (!text.startsWith(this.config.prefixQueries)) {
          console.log('⏭️  Skipped: Query prefix required but not present');
          return;
        }
        // Remove prefix from query
        queryText = text.slice(this.config.prefixQueries.length).trim();
        if (!queryText) {
          await sock.sendMessage(from, { 
            text: '❓ Please provide a query after the prefix.' 
          });
          return;
        }
      }

      // Process AI query
      console.log(`🤖 Processing AI query from ${sender.split('@')[0]}`);

      // Show typing indicator
      await sock.sendPresenceUpdate('composing', from);

      // Get or create conversation history for this user
      const userId = isGroup ? sender : from;
      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }
      const history = this.conversationHistory.get(userId);

      // Get AI response
      const aiResponse = await this.groqAI.chat(queryText, history);

      if (!aiResponse || !aiResponse.trim()) {
        throw new Error('Empty response from AI');
      }

      // Update conversation history (keep last 10 exchanges = 20 messages)
      history.push({ role: 'user', content: queryText });
      history.push({ role: 'assistant', content: aiResponse });
      if (history.length > 20) {
        history.splice(0, history.length - 20);
      }

      // Send response
      await sock.sendPresenceUpdate('paused', from);
      await sock.sendMessage(from, { text: aiResponse }, { quoted: message });

      console.log(`✅ AI Response sent (${aiResponse.length} chars)`);
    } catch (error) {
      await sock.sendPresenceUpdate('paused', from);
      
      let errorMessage = '❌ *Sorry, I encountered an error processing your request.*';
      
      if (error.message?.includes('API')) {
        errorMessage = '❌ *AI service error.* Please try again later.';
      } else if (error.message?.includes('rate limit')) {
        errorMessage = '⏱️ *Rate limit reached.* Please wait a moment and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = '⏱️ *Request timed out.* Please try again.';
      }
      
      await sock.sendMessage(from, { text: errorMessage }, { quoted: message });
      console.error('❌ AI Query Error:', error.message);
    }
  }

  /**
   * Send help message
   */
  async sendHelpMessage(sock, from) {
    const help = `
╔═══════════════════════╗
║   🤖 *${this.config.BOT_NAME}*   ║
╚═══════════════════════╝

*📚 Commands:*
${this.config.prefixCommands}help - Show this help
${this.config.prefixCommands}ping - Check bot status
${this.config.prefixCommands}models - List AI models
${this.config.prefixCommands}config - Show settings
${this.config.prefixCommands}clear - Clear your chat history
${this.config.prefixCommands}stats - Bot statistics

*🤖 AI Queries:*
${this.config.prefixQueriesEnabled 
  ? `Use prefix "${this.config.prefixQueries}" before your message\nExample: ${this.config.prefixQueries}What is JavaScript?` 
  : 'Just send any message to chat with AI!'}

*⚙️ Current Settings:*
• Model: \`${this.config.aiModel}\`
• Groups: ${this.config.aiInGroups ? '✅ Enabled' : '❌ Disabled'}
• DMs: ${this.config.aiInDM ? '✅ Enabled' : '❌ Disabled'}
${this.config.aiSelfOnly ? '• Self-Only: ✅ Enabled' : ''}

_Powered by Groq AI & WhatsApp_
    `.trim();

    await sock.sendMessage(from, { text: help });
  }

  /**
   * Get configuration info
   */
  getConfigInfo() {
    return `
╔═══════════════════════╗
║  ⚙️ *Configuration*     ║
╚═══════════════════════╝

*🔧 Prefixes:*
• Commands: \`${this.config.prefixCommands}\`
• Queries: ${this.config.prefixQueriesEnabled ? `\`${this.config.prefixQueries}\`` : '❌ Not required'}

*🤖 AI Settings:*
• Model: \`${this.config.aiModel}\`
• Groups: ${this.config.aiInGroups ? '✅ Enabled' : '❌ Disabled'}
• DMs: ${this.config.aiInDM ? '✅ Enabled' : '❌ Disabled'}
• Self Only: ${this.config.aiSelfOnly ? '✅ Enabled' : '❌ Disabled'}

*📊 Query Settings:*
• Prefix Required: ${this.config.prefixQueriesEnabled ? '✅ Yes' : '❌ No'}
    `.trim();
  }

  /**
   * Get bot statistics
   */
  getStats() {
    return `
╔═══════════════════════╗
║   📊 *Statistics*       ║
╚═══════════════════════╝

*💬 Conversations:*
• Active Users: ${this.conversationHistory.size}
• Total Messages: ${Array.from(this.conversationHistory.values()).reduce((sum, h) => sum + h.length, 0)}

*⚙️ System:*
• Uptime: ${this.formatUptime(process.uptime())}
• Memory: ${Math.round(process.memoryUsage().heapUsed / 1024 / 1024)}MB

*🤖 AI Model:*
• Current: \`${this.config.aiModel}\`
    `.trim();
  }

  /**
   * Format uptime in readable format
   */
  formatUptime(seconds) {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    const parts = [];
    if (days > 0) parts.push(`${days}d`);
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }
}

export default MessageHandler;
