/**
 * Groq AI Helper for Forty Six
 * Simple wrapper around Groq API
 */

const Groq = require('groq-sdk');

class GroqAI {
  constructor(apiKey) {
    if (!apiKey) {
      throw new Error('Groq API key is required. Get one at: https://console.groq.com/keys');
    }
    
    this.groq = new Groq({ apiKey });
    this.conversationHistory = new Map();
    this.maxHistoryLength = 10;
  }

  /**
   * Generate AI response
   * @param {string} userId - Unique user identifier
   * @param {string} userMessage - User's message
   * @param {string} systemPrompt - System prompt (optional)
   * @param {string} model - Groq model to use (default: llama-3.3-70b-versatile)
   * @returns {Promise<string>} AI response
   */
  async chat(userId, userMessage, systemPrompt = '', model = 'llama-3.3-70b-versatile') {
    try {
      // Get or create conversation history
      if (!this.conversationHistory.has(userId)) {
        this.conversationHistory.set(userId, []);
      }

      const history = this.conversationHistory.get(userId);

      // Build messages array
      const messages = [];

      // Add system prompt if provided
      if (systemPrompt) {
        messages.push({
          role: 'system',
          content: systemPrompt
        });
      }

      // Add conversation history
      messages.push(...history);

      // Add current user message
      messages.push({
        role: 'user',
        content: userMessage
      });

      // Call Groq API
      const completion = await this.groq.chat.completions.create({
        model,
        messages,
        temperature: 0.7,
        max_tokens: 1024,
      });

      const aiResponse = completion.choices[0]?.message?.content || 'Sorry, I could not generate a response.';

      // Update conversation history
      history.push(
        { role: 'user', content: userMessage },
        { role: 'assistant', content: aiResponse }
      );

      // Limit history length
      if (history.length > this.maxHistoryLength * 2) {
        history.splice(0, 2); // Remove oldest exchange
      }

      return aiResponse;

    } catch (err) {
      console.error('Groq API error:', err.message);
      
      if (err.message.includes('API key')) {
        return '❌ Invalid Groq API key. Please check your .env file.\n\nGet your API key at: https://console.groq.com/keys';
      }
      
      return 'Sorry, I encountered an error processing your request. Please try again.';
    }
  }

  /**
   * Clear conversation history for a user
   */
  clearHistory(userId) {
    this.conversationHistory.delete(userId);
  }

  /**
   * Get available Groq models
   */
  static getAvailableModels() {
    return [
      'llama-3.3-70b-versatile',  // Best overall (recommended)
      'llama-3.1-70b-versatile',  // Fast and capable
      'mixtral-8x7b-32768',       // Good for long context
      'gemma2-9b-it',             // Lightweight and fast
    ];
  }
}

module.exports = GroqAI;
