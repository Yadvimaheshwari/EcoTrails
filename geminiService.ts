
import { GoogleGenAI, Type } from "@google/genai";
import { MediaPacket, MediaSegment, VisualArtifact, EnvironmentalRecord, TrailBriefing, SensorData, InterfaceState } from "./types";

const ATLAS_SYSTEM_INSTRUCTION = `You are Atlas, a continuous environmental intelligence system. 
You do not behave like a chatbot. 
You observe incoming multimodal signals across time and space and maintain an evolving internal understanding of the environment. 
You speak calmly and clearly. You avoid technical language unless explicitly requested. 
You acknowledge uncertainty when present. You do not overwhelm the user. 
You act as a quiet companion that helps people understand the places they visit.`;

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const recommendInterfaceState = async (
  sensors: SensorData, 
  phase: 'active' | 'rest' | 'start' | 'end'
): Promise<{ state: InterfaceState, rationale: string }> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `TASK: Recommend interface state
INPUTS:
- user activity: ${phase}
- heart rate: ${sensors.heart_rate} bpm
- velocity: ${sensors.velocity} km/h
- climb rate: ${sensors.climb_rate} m/min
- cadence: ${sensors.cadence} steps/min
- session phase: ${phase}

GOAL:
Determine how much interface to display based on cognitive load.

OUTPUT OPTIONS:
- minimize interface (high effort, needs focus)
- show ambient indicators (steady pace, light observation)
- expand insights (rest phase, curiosity high)
- defer interaction (critical focus required)
- present summary (session end)

Return only recommended state and rationale.`,
    config: {
      systemInstruction: ATLAS_SYSTEM_INSTRUCTION,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          state: { 
            type: Type.STRING, 
            enum: ['minimize interface', 'show ambient indicators', 'expand insights', 'defer interaction', 'present summary'] 
          },
          rationale: { type: Type.STRING }
        },
        required: ["state", "rationale"]
      }
    }
  });

  return JSON.parse(response.text || '{"state": "show ambient indicators", "rationale": "Fallback state"}');
};

export const getParkBriefing = async (parkName: string): Promise<TrailBriefing> => {
  const ai = getAIClient();
  const now = new Date();
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: `TASK: Initialize environmental context
INPUTS:
- location name: ${parkName}
- GPS coordinates: (inferred from location)
- date and local time: ${now.toLocaleString()}
- current weather: (fetch latest)
- known alerts or closures: (check current status)

GOAL:
Create an environmental baseline for this location.

INSTRUCTIONS:
- Identify dominant terrain types.
- Infer ecological characteristics.
- Note seasonal context.
- Identify potential environmental constraints.
- Do not speculate beyond available data.

OUTPUT FORMAT:
- Location summary (2 sentences)
- Terrain profile (bullet points)
- Baseline environmental state (short paragraph)`,
    config: {
      systemInstruction: ATLAS_SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          park_name: { type: Type.STRING },
          location_summary: { type: Type.STRING, description: "Exactly 2 sentences." },
          terrain_profile: { type: Type.ARRAY, items: { type: Type.STRING }, description: "Bullet points of dominant terrain types." },
          environmental_baseline: { type: Type.STRING, description: "A short paragraph describing the baseline state." },
          difficulty: { type: Type.STRING },
          elevation_gain: { type: Type.STRING },
          length: { type: Type.STRING },
          recent_alerts: { type: Type.ARRAY, items: { type: Type.STRING } },
          weather_forecast: { type: Type.STRING }
        },
        required: ["park_name", "location_summary", "terrain_profile", "environmental_baseline", "difficulty", "elevation_gain", "length", "recent_alerts", "weather_forecast"]
      }
    }
  });

  const output = JSON.parse(response.text || '{}');
  return {
    ...output,
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const runMediaIngestionAgent = async (files: {base64: string, mimeType: string}[]): Promise<MediaPacket> => {
  const ai = getAIClient();
  const validatedSegments: MediaSegment[] = [];
  let discarded = 0;

  for (const file of files) {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: {
        parts: [
          { inlineData: { mimeType: file.mimeType, data: file.base64 } },
          { text: "Validate media for EcoAtlas. No faces, high quality only." }
        ]
      },
      config: {
        systemInstruction: ATLAS_SYSTEM_INSTRUCTION,
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            is_safe: { type: Type.BOOLEAN },
            quality_score: { type: Type.NUMBER },
            reason: { type: Type.STRING }
          },
          required: ["is_safe", "quality_score", "reason"]
        }
      }
    });

    const result = JSON.parse(response.text || '{}');
    if (result.is_safe && result.quality_score > 0.6) {
      validatedSegments.push({
        id: Math.random().toString(36).substr(2, 9),
        base64: file.base64,
        mimeType: file.mimeType,
        timestamp: Date.now(),
        quality_score: result.quality_score,
        is_privacy_safe: true,
        metadata: {}
      });
    } else {
      discarded++;
    }
  }

  return {
    sessionId: `hike_${Date.now()}`,
    segments: validatedSegments,
    discarded_count: discarded,
    status: validatedSegments.length > 0 ? 'validated' : 'rejected'
  };
};

export const mapGrounding = async (query: string): Promise<{text: string, sources: any[]}> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: query,
    config: {
      systemInstruction: ATLAS_SYSTEM_INSTRUCTION,
      tools: [{ googleMaps: {} }],
    },
  });
  return {
    text: response.text || '',
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const searchGrounding = async (query: string): Promise<{text: string, sources: any[]}> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: query,
    config: {
      systemInstruction: ATLAS_SYSTEM_INSTRUCTION,
      tools: [{ googleSearch: {} }],
    },
  });
  return {
    text: response.text || '',
    sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || []
  };
};

export const generateImage = async (prompt: string, aspectRatio: string = '1:1', imageSize: "1K" | "2K" | "4K" = '1K'): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: {
      parts: [{ text: prompt }]
    },
    config: {
      imageConfig: {
        aspectRatio: aspectRatio as any,
        imageSize: imageSize
      }
    }
  });
  
  for (const part of response.candidates?.[0]?.content?.parts || []) {
    if (part.inlineData) {
      return `data:image/png;base64,${part.inlineData.data}`;
    }
  }
  return '';
};

export const generateVisualArtifact = async (type: string, text: string): Promise<VisualArtifact> => {
  const url = await generateImage(`A professional field sketch of ${type} showing ${text}. Calm, grounded style.`, "1:1", "1K");
  return {
    url,
    title: type.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
    description: `Observations synthesized into visual artifact: ${text.substring(0, 100)}...`
  };
};

export const generateVideo = async (prompt: string, base64Image?: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string> => {
  const ai = getAIClient();
  const payload: any = { 
    model: 'veo-3.1-fast-generate-preview', 
    prompt: `A calm, realistic environmental simulation showing ${prompt}. Realistic lighting, no artificial effects.`, 
    config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio } 
  };
  if (base64Image) { payload.image = { imageBytes: base64Image, mimeType: 'image/png' }; }
  
  let operation = await ai.models.generateVideos(payload);
  while (!operation.done) { 
    await new Promise(resolve => setTimeout(resolve, 10000)); 
    operation = await ai.operations.getVideosOperation({ operation: operation }); 
  }
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};
