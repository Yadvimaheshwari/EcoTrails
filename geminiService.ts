
import { GoogleGenAI, Type } from "@google/genai";
import { MediaPacket, MediaSegment, VisualArtifact, EnvironmentalRecord, TemporalChangeResult, AcousticResult } from "./types";

const getAIClient = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

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
          { text: "Validate media for EcoAtlas. Rule 1: NO HUMANS/FACES (Privacy). Rule 2: MUST BE CLEAR/NOT BLURRY (Quality). Output JSON." }
        ]
      },
      config: {
        systemInstruction: "You are the EcoAtlas Media Ingestion Agent. Discard any media containing people, faces, or identifying personal items. Assess quality. Output JSON format: { is_safe: boolean, quality_score: number, reason: string }",
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
    status: validatedSegments.length > 0 ? (discarded > 0 ? 'partial' : 'validated') : 'rejected'
  };
};

/**
 * The Listener Agent: Analyzes environmental soundscapes.
 */
export const runAcousticAgent = async (
  audioBase64: string, 
  mimeType: string, 
  history: EnvironmentalRecord[]
): Promise<AcousticResult> => {
  const ai = getAIClient();
  const historyContext = history.map(h => ({
    date: new Date(h.timestamp).toLocaleDateString(),
    acoustic: h.acoustic_profile?.soundscape_summary
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-native-audio-preview-12-2025',
    contents: {
      parts: [
        { inlineData: { mimeType, data: audioBase64 } },
        { text: `Analyze the ambient soundscape in this recording. Compare it to past baseline records: ${JSON.stringify(historyContext)}. 
        Identify bird activity, insects, water presence (trickle vs flow), wind, and human noise intrusion.` }
      ]
    },
    config: {
      systemInstruction: "You are the EcoAtlas Acoustic Agent (The Listener). You specialize in environmental bioacoustics. Detect ecological signals from audio. Output JSON format.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          soundscape_summary: { type: Type.STRING },
          activity_levels: {
            type: Type.OBJECT,
            properties: {
              birds: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
              insects: { type: Type.STRING, enum: ['Low', 'Medium', 'High'] },
              water: { type: Type.STRING, enum: ['None', 'Trickle', 'Flowing', 'Rushing'] },
              wind: { type: Type.STRING, enum: ['Still', 'Breeze', 'Strong'] },
              human_noise: { type: Type.STRING, enum: ['None', 'Distant', 'Intrusive'] }
            },
            required: ['birds', 'insects', 'water', 'wind', 'human_noise']
          },
          notable_changes: { type: Type.STRING },
          confidence: { type: Type.NUMBER }
        },
        required: ["soundscape_summary", "activity_levels", "notable_changes", "confidence"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as AcousticResult;
};

/**
 * The Historian Agent: Analyzes changes across time.
 */
export const runTemporalChangeAgent = async (
  currentBase64: string, 
  mimeType: string, 
  history: EnvironmentalRecord[]
): Promise<TemporalChangeResult> => {
  const ai = getAIClient();
  const historyContext = history.map(h => ({
    date: new Date(h.timestamp).toLocaleDateString(),
    summary: h.summary,
    tags: h.tags
  }));

  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-preview',
    contents: {
      parts: [
        { inlineData: { mimeType, data: currentBase64 } },
        { text: `Compare this current visual state with history: ${JSON.stringify(historyContext)}. 
        Focus on: Vegetation density, Soil exposure, Trail stability, Water presence, Seasonal baseline vs actual state.` }
      ]
    },
    config: {
      systemInstruction: "You are the EcoAtlas Temporal Change Agent (The Historian). Expert at detecting subtle environmental shifts over months and years. Output JSON.",
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          detected_changes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                feature: { type: Type.STRING, enum: ['Vegetation', 'Soil', 'Trail', 'Water', 'Atmosphere'] },
                description: { type: Type.STRING },
                magnitude: { type: Type.STRING, enum: ['Minimal', 'Moderate', 'Significant'] },
                confidence: { type: Type.NUMBER }
              },
              required: ["feature", "description", "magnitude", "confidence"]
            }
          },
          seasonal_alignment: { type: Type.STRING },
          historical_comparison_summary: { type: Type.STRING },
          uncertainty_explanation: { type: Type.STRING }
        },
        required: ["detected_changes", "seasonal_alignment", "historical_comparison_summary", "uncertainty_explanation"]
      }
    }
  });

  return JSON.parse(response.text || '{}') as TemporalChangeResult;
};

export const mapGrounding = async (query: string): Promise<{text: string, sources: any[]}> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.5-flash-lite-latest",
    contents: query,
    config: { tools: [{ googleMaps: {} }] },
  });
  return { text: response.text || '', sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
};

export const searchGrounding = async (query: string): Promise<{text: string, sources: any[]}> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: query,
    config: { tools: [{ googleSearch: {} }] },
  });
  return { text: response.text || '', sources: response.candidates?.[0]?.groundingMetadata?.groundingChunks || [] };
};

export const generateVisualArtifact = async (type: string, prompt: string): Promise<VisualArtifact> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash-image',
    contents: { parts: [{ text: `Generate a high-detail ${type} representing: ${prompt}` }] },
    config: { imageConfig: { aspectRatio: "1:1" } }
  });
  let imageUrl = '';
  for (const part of response.candidates?.[0].content.parts || []) {
    if (part.inlineData) { imageUrl = `data:image/png;base64,${part.inlineData.data}`; break; }
  }
  return { url: imageUrl, title: type.replace('_', ' ').toUpperCase(), description: `AI-synthesized ${type} based on live grounding data.` };
};

export const generateVideo = async (prompt: string, base64Image?: string, aspectRatio: '16:9' | '9:16' = '16:9'): Promise<string> => {
  const ai = getAIClient();
  const payload: any = { model: 'veo-3.1-fast-generate-preview', prompt: prompt, config: { numberOfVideos: 1, resolution: '720p', aspectRatio: aspectRatio } };
  if (base64Image) { payload.image = { imageBytes: base64Image, mimeType: 'image/png' }; }
  let operation = await ai.models.generateVideos(payload);
  while (!operation.done) { await new Promise(resolve => setTimeout(resolve, 10000)); operation = await ai.operations.getVideosOperation({ operation: operation }); }
  const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
  const videoResponse = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
  const blob = await videoResponse.blob();
  return URL.createObjectURL(blob);
};

export const generateImage = async (prompt: string, aspectRatio: string, imageSize: "1K" | "2K" | "4K"): Promise<string> => {
  const ai = getAIClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3-pro-image-preview',
    contents: { parts: [{ text: prompt }] },
    config: { imageConfig: { aspectRatio: aspectRatio as any, imageSize: imageSize } },
  });
  let imageUrl = '';
  for (const part of response.candidates?.[0].content.parts || []) {
    if (part.inlineData) { imageUrl = `data:image/png;base64,${part.inlineData.data}`; break; }
  }
  return imageUrl;
};
