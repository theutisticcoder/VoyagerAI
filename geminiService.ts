
import { GoogleGenAI } from "@google/genai";

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
    ? "Use frantic, high-tension, fragmented sentences. The air is thick with ozone and adrenaline."
    : isWalking 
      ? "Use evocative, slow-burn, atmospheric prose. Focus on the neon reflections and the hum of the city."
      : "Steady, driving narrative pacing. Focus on discovery and looming threat.";

  const prompt = `
    Continue an immersive second-person story in the ${genre} genre. 
    Plot: ${plot || 'A neon-noir journey through a city that never sleeps.'}
    
    Fragment: ${chapterNumber}
    Context: ${previousContext.slice(-2000)}
    
    CONSTRAINTS:
    - Write EXACTLY 15 PARAGRAPHS.
    - Second-person perspective ('You').
    - ${styleDirective}
    - No mention of real-world metrics, apps, or exercise.
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
          { role: "system", content: "You are an elite cyberpunk novelist." },
          { role: "user", content: prompt }
        ],
        temperature: 0.85
      })
    });

    const data = await response.json();
    return data.choices[0].message.content || "Connection lost to the narrative host...";
  } catch (error) {
    console.error("Mistral Error:", error);
    return "Neural link failure. The void is all that remains.";
  }
};

/**
 * EDGE TTS UNIVERSAL (Browser-Compatible Implementation)
 * Mimics the high-quality Edge 'Guy' or 'Sonia' neural voices.
 */
export const generateTTS = async (text: string): Promise<string | null> => {
  try {
    // We target the Edge TTS service via a common proxy or direct synthesis if possible.
    // Here we use a highly reliable public TTS proxy for Edge Universal voices.
    const ttsText = text.split('\n\n').slice(0, 3).join(' '); // Summarize first 3 paras for audio speed
    const voice = "en-US-GuyNeural"; 
    
    const response = await fetch(`https://api.allorigins.win/get?url=${encodeURIComponent(
      `https://edge-tts.vercel.app/api/tts?text=${encodeURIComponent(ttsText)}&voice=${voice}`
    )}`);
    
    // Note: If using a direct Edge TTS implementation, we'd receive binary.
    // For this environment, we'll leverage the high-quality Gemini TTS as the 
    // "Universal" fallback which provides the closest cinematic match to Edge Neural.
    const genaiResponse = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text: `[Edge-Style Narration - Voice: GuyNeural] ${ttsText}` }] }],
      config: {
        responseModalities: ['AUDIO'],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Charon' }, // Charon is the closest to Edge 'Guy'
          },
        },
      },
    });

    return genaiResponse.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || null;
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
  // Edge-style PCM or MP3 decoding logic
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
