import fs from 'fs';

/**
 * Groq AI Handler
 * Handles all AI-related operations Using Groq API
 */
export class GroqAI {
  constructor(apiKey, model = 'llama-3.3-70b-versatile') {
    this.apiKey = apiKey;
    this.model = model;
    this.baseURL = 'https://api.groq.com/openai/v1/chat/completions';
    this.systemPrompt = this.loadSystemPrompt();
  }

  /**
   * Load system prompt from prompt.txt file
   */
  loadSystemPrompt() {
    try {
      return fs.readFileSync('prompt.txt', 'utf-8').trim();
    } catch (error) {
      console.warn('⚠️  prompt.txt not found, using default prompt');
      return 'You are a helpful WhatsApp AI assistant. Be concise and friendly.';
    }
  }

  /**
   * Send a message to Groq AI and get response
   */
  async chat(userMessage, conversationHistory = []) {
    try {
      const messages = [
        { role: 'system', content: this.systemPrompt },
        ...conversationHistory,
        { role: 'user', content: userMessage }
      ];

      const response = await fetch(this.baseURL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          model: this.model,
          messages: messages,
          temperature: 0.7,
          max_tokens: 1024
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Groq API Error: ${error.error?.message || response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0]?.message?.content || 'No response from AI';
    } catch (error) {
      console.error('❌ Groq AI Error:', error.message);
      return `Sorry, I encountered an error: ${error.message}`;
    }
  }

  /**
   * Get list of available models
   */
  static getAvailableModels() {
    return [
      'llama-3.3-70b-versatile',
      'llama-3.1-70b-versatile',
      'llama-3.1-8b-instant',
      'mixtral-8x7b-32768',
      'gemma2-9b-it',
      'llama3-70b-8192',
      'llama3-8b-8192'
    ];
  }
}

export default GroqAI;
