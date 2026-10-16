import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import tailwindcss from '@tailwindcss/vite'
import type { IncomingMessage, ServerResponse } from 'node:http'

const defaultGeminiModel = ['gemini', '3.8', 'flash'].join('-')

async function readRequestBody(request: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = []
  for await (const chunk of request) chunks.push(Buffer.from(chunk))
  return Buffer.concat(chunks).toString('utf8')
}

function sendJson(response: ServerResponse, status: number, payload: unknown) {
  response.statusCode = status
  response.setHeader('Content-Type', 'application/json')
  response.end(JSON.stringify(payload))
}

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  process.env.GEMINI_API_KEY ??= env.GEMINI_API_KEY
  return {
  plugins: [react(), tailwindcss(), {
    name: 'dhakapath-gemini-api',
    configureServer(server) {
      server.middlewares.use('/api/trip-intelligence', async (request, response) => {
        if (request.method !== 'POST') {
          sendJson(response, 405, { error: 'POST required' })
          return
        }
        const apiKey = process.env.GEMINI_API_KEY
        if (!apiKey) {
          sendJson(response, 503, { error: 'Gemini is not configured' })
          return
        }
        try {
          const body = JSON.parse(await readRequestBody(request)) as { prompt?: string }
          if (!body.prompt?.trim()) {
            sendJson(response, 400, { error: 'A trip prompt is required' })
            return
          }
          const model = process.env.GEMINI_MODEL || defaultGeminiModel
          const geminiResponse = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              systemInstruction: { parts: [{ text: 'You are DhakaPath Trip Intelligence. Answer concisely in plain text. Never invent hubs, fares, transit links, live conditions, or availability. Use only the supplied local graph context. Clearly call the data seeded/simulated when relevant. If a route is not in the context, say the local router must be used instead.' }] },
              contents: [{ role: 'user', parts: [{ text: body.prompt }] }],
              generationConfig: { temperature: 0.2, maxOutputTokens: 350 },
            }),
          })
          const data = await geminiResponse.json() as { candidates?: { content?: { parts?: { text?: string }[] } }[]; error?: { message?: string } }
          if (!geminiResponse.ok) {
            sendJson(response, 502, { error: data.error?.message ?? 'Gemini request failed' })
            return
          }
          const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
          if (!text) {
            sendJson(response, 502, { error: 'Gemini returned no text' })
            return
          }
          sendJson(response, 200, { text, source: 'gemini' })
        } catch (error) {
          sendJson(response, 502, { error: error instanceof Error ? error.message : 'Gemini request could not be completed' })
        }
      })
    },
  }],
  }
})
