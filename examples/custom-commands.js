/**
 * Example: AI Bot with Custom Commands
 */

require('dotenv').config();
const { createBot } = require('forty-six');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const conversations = new Map();

const systemPrompt = `You are a helpful assistant on WhatsApp.
Be concise, friendly, and use emojis occasionally.
Keep responses under 3 sentences.`;

createBot({
  session: 'session',
  prefix: '!',
  logo: 'logo2.png',
  
  onMessage: async (msg, sock) => {
    // Handle commands
    if (msg.isCommand) {
      switch (msg.command) {
        case 'ping':
          await sock.sendMessage(msg.from, { text: 'pong 🏓' });
          break;
          
        case 'help':
          await sock.sendMessage(msg.from, { 
            text: `📚 *Commands:*\n\n!ping - Test\n!help - This message\n!clear - Clear history\n\nOr just chat - I'll respond! 💬` 
          });
          break;
          
        case 'clear':
          conversations.delete(msg.sender);
          await sock.sendMessage(msg.from, { text: '✨ Cleared!' });
          break;
      }
      return;
    }
    
    // Handle AI responses
    try {
      if (!conversations.has(msg.sender)) {
        conversations.set(msg.sender, [{ role: 'system', content: systemPrompt }]);
      }
      
      const history = conversations.get(msg.sender);
      history.push({ role: 'user', content: msg.body });
      
      if (history.length > 21) history.splice(1, 2);
      
      const completion = await groq.chat.completions.create({
        messages: history,
        model: 'llama-3.3-70b-versatile',
        temperature: 0.7,
        max_tokens: 500,
      });
      
      const response = completion.choices[0].message.content;
      history.push({ role: 'assistant', content: response });
      
      await sock.sendMessage(msg.from, { text: response });
    } catch (err) {
      console.error('Error:', err.message);
      await sock.sendMessage(msg.from, { text: 'Sorry, error! Try again 🙏' });
    }
  }
});
