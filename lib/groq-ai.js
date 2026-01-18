/**
 * Groq AI Helper
 * Simple wrapper for Groq API
 */

const Groq = require('groq-sdk');

class GroqAI {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Groq API key required. Get one at: https://console.groq.com/keys');
    }
    
    this.groq = new Groq({ apiKey });
    this.conversations = new Map();
    this.maxHistory = 10;
  }

  async chat(userId, message, systemPrompt = '', model = 'llama-3.3-70b-versatile') {
    try {
      if (!this.conversations.has(userId)) {
        this.conversations.set(userId, []);
      }

      const history = this.conversations.get(userId);
      const messages = [];

      if (systemPrompt) {
        messages.push({ role: 'system', content: systemPrompt });
      }

      messages.push(...history);
      messages.push({ role: 'user', content: message });

      const completion = await this.groq.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      });

      const response = completion.choices[0]?.message?.content || 'Sorry, no response generated.';

      history.push(
        { role: 'user', content: message },
        { role: 'assistant', content: response }
      );

      if (history.length > this.maxHistory * 2) {
        history.splice(0, 2);
      }

      return response;

    } catch (err) {
      console.error('Groq API error:', err.message);
      
      if (err.message.includes('API key')) {
        return '❌ Invalid Groq API key. Check your .env file.\n\nGet key at: https://console.groq.com/keys';
      }
      
      return 'Sorry, I encountered an error. Please try again.';
    }
  }

  clearHistory(userId) {
    this.conversations.delete(userId);
  }

  static getAvailableModels() {
    return [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
    ];
  }
}

module.exports = GroqAI;
