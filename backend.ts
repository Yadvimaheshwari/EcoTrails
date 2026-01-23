
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
    goal: "Infer environmental characteristics from visual data without identifying objects or people. Reason across time, not single images.",
    backstory: "A rigorous field researcher specialized in subtle ecological shifts and visual patterns.",
    model: "gemini-3-pro-preview",
    tools: []
  },
  Listener: {
    name: "Listener",
    role: "Acoustic Specialist",
    goal: "Analyze environmental soundscapes. Differentiate between environmental signals and sensor noise.",
    backstory: "A bioacoustics expert with a highly tuned ear.",
    model: "gemini-2.5-flash-native-audio-preview-12-2025",
    tools: []
  },
  Spatial: {
    name: "Spatial",
    role: "Spatial Grounding Specialist",
    goal: "Ground observed trail features in real-world map data and geographic context.",
    backstory: "A master cartographer who verifies landmarks and terrain features against global data.",
    model: "gemini-2.5-flash",
    tools: [{ googleMaps: {} }]
  },
  Historian: {
    name: "Historian",
    role: "Temporal Specialist",
    goal: "Detect environmental changes. Distinguish between seasonal flux and true terrain shifts.",
    backstory: "A steward of temporal change, sensitive to historical records.",
    model: "gemini-3-pro-preview",
    tools: []
  },
  Synthesizer: {
    name: "Synthesizer",
    role: "Reasoning Specialist",
    goal: "Synthesize hiking data into human-centric trail insights using reasoning over all collected data.",
    backstory: "A veteran trail guide with deep analytical reasoning capabilities.",
    model: "gemini-3-pro-preview",
    tools: []
  },
  Auditor: {
    name: "Auditor",
    role: "Verification Specialist",
    goal: "Verify signals for scientific consistency. Flag any speculation presented as fact.",
    backstory: "A meticulous data scientist focused on ensuring truth.",
    model: "gemini-3-flash-preview",
    tools: []
  },
  Bard: {
    name: "Bard",
    role: "Narrative Architect",
    goal: "Translate insights into a warm narrative while gracefully acknowledging the unknowns of nature.",
    backstory: "A nature storyteller who uses warm, non-technical language.",
    model: "gemini-3-pro-preview",
    tools: []
  },
  Illustrator: {
    name: "Illustrator",
    role: "Visual Artist",
    goal: "Generate field sketches. Capture the visual essence of the verified signals.",
    backstory: "A naturalist sketch artist with a focus on terrain and biodiversity.",
    model: "gemini-2.5-flash-image",
    tools: []
  }
};

// --- SCHEMAS ---
const UncertaintySchema = {
  confidence: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
  uncertainty_explanation: { type: Type.STRING },
  improvement_suggestion: { type: Type.STRING }
};

export const Schemas = {
  Perception: {
    type: Type.OBJECT,
    properties: {
      ...UncertaintySchema,
      visual_patterns: { type: Type.ARRAY, items: { type: Type.STRING } },
      temporal_changes: { type: Type.ARRAY, items: { type: Type.STRING } },
      inferences: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            inference: { type: Type.STRING },
            confidence: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] }
          }
        }
      },
      vegetation_density_profile: { type: Type.STRING },
      soil_exposure_profile: { type: Type.STRING },
      moisture_indicators: { type: Type.ARRAY, items: { type: Type.STRING } },
      visibility_assessment: { type: Type.STRING }
    },
    required: ["visual_patterns", "temporal_changes", "inferences", "confidence", "uncertainty_explanation", "improvement_suggestion"]
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
      consistent: { type: Type.STRING },
      different: { type: Type.STRING },
      changing: { type: Type.STRING },
      uncertain: { type: Type.STRING }
    },
    required: ["consistent", "different", "changing", "uncertain"]
  }
};

export class EcoAtlasCrew {
  constructor(private records: EnvironmentalRecord[]) {}

  async executeTask(
    agentName: string, 
    input: any, 
    schema: any, 
    instruction: string, 
    media?: { base64: string; mimeType: string }[],
    location?: { latitude: number, longitude: number }
  ) {
    const ai = getAIClient();
    const agent = Agents[agentName];

    if (agent.model.includes('image')) {
      const response = await ai.models.generateContent({
        model: agent.model,
        contents: {
          parts: [{ text: `${instruction}. Context: ${JSON.stringify(input)}` }]
        },
        config: { imageConfig: { aspectRatio: "16:9" } }
      });
      let imageUrl = '';
      for (const part of response.candidates?.[0].content.parts || []) {
        if (part.inlineData) { imageUrl = `data:image/png;base64,${part.inlineData.data}`; break; }
      }
      return { output: imageUrl };
    }

    const parts: any[] = [
      { text: `${instruction}\n\nTask Context: ${JSON.stringify(input)}\n\nPast Environmental History: ${JSON.stringify(this.historyContext())}` }
    ];
    if (media && media.length > 0) {
      media.forEach(m => {
        parts.unshift({ inlineData: { data: m.base64, mimeType: m.mimeType } });
      });
    }

    const config: any = {
      systemInstruction: `You are the ${agent.role}. Goal: ${agent.goal}. Backstory: ${agent.backstory}.`,
      thinkingConfig: agent.model.includes('pro') ? { thinkingBudget: 24576 } : undefined
    };

    if (agent.tools && agent.tools.length > 0) {
      config.tools = agent.tools;
      if (location) {
        config.toolConfig = {
          retrievalConfig: { latLng: location }
        };
      }
    } else if (schema) {
      config.responseMimeType = "application/json";
      config.responseSchema = schema;
    }

    const response = await ai.models.generateContent({
      model: agent.model,
      contents: { parts },
      config
    });

    if (agent.name === 'Spatial') {
      return { 
        output: { 
          text: response.text || '', 
          sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] 
        } 
      };
    }

    const output = schema ? JSON.parse(response.text || '{}') : response.text;
    return { output };
  }

  private historyContext() {
    return this.records.map(r => ({
      date: new Date(r.timestamp).toLocaleDateString(),
      location: r.park_name,
      summary: r.summary
    }));
  }
}
