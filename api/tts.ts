import type { VercelRequest, VercelResponse } from '@vercel/node';
import { tts } from 'edge-tts';

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { text, voice = 'en-US-GuyNeural', rate = '+0%', pitch = '+0Hz', volume = '+0%' } = req.body;

    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    // Generate TTS audio using edge-tts
    const audioResult = await tts(text, {
      voice,
      rate,
      pitch,
      volume
    });

    // Handle different return types from edge-tts
    let audioBuffer: Buffer;
    if (Buffer.isBuffer(audioResult)) {
      audioBuffer = audioResult;
    } else if (audioResult instanceof Uint8Array) {
      audioBuffer = Buffer.from(audioResult);
    } else if (audioResult && typeof (audioResult as any).arrayBuffer === 'function') {
      // Handle Blob-like objects
      const arrayBuffer = await (audioResult as any).arrayBuffer();
      audioBuffer = Buffer.from(arrayBuffer);
    } else {
      // Try to convert to Buffer directly
      audioBuffer = Buffer.from(audioResult as any);
    }

    // Convert Buffer to base64
    const base64 = audioBuffer.toString('base64');

    // Return as JSON with base64 audio
    return res.status(200).json({
      audio: base64,
      format: 'mp3'
    });

  } catch (error: any) {
    console.error('TTS API error:', error);
    return res.status(500).json({ 
      error: 'Failed to generate TTS',
      message: error.message 
    });
  }
}
