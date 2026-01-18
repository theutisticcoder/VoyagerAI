
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
    ? "Use punchy, high-tension, short sentences. Focus on immediate physical danger and adrenaline. High-stakes action."
    : isWalking 
      ? "Use atmospheric, descriptive, and flowery prose. Focus on the sensory details of the environment and deep internal monologue."
      : "Balanced narrative with steady pacing and building intrigue.";

  const prompt = `
    Continue a second-person immersive story in the ${genre} genre. 
    Plot background: ${plot || 'A lone wanderer discovering a hidden truth in a shifting world.'}
    
    Current Chapter: ${chapterNumber}
    Previous Events: ${previousContext.slice(-1000)}
    
    MANDATORY STYLISTIC INSTRUCTIONS:
    - Strictly write in the SECOND PERSON ('You').
    - Write EXACTLY 15 PARAGRAPHS.
    - DO NOT mention exercise, metrics, speed, running, walking, or any real-world workout stats.
    - ${styleDirective}
    - The story must be immersive and self-contained within the fiction.
    
    Ensure the transition from the previous context is seamless.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        temperature: 0.9,
        topP: 0.95,
      },
    });

    return response.text || "The digital void remains silent...";
  } catch (error) {
    console.error("Story generation failed:", error);
    return "The system glitched. Your journey continues in silence.";
  }
};

export const generateTTS = async (text: string) => {
  try {
    const ttsText = text.split('\n\n').slice(0, 3).join('\n\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `Narrate the following with a deep, cinematic, cyberpunk-noir voice: ${ttsText}` }] }],
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
    console.error("TTS generation failed:", error);
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
