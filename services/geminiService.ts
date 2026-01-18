
const MISTRAL_KEY = "nUANEOGN4al5gS7pKPtu391tBxnVkfUQ";

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
 * EDGE-TTS UNIVERSAL
 * Fetches high-quality neural speech (MP3) from an Edge-compatible endpoint via Proxy.
 * Voice: en-US-GuyNeural (Standard Edge Voice)
 */
export const generateTTS = async (text: string): Promise<string | null> => {
  try {
    // We limit text length for speed and reliability with the proxy
    const ttsText = text.split('\n\n').slice(0, 3).join(' ').substring(0, 800);
    const voice = "en-US-GuyNeural"; 
    
    // Using corsproxy.io to access a public Edge-TTS wrapper (Node-style API)
    // This replicates the behavior of 'edge-tts' node package in a browser environment.
    const edgeWrapperUrl = `https://edge-tts.vercel.app/api/tts?text=${encodeURIComponent(ttsText)}&voice=${voice}`;
    const url = `https://corsproxy.io/?url=${encodeURIComponent(edgeWrapperUrl)}`;

    const response = await fetch(url);
    if (!response.ok) {
        console.warn("Edge TTS proxy failed, audio unavailable.");
        return null;
    }
    
    const blob = await response.blob();
    return await blobToBase64(blob);
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
