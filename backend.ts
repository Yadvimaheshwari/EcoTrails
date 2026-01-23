import { GoogleGenAI, Type } from "@google/genai";
import { 
  AgentDefinition, 
  EnvironmentalRecord
} from "./types";

/**
 * ECOATLAS BACKEND CORE
 * Implements a modular multi-agent orchestration layer.
 */

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

// --- AGENT DEFINITIONS ---
export const Agents: Record<string, AgentDefinition> = {
  Ingestor: {
    name: "Ingestor",
    role: "Media Ingestion Specialist",
    goal: "Sanitize and validate raw multimodal feeds for privacy and quality.",
    backstory: "A vigilant guard of privacy and technical clarity.",
    model: "gemini-3-flash-preview",
    tools: []
  },
  Observer: {
    name: "Observer",
    role: "Perception Specialist",
    goal: "Extract clean environmental signals. Clearly label confidence and explain any sensory limitations.",
    backstory: "A rigorous field researcher who values accuracy over speculation. You never guess; if a signal is blurry, you label it Low confidence.",
    model: "gemini-3-pro-preview",
    tools: []
  },
  Listener: {
    name: "Listener",
    role: "Acoustic Specialist",
    goal: "Analyze environmental soundscapes. Differentiate between environmental signals and sensor noise.",
    backstory: "A bioacoustics expert. You are highly skeptical of distant sounds and always qualify your findings based on recording quality.",
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    tools: []
  },
  Historian: {
    name: "Historian",
    role: "Temporal Specialist",
    goal: "Detect environmental changes. Distinguish between seasonal flux and true terrain shifts.",
    backstory: "A steward of temporal change. You understand that nature is variable and always express the uncertainty of small-sample comparisons.",
    model: "gemini-3-pro-preview",
    tools: []
  },
  Synthesizer: {
    name: "Synthesizer",
    role: "Experience Analyst",
    goal: "Synthesize hiking data into human-centric insights. Be transparent about the limitations of wearable-only proxy data.",
    backstory: "A veteran trail guide. You know that 'difficulty' is subjective and always frame your insights with the appropriate level of certainty.",
    model: "gemini-3-pro-preview",
    tools: []
  },
  Auditor: {
    name: "Auditor",
    role: "Verification Specialist",
    goal: "Verify signals for scientific consistency. Flag any speculation presented as fact.",
    backstory: "A meticulous data scientist. Your job is to find the weak links in the interpretation chain and force transparency.",
    model: "gemini-3-flash-preview",
    tools: []
  },
  Bard: {
    name: "Bard",
    role: "Narrative Architect",
    goal: "Translate insights into a warm narrative while gracefully acknowledging the unknowns of nature.",
    backstory: "A nature storyteller. You use reflective language to describe what we think we see, without losing the mystery of the landscape.",
    model: "gemini-3-pro-preview",
    tools: []
  },
  Illustrator: {
    name: "Illustrator",
    role: "Visual Artist",
    goal: "Generate field sketches. Use visual styles that reflect the certainty of the data (e.g., cleaner lines for high confidence).",
    backstory: "A naturalist sketch artist. You prioritize the essence of the trail over perfect realism.",
    model: "gemini-2.5-flash-image",
    tools: []
  }
};

// --- SCHEMAS ---
const UncertaintySchema = {
  confidence: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
  uncertainty_explanation: { type: Type.STRING, description: "Detailed reason why confidence is limited (e.g., low light, wind noise, lack of baseline data)." },
  improvement_suggestion: { type: Type.STRING, description: "Specific data needed to increase certainty in the future (e.g., 'Take a photo of this spot in direct midday sun')." }
};

export const Schemas = {
  Perception: {
    type: Type.OBJECT,
    properties: {
      ...UncertaintySchema,
      environmental_signals: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            type: { type: Type.STRING },
            value: { type: Type.STRING },
            observation: { type: Type.STRING }
          }
        }
      },
      patterns: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["environmental_signals", "patterns", "confidence", "uncertainty_explanation", "improvement_suggestion"]
  },
  Acoustic: {
    type: Type.OBJECT,
    properties: {
      ...UncertaintySchema,
      soundscape_summary: { type: Type.STRING },
      activity_levels: {
        type: Type.OBJECT,
        properties: {
          birds: { type: Type.STRING },
          insects: { type: Type.STRING },
          water: { type: Type.STRING },
          wind: { type: Type.STRING },
          human_noise: { type: Type.STRING }
        }
      },
      notable_changes: { type: Type.STRING }
    },
    required: ["soundscape_summary", "activity_levels", "notable_changes", "confidence", "uncertainty_explanation", "improvement_suggestion"]
  },
  Temporal: {
    type: Type.OBJECT,
    properties: {
      ...UncertaintySchema,
      detected_changes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            feature: { type: Type.STRING },
            description: { type: Type.STRING },
            magnitude: { type: Type.STRING },
            confidence: { type: Type.NUMBER }
          }
        }
      },
      seasonal_alignment: { type: Type.STRING },
      historical_comparison_summary: { type: Type.STRING }
    },
    required: ["detected_changes", "seasonal_alignment", "historical_comparison_summary", "confidence", "uncertainty_explanation", "improvement_suggestion"]
  },
  Synthesis: {
    type: Type.OBJECT,
    properties: {
      ...UncertaintySchema,
      trail_difficulty_perception: { type: Type.STRING },
      fatigue_zones: { type: Type.ARRAY, items: { type: Type.STRING } },
      exposure_stress: {
        type: Type.OBJECT,
        properties: {
          level: { type: Type.STRING },
          factors: { type: Type.ARRAY, items: { type: Type.STRING } }
        }
      },
      accessibility_notes: { type: Type.STRING },
      beginner_tips: { type: Type.ARRAY, items: { type: Type.STRING } },
      safety_observations: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["trail_difficulty_perception", "fatigue_zones", "exposure_stress", "accessibility_notes", "beginner_tips", "safety_observations", "confidence", "uncertainty_explanation", "improvement_suggestion"]
  },
  Verification: {
    type: Type.OBJECT,
    properties: {
      verified: { type: Type.BOOLEAN },
      notes: { type: Type.STRING },
      unresolved_questions: { type: Type.ARRAY, items: { type: Type.STRING } }
    },
    required: ["verified", "notes", "unresolved_questions"]
  },
  Narration: {
    type: Type.OBJECT,
    properties: {
      overview: { type: Type.STRING, description: "Overview of the walk and atmosphere." },
      revelations: { type: Type.STRING, description: "What the environment revealed today." },
      changes: { type: Type.STRING, description: "What changed since the last visit." },
      future_notes: { type: Type.STRING, description: "What the hiker should notice next time." }
    },
    required: ["overview", "revelations", "changes", "future_notes"]
  }
};

/**
 * Orchestrates multiple agents to perform environmental analysis tasks.
 */
export class EcoAtlasCrew {
  constructor(private records: EnvironmentalRecord[]) {}

  async executeTask(
    agentName: string, 
    input: any, 
    schema: any, 
    instruction: string, 
    media?: { base64: string; mimeType: string }
  ) {
    const ai = getAIClient();
    const agent = Agents[agentName];

    if (agent.model.includes('image')) {
      const response = await ai.models.generateContent({
        model: agent.model,
        contents: {
          parts: [{ text: `${instruction}. Context: ${JSON.stringify(input)}` }]
        },
        config: { imageConfig: { aspectRatio: "1:1" } }
      });
      let imageUrl = '';
      for (const part of response.candidates?.[0].content.parts || []) {
        if (part.inlineData) { imageUrl = `data:image/png;base64,${part.inlineData.data}`; break; }
      }
      return { output: imageUrl };
    }

    const parts: any[] = [
      { text: `${instruction}\n\nTask Context: ${JSON.stringify(input)}\n\nPast Environmental History: ${JSON.stringify(this.records)}` }
    ];
    if (media) { parts.unshift({ inlineData: { data: media.base64, mimeType: media.mimeType } }); }

    const response = await ai.models.generateContent({
      model: agent.model,
      contents: { parts },
      config: {
        systemInstruction: `You are the ${agent.role}. Goal: ${agent.goal}. Backstory: ${agent.backstory}. 
        CRITICAL RULES:
        1. Always express uncertainty clearly.
        2. Never state speculation as fact.
        3. If evidence is weak, use qualifying language (e.g., 'appears to be', 'suggests', 'might indicate').
        4. Always provide an explanation for confidence levels below High.
        5. Always suggest what future data would provide higher certainty.`,
        responseMimeType: schema ? "application/json" : "text/plain",
        responseSchema: schema || undefined,
        thinkingConfig: agent.model.includes('pro') ? { thinkingBudget: 32768 } : undefined
      }
    });

    const output = schema ? JSON.parse(response.text || '{}') : response.text;
    return { output };
  }
}