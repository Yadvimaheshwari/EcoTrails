/**
 * Gemini AI Companion Service
 * Intelligent hiking companion that knows everything about nature, parks, and hiking
 */
import { API_BASE_URL } from '../config/api';
import axios from 'axios';

export interface CompanionMessage {
  id: string;
  type: 'insight' | 'suggestion' | 'alert' | 'educational' | 'conversation';
  content: string;
  timestamp: number;
  priority?: 'low' | 'medium' | 'high';
  category?: 'wildlife' | 'geology' | 'botany' | 'safety' | 'trail' | 'weather' | 'history';
  location?: { lat: number; lng: number };
  metadata?: any;
}

export interface CompanionContext {
  parkName: string;
  parkType?: string;
  location?: { lat: number; lng: number };
  weather?: any;
  timeOfDay?: string;
  season?: string;
  elevation?: number;
  trailConditions?: string;
  recentObservations?: any[];
}

class GeminiCompanionService {
  private apiBaseUrl: string;
  private conversationHistory: CompanionMessage[] = [];
  private context: CompanionContext | null = null;

  constructor(apiBaseUrl: string = API_BASE_URL) {
    this.apiBaseUrl = apiBaseUrl;
  }

  /**
   * Set context for the companion (park, location, conditions)
   */
  setContext(context: CompanionContext): void {
    this.context = context;
  }

  /**
   * Get real-time intelligent observation about current surroundings
   */
  async getRealTimeInsight(
    observation: string,
    location?: { lat: number; lng: number },
    imageBase64?: string
  ): Promise<CompanionMessage> {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/api/v1/companion/insight`,
        {
          observation,
          location: location || this.context?.location,
          image: imageBase64,
          context: this.context,
        }
      );

      const message: CompanionMessage = {
        id: `insight-${Date.now()}`,
        type: 'insight',
        content: response.data.insight,
        timestamp: Date.now(),
        priority: response.data.priority || 'medium',
        category: response.data.category,
        location: location || this.context?.location,
        metadata: response.data.metadata,
      };

      this.conversationHistory.push(message);
      return message;
    } catch (error: any) {
      console.error('Error getting insight:', error);
      // Fallback to local analysis
      return this.generateLocalInsight(observation, location);
    }
  }

  /**
   * Get proactive suggestions based on current context
   */
  async getProactiveSuggestion(): Promise<CompanionMessage | null> {
    if (!this.context) return null;

    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/api/v1/companion/suggest`,
        {
          context: this.context,
          conversationHistory: this.conversationHistory.slice(-5), // Last 5 messages
        }
      );

      if (response.data.suggestion) {
        const message: CompanionMessage = {
          id: `suggestion-${Date.now()}`,
          type: 'suggestion',
          content: response.data.suggestion,
          timestamp: Date.now(),
          priority: response.data.priority || 'low',
          category: response.data.category,
          location: this.context.location,
        };

        this.conversationHistory.push(message);
        return message;
      }
    } catch (error: any) {
      console.error('Error getting suggestion:', error);
    }

    return null;
  }

  /**
   * Ask the companion a question
   */
  async askQuestion(question: string): Promise<CompanionMessage> {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/api/v1/companion/ask`,
        {
          question,
          context: this.context,
          conversationHistory: this.conversationHistory.slice(-10), // Last 10 messages
        }
      );

      const message: CompanionMessage = {
        id: `conversation-${Date.now()}`,
        type: 'conversation',
        content: response.data.answer,
        timestamp: Date.now(),
        priority: 'medium',
      };

      this.conversationHistory.push(message);
      return message;
    } catch (error: any) {
      console.error('Error asking question:', error);
      return {
        id: `error-${Date.now()}`,
        type: 'conversation',
        content: "I'm having trouble connecting right now. Let me try to help based on what I know about this area...",
        timestamp: Date.now(),
        priority: 'low',
      };
    }
  }

  /**
   * Get educational information about something observed
   */
  async getEducationalInfo(topic: string, category?: string): Promise<CompanionMessage> {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/api/v1/companion/educate`,
        {
          topic,
          category: category || 'general',
          context: this.context,
        }
      );

      const message: CompanionMessage = {
        id: `educational-${Date.now()}`,
        type: 'educational',
        content: response.data.info,
        timestamp: Date.now(),
        priority: 'low',
        category: category as any,
      };

      this.conversationHistory.push(message);
      return message;
    } catch (error: any) {
      console.error('Error getting educational info:', error);
      return {
        id: `error-${Date.now()}`,
        type: 'educational',
        content: `I'd love to tell you more about ${topic}, but I'm having trouble connecting right now.`,
        timestamp: Date.now(),
        priority: 'low',
      };
    }
  }

  /**
   * Get safety alert based on conditions
   */
  async checkSafetyConditions(): Promise<CompanionMessage | null> {
    if (!this.context) return null;

    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/api/v1/companion/safety`,
        {
          context: this.context,
        }
      );

      if (response.data.alert) {
        const message: CompanionMessage = {
          id: `alert-${Date.now()}`,
          type: 'alert',
          content: response.data.alert,
          timestamp: Date.now(),
          priority: response.data.priority || 'high',
          category: 'safety',
        };

        this.conversationHistory.push(message);
        return message;
      }
    } catch (error: any) {
      console.error('Error checking safety:', error);
    }

    return null;
  }

  /**
   * Get park-specific information
   */
  async getParkInfo(parkName: string): Promise<string> {
    try {
      const response = await axios.post(
        `${this.apiBaseUrl}/api/v1/companion/park-info`,
        {
          parkName,
        }
      );

      return response.data.info;
    } catch (error: any) {
      console.error('Error getting park info:', error);
      return `Welcome to ${parkName}! I'm here to help you explore and understand this beautiful place.`;
    }
  }

  /**
   * Generate local insight when API is unavailable (fallback)
   */
  private generateLocalInsight(
    observation: string,
    location?: { lat: number; lng: number }
  ): CompanionMessage {
    // Simple fallback - in production, this could use a local model or cached responses
    return {
      id: `local-${Date.now()}`,
      type: 'insight',
      content: `I notice ${observation}. This is interesting! Let me learn more about this area to give you better insights.`,
      timestamp: Date.now(),
      priority: 'medium',
      location,
    };
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get conversation history
   */
  getHistory(): CompanionMessage[] {
    return this.conversationHistory;
  }
}

export default new GeminiCompanionService();
