const { GroqAI } = require('./groq-ai.js');

/**
 * Message Handler
 * Processes incoming WhatsApp messages based on configuration
 */
class MessageHandler {
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
      // Extract message details
      const messageType = Object.keys(message.message || {})[0];
      const messageContent = this.extractMessageContent(message, messageType);
      const from = message.key.remoteJid;
      const isGroup = from.endsWith('@g.us');
      const sender = message.key.participant || from;

      // Ignore messages from self
      if (message.key.fromMe) return;

      // Check if it's a text message
      if (messageType !== 'conversation' && messageType !== 'extendedTextMessage') {
        return;
      }

      const text = messageContent?.trim() || '';
      if (!text) return;

      console.log(`📩 [${isGroup ? 'GROUP' : 'DM'}] ${sender.split('@')[0]}: ${text.substring(0, 50)}${text.length > 50 ? '...' : ''}`);

      // Check for commands first (commands always work regardless of settings)
      if (text.startsWith(this.config.prefixCommands)) {
        await this.handleCommand(sock, from, text, message);
        return;
      }

      // Handle AI queries based on configuration
      await this.handleAIQuery(sock, from, sender, text, isGroup, message);

    } catch (error) {
      console.error('❌ Error handling message:', error.message);
    }
  }

  /**
   * Extract message content based on type
   */
  extractMessageContent(message, messageType) {
    if (messageType === 'conversation') {
      return message.message.conversation;
    } else if (messageType === 'extendedTextMessage') {
      return message.message.extendedTextMessage.text;
    }
    return null;
  }

  /**
   * Handle bot commands
   */
  async handleCommand(sock, from, text, message) {
    const command = text.slice(this.config.prefixCommands.length).toLowerCase().trim();

    switch (command) {
      case 'help':
        await this.sendHelpMessage(sock, from);
        break;

      case 'ping':
        await sock.sendMessage(from, { text: '🏓 Pong!' }, { quoted: message });
        break;

      case 'models':
        const models = GroqAI.getAvailableModels();
        const modelList = `🤖 *Available AI Models:*\n\n${models.map((m, i) => `${i + 1}. ${m}`).join('\n')}\n\n📌 Current: ${this.config.aiModel}`;
        await sock.sendMessage(from, { text: modelList }, { quoted: message });
        break;

      case 'config':
        const configInfo = this.getConfigInfo();
        await sock.sendMessage(from, { text: configInfo }, { quoted: message });
        break;

      case 'clear':
        this.conversationHistory.clear();
        await sock.sendMessage(from, { text: '🗑️ Conversation history cleared!' }, { quoted: message });
        break;

      default:
        await sock.sendMessage(from, { text: `❓ Unknown command: ${command}\nType ${this.config.prefixCommands}help for available commands.` }, { quoted: message });
    }
  }

  /**
   * Handle AI queries based on configuration
   */
  async handleAIQuery(sock, from, sender, text, isGroup, message) {
    // Check if AI should respond based on configuration
    if (isGroup && !this.config.aiInGroups) {
      return; // AI disabled in groups
    }

    if (!isGroup && !this.config.aiInDM) {
      return; // AI disabled in DMs
    }

    // Check self-only mode for DMs
    if (!isGroup && this.config.aiSelfOnly) {
      const botNumber = sock.user.id.split(':')[0] + '@s.whatsapp.net';
      if (sender !== botNumber) {
        return; // Only bot's own number can use AI in DM
      }
    }

    // Check prefix requirements for queries
    if (this.config.prefixQueriesEnabled) {
      if (!text.startsWith(this.config.prefixQueries)) {
        return; // Prefix required but not present
      }
      // Remove prefix from query
      text = text.slice(this.config.prefixQueries.length).trim();
    }

    // Process AI query
    try {
      // Show typing indicator
      await sock.sendPresenceUpdate('composing', from);

      // Get or create conversation history for this user
      const userId = isGroup ? sender : from;
      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }
      const history = this.conversationHistory.get(userId);

      // Get AI response
      const aiResponse = await this.groqAI.chat(text, history);

      // Update conversation history (keep last 10 messages)
      history.push({ role: 'user', content: text });
      history.push({ role: 'assistant', content: aiResponse });
      if (history.length > 20) { // Keep last 10 exchanges
        history.splice(0, history.length - 20);
      }

      // Send response
      await sock.sendPresenceUpdate('paused', from);
      await sock.sendMessage(from, { text: aiResponse }, { quoted: message });

      console.log(`🤖 AI Response sent to ${isGroup ? 'GROUP' : 'DM'}`);
    } catch (error) {
      await sock.sendPresenceUpdate('paused', from);
      await sock.sendMessage(from, { text: '❌ Sorry, I encountered an error processing your request.' }, { quoted: message });
      console.error('❌ AI Query Error:', error.message);
    }
  }

  /**
   * Send help message
   */
  async sendHelpMessage(sock, from) {
    const help = `
🤖 *Forty-Six Bot Help*

*Commands:*
${this.config.prefixCommands}help - Show this help message
${this.config.prefixCommands}ping - Check if bot is alive
${this.config.prefixCommands}models - List available AI models
${this.config.prefixCommands}config - Show current configuration
${this.config.prefixCommands}clear - Clear conversation history

*AI Queries:*
${this.config.prefixQueriesEnabled ? `Use prefix "${this.config.prefixQueries}" for AI queries` : 'Just send any message for AI response'}

*Settings:*
• AI in Groups: ${this.config.aiInGroups ? '✅' : '❌'}
• AI in DMs: ${this.config.aiInDM ? '✅' : '❌'}
• Model: ${this.config.aiModel}

Made with ❤️ using Forty-Six
    `.trim();

    await sock.sendMessage(from, { text: help });
  }

  /**
   * Get configuration info
   */
  getConfigInfo() {
    return `
⚙️ *Current Configuration*

*Prefixes:*
• Commands: ${this.config.prefixCommands}
• Queries: ${this.config.prefixQueriesEnabled ? this.config.prefixQueries : 'Not required'}

*AI Settings:*
• Model: ${this.config.aiModel}
• Groups: ${this.config.aiInGroups ? '✅ Enabled' : '❌ Disabled'}
• DMs: ${this.config.aiInDM ? '✅ Enabled' : '❌ Disabled'}
• Self Only: ${this.config.aiSelfOnly ? '✅ Enabled' : '❌ Disabled'}

*Query Prefix:*
• Enabled: ${this.config.prefixQueriesEnabled ? '✅ Yes' : '❌ No'}
    `.trim();
  }
}

module.exports = { MessageHandler };
