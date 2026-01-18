# Vercel Deployment Setup

This project uses Vercel serverless functions to proxy Edge TTS requests, avoiding CORS issues in the browser.

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Local Development

For local development with the API routes, you have two options:

#### Option A: Use Vercel CLI (Recommended)

```bash
# Install Vercel CLI globally
npm install -g vercel

# Run local dev server
vercel dev
```

This will start both the frontend and API routes on `http://localhost:3000`.

#### Option B: Use Vite Dev Server (Frontend Only)

```bash
npm run dev
```

Note: The TTS API won't work in this mode unless you set `VITE_API_URL` to point to a deployed Vercel function or use a local proxy.

### 3. Deploy to Vercel

#### Using Vercel CLI:

```bash
vercel
```

#### Using GitHub Integration:

1. Push your code to GitHub
2. Import your repository in Vercel
3. Vercel will automatically detect the configuration and deploy

### 4. Build Configuration

The project uses Vite for building the frontend. Vercel will automatically:
- Build the frontend using `vite build`
- Deploy API routes from the `/api` directory
- Serve the frontend from the `dist` directory

### 5. Environment Variables

If you need any environment variables, add them in:
- Vercel Dashboard → Your Project → Settings → Environment Variables
- Or via CLI: `vercel env add VARIABLE_NAME`

### 6. API Routes

The TTS API is available at:
- Production: `https://your-domain.vercel.app/api/tts`
- Local (with `vercel dev`): `http://localhost:3000/api/tts`

#### API Endpoint: `/api/tts`

**Method:** POST

**Body:**
```json
{
  "text": "Text to convert to speech",
  "voice": "en-US-GuyNeural",  // Optional, default: en-US-GuyNeural
  "rate": "+0%",                // Optional, default: +0%
  "pitch": "+0Hz",              // Optional, default: +0Hz
  "volume": "+0%"               // Optional, default: +0%
}
```

**Response:**
```json
{
  "audio": "base64-encoded-audio-data",
  "format": "mp3"
}
```

## Troubleshooting

### TTS not working locally

- Make sure you're using `vercel dev` to run the API routes locally
- Or set `VITE_API_URL` environment variable to point to your deployed API

### Build errors

- Ensure all dependencies are installed: `npm install`
- Check that `@vercel/node` is in devDependencies
- Verify TypeScript configuration is correct

### CORS errors

- The API route already handles CORS with `Access-Control-Allow-Origin: *`
- If you still see CORS errors, check that the API route is being called correctly
