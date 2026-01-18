const MISTRAL_KEY = "nUANEOGN4al5gS7pKPtu391tBxnVkfUQ";
import { Mistral } from "@mistralai/mistralai";

const mistral = new Mistral({
  apiKey: MISTRAL_KEY,
});
/**
 * MISTRAL AI NARRATIVE ENGINE
 * Generates immersive 15-paragraph second-person chapters using 'mistral-large-latest'.
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

    const response = await mistral.chat.complete({
      model: "mistral-small-latest",
      messages: [
        { role: "system", content: "You are an elite cyberpunk novelist providing a real-time narrative experience." },
        { role: "user", content: prompt }
      ],
      responseFormat: {
        type: "text",
      },
    });

    const data = response.choices[0].message.content;
    return data;
  } catch (error) {
    console.error("Mistral Error:", error);
    return "The narrative stream has been disrupted. You stand alone in the digital rain, waiting for the signal to return...";
  }
};

/**
 * EDGE-TTS via Vercel API Proxy
 * Calls the Vercel serverless function which handles Edge TTS WebSocket connections.
 * This avoids CORS issues by running TTS on the server side.
 */
export const generateTTS = async (text: string): Promise<string | null> => {
  try {
    // Determine API URL - use relative path in production, full URL in dev if needed
    const apiUrl = import.meta.env.PROD 
      ? '/api/tts' 
      : (import.meta.env.VITE_API_URL || 'http://localhost:3000/api/tts');

    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        voice: 'en-US-GuyNeural',
        rate: '+0%',
        pitch: '+0Hz',
        volume: '+0%'
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Unknown error' }));
      console.error("TTS API error:", error);
      return null;
    }

    const data = await response.json();
    
    // The API returns base64 audio directly
    return data.audio || null;

  } catch (error) {
    console.error("Edge TTS error:", error);
    return null;
  }
};

/**
 * Helper to convert Blob to Base64 string for storage
 */
const blobToBase64 = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result as string;
      // Remove the "data:audio/mp3;base64," prefix so we just store the raw base64
      const base64 = dataUrl.split(',')[1];
      resolve(base64);
    };
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * Decodes Base64 string back to Uint8Array
 */
export const decodeAudio = (base64: string): Uint8Array => {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

/**
 * Decodes Audio Data (MP3) using Native Browser API
 * Edge TTS returns standard MP3, so we use ctx.decodeAudioData
 */
export async function decodeAudioData(
  data: Uint8Array,
  ctx: AudioContext
): Promise<AudioBuffer> {
  // Ensure we have a clean ArrayBuffer copy for the decoder
  const buffer = data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength);
  return await ctx.decodeAudioData(buffer);
}
