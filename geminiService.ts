
import { GoogleGenAI, Modality } from "@google/genai";

const MISTRAL_KEY = "nUANEOGN4al5gS7pKPtu391tBxnVkfUQ";
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * MISTRAL AI NARRATIVE ENGINE
 * Generates immersive 15-paragraph second-person chapters.
 */
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
    ? "Use frantic, high-tension, fragmented sentences. The air is thick with ozone and adrenaline. Action is immediate and visceral."
    : isWalking 
      ? "Use evocative, slow-burn, atmospheric prose. Focus on neon reflections, the hum of the city, and deep internal monologue."
      : "Steady, driving narrative pacing. Focus on discovery and a building sense of destiny.";

  const prompt = `
    Continue an immersive second-person story in the ${genre} genre. 
    Global Plot: ${plot || 'A neon-noir journey through a sprawling cyber-metropolis.'}
    
    Current Fragment: ${chapterNumber}
    Historical Context: ${previousContext.slice(-2000)}
    
    STRICT CONSTRAINTS:
    - Write EXACTLY 15 paragraphs. This is mandatory.
    - Perspective: SECOND PERSON ('You').
    - Tone: ${styleDirective}
    - ABSOLUTELY NO mention of real-world metrics, apps, exercise, or health stats.
    - Maintain 100% fictional immersion.
  `;

  try {
    const response = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${MISTRAL_KEY}`
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: "You are an elite cyberpunk novelist providing a real-time narrative experience." },
          { role: "user", content: prompt }
        ],
        temperature: 0.8
      })
    });

    const data = await response.json();
    if (!data.choices || !data.choices[0]) {
      throw new Error("Invalid Mistral response");
    }
    return data.choices[0].message.content;
  } catch (error) {
    console.error("Mistral Error:", error);
    return "The narrative stream has been disrupted. You stand alone in the digital rain, waiting for the signal to return...";
  }
};

/**
 * EDGE-STYLE NEURAL TTS
 * Uses the highest quality cinematic voices to simulate Edge Universal quality.
 */
export const generateTTS = async (text: string): Promise<string | null> => {
  try {
    // We take the first few paragraphs for an immediate audio "hook"
    const ttsText = text.split('\n\n').slice(0, 3).join('\n\n');
    
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `[NARRATION MODE: EDGE-UNIVERSAL NEURAL] ${ttsText}` }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' }, // Charon provides a deep, cinematic, authoritative neural quality
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
  } catch (error) {
    console.error("TTS Synthesis Error:", error);
    return null;
  }
};

export const decodeAudio = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
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
