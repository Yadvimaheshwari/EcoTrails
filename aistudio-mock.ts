// Mock for Google AI Studio API when running locally
declare global {
  interface Window {
    aistudio?: {
      hasSelectedApiKey: () => Promise<boolean>;
      openSelectKey: () => Promise<void>;
    };
  }
}

// Initialize mock if window.aistudio doesn't exist
if (typeof window !== 'undefined' && !window.aistudio) {
  try {
    // Vite exposes env vars prefixed with VITE_ to import.meta.env
    const apiKey = (import.meta.env && (import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY)) || null;
    
    window.aistudio = {
      hasSelectedApiKey: async () => {
        try {
          // Check if API key exists in environment or localStorage
          if (apiKey) {
            return true;
          }
          const storedKey = localStorage.getItem('gemini_api_key');
          return !!storedKey;
        } catch (error) {
          console.error('Error in hasSelectedApiKey:', error);
          return false;
        }
      },
      openSelectKey: async () => {
        try {
          // For local development, prompt for API key
          const key = prompt('Enter your Gemini API Key:');
          if (key) {
            localStorage.setItem('gemini_api_key', key);
            window.location.reload();
          }
        } catch (error) {
          console.error('Error in openSelectKey:', error);
        }
      }
    };
  } catch (error) {
    console.error('Error initializing aistudio mock:', error);
    // Provide a minimal fallback
    window.aistudio = {
      hasSelectedApiKey: async () => {
        const storedKey = localStorage.getItem('gemini_api_key');
        return !!storedKey;
      },
      openSelectKey: async () => {
        const key = prompt('Enter your Gemini API Key:');
        if (key) {
          localStorage.setItem('gemini_api_key', key);
          window.location.reload();
        }
      }
    };
  }
}

export {};
