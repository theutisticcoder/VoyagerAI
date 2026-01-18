
import { GoogleGenAI, Modality } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

export const generateChapter = async (
  genre: string,
  plot: string,
  speed: number,
  previousContext: string,
  chapterNumber: number
) => {
  const isSprinting = speed > 8;
  const isWalking = speed < 4;
  
  const styleDirective = isSprinting 
    ? "Use punchy, high-tension, short sentences. Focus on immediate physical danger and adrenaline. High-stakes action style."
    : isWalking 
      ? "Use atmospheric, descriptive, and flowery prose. Focus on sensory details of the neon-drenched environment and deep internal monologue."
      : "Balanced narrative with steady pacing and building intrigue.";

  const prompt = `
    Continue an immersive second-person story in the ${genre} genre. 
    Core Plot: ${plot || 'A neon-noir mystery unfolding in a decaying megalopolis.'}
    
    Current Fragment: ${chapterNumber}
    Previous Context (use for continuity): ${previousContext.slice(-1500)}
    
    STRICT RULES:
    1. Write exactly FIFTEEN (15) PARAGRAPHS. No more, no less.
    2. Write exclusively in the SECOND PERSON ('You').
    3. ${styleDirective}
    4. NEVER mention workout metrics, miles, speed, running, walking, exercise, or real-world sensors.
    5. Maintain 100% fictional immersion.
    
    The transition from previous context should be seamless.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.85,
        topP: 0.9,
      },
    });

    return response.text || "The digital feedback loops consume the narrative...";
  } catch (error) {
    console.error("AI Generation Error:", error);
    return "SYSTEM ERROR: Narrative link severed. Reconnecting...";
  }
};

export const generateTTS = async (text: string) => {
  try {
    // Generate TTS for the first few paragraphs to keep it responsive
    const ttsText = text.split('\n\n').slice(0, 4).join('\n\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Narrate this story fragment with a deep, cinematic, robotic-noir edge-tts style voice: ${ttsText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
  } catch (error) {
    console.error("TTS Error:", error);
    return null;
  }
};

export const decodeAudio = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
}
