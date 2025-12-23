import { GoogleGenAI, Modality, Type } from "@google/genai";
import { Note, TranscriptSegment } from "../types";

const apiKey = process.env.API_KEY || '';

const ai = new GoogleGenAI({ apiKey });

/**
 * Extracts YouTube Video ID just for the purpose of search context.
 */
export const extractVideoId = (url: string): string | null => {
    const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
    const match = url.match(regExp);
    return (match && match[2].length === 11) ? match[2] : null;
};

/**
 * Generates a lesson by finding the transcript text.
 */
export const generateLesson = async (input: string): Promise<{ title: string, transcript: TranscriptSegment[] }> => {
  if (!apiKey) throw new Error("API Key is missing");

  // We still extract ID to help the search query be specific, but we don't return it for playback.
  const videoId = extractVideoId(input); 
  const query = videoId ? `transcript of youtube video ${videoId}` : input;

  const prompt = `
    Input: "${input}"

    YOUR GOAL: Extract the VERBATIM (exact) spoken transcript for this content.
    
    STRICT RULES:
    1. USE GOOGLE SEARCH to find the real transcript.
    2. Output the EXACT spoken content, sentence by sentence.
    3. **DO NOT TRANSLATE yet.** Leave 'textZh' as an empty string.
    4. Split long text into manageable sentences (approx 10-20 words max per segment) for better audio generation.

    Output JSON Format:
    {
      "title": "Video Title",
      "transcript": [
        { "id": 1, "textEn": "First sentence.", "textZh": "" },
        { "id": 2, "textEn": "Second sentence.", "textZh": "" }
      ]
    }
  `;

  const transcriptResponse = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }], 
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          transcript: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                id: { type: Type.INTEGER },
                textEn: { type: Type.STRING },
                textZh: { type: Type.STRING },
              },
              required: ["id", "textEn", "textZh"]
            }
          }
        },
        required: ["title", "transcript"]
      }
    }
  });

  const data = JSON.parse(transcriptResponse.text || "{}");
  // Map and add dummy times since we are generating our own audio timing
  const transcript: TranscriptSegment[] = (data.transcript || []).map((t: any, index: number) => ({
      ...t,
      startTime: index, // Virtual time
      endTime: index + 1
  }));
  const title: string = data.title || "Lesson Content";

  if (transcript.length === 0) {
    throw new Error("Could not find transcript content.");
  }

  return { title, transcript };
};

/**
 * Generates TTS audio for a single transcript segment.
 */
export const generateSegmentAudio = async (text: string): Promise<string> => {
    if (!apiKey) throw new Error("API Key is missing");

    const ttsResponse = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: {
                    prebuiltVoiceConfig: { voiceName: 'Zephyr' }, // Zephyr is good for general narration
                },
            },
        },
    });

    const audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!audioBase64) {
        throw new Error("Failed to generate audio segment");
    }
    return audioBase64;
};

/**
 * Batch translates the transcript in the background.
 */
export const translateTranscriptBatch = async (transcript: TranscriptSegment[]): Promise<TranscriptSegment[]> => {
  if (!apiKey || transcript.length === 0) return transcript;

  const simplifiedInput = transcript.map(t => ({ id: t.id, text: t.textEn }));
  
  const prompt = `
    You are a professional translator. 
    Translate the following English sentences to Chinese (Simplified).
    Return a JSON object with a property "translations" which is an array of objects: { "id": number, "textZh": "string" }.
    Ensure the IDs match the input.
    
    Input:
    ${JSON.stringify(simplifiedInput)}
  `;

  try {
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: prompt,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    translations: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                id: { type: Type.INTEGER },
                                textZh: { type: Type.STRING }
                            }
                        }
                    }
                }
            }
        }
      });

      const result = JSON.parse(response.text || "{}");
      const translations = result.translations || [];

      return transcript.map(segment => {
          const translation = translations.find((tr: any) => tr.id === segment.id);
          return { 
              ...segment, 
              textZh: translation ? translation.textZh : segment.textZh 
          };
      });
  } catch (e) {
      console.error("Batch translation failed", e);
      return transcript; 
  }
};

/**
 * Generates audio from the user's notes verbatim.
 */
export const generateAudioBlog = async (notes: Note[], voiceName: string = 'Kore'): Promise<{ audioBase64: string }> => {
  if (!apiKey) throw new Error("API Key is missing");

  const textToRead = notes.map((n, index) => {
    if (n.type === 'word') {
       return `Item ${index + 1}. ${n.original}. ${n.translation ? `Meaning: ${n.translation}` : ''}.`;
    } else {
       return `Item ${index + 1}. Sentence: ${n.original}. ${n.translation ? `Translation: ${n.translation}` : ''}.`;
    }
  }).join('\n\n');

  if (!textToRead) throw new Error("No notes to read");

  const ttsResponse = await ai.models.generateContent({
    model: "gemini-2.5-flash-preview-tts",
    contents: [{ parts: [{ text: textToRead }] }],
    config: {
      responseModalities: [Modality.AUDIO],
      speechConfig: {
        voiceConfig: {
          prebuiltVoiceConfig: { voiceName: voiceName }, 
        },
      },
    },
  });

  const audioBase64 = ttsResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;

  if (!audioBase64) {
    throw new Error("Failed to generate audio content");
  }

  return { audioBase64 };
};

export const translateContent = async (text: string): Promise<string> => {
  if (!apiKey) return "API Key missing";
  
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Translate this English text to Chinese (Simplified) and provide a very brief definition if it is a single word: "${text}"`,
  });
  
  return response.text || "Translation unavailable";
};
