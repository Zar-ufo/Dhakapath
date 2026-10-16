const defaultGeminiModel = ['gemini', '3.8', 'flash'].join('-')

type GeminiResponse = {
  candidates?: { content?: { parts?: { text?: string }[] } }[]
  error?: { message?: string }
}

export default async (request: Request): Promise<Response> => {
  if (request.method !== 'POST') {
    return json({ error: 'POST required' }, 405)
  }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return json({ error: 'Gemini is not configured' }, 503)
  }

  try {
    const body = await request.json() as { prompt?: string }
    if (!body.prompt?.trim()) {
      return json({ error: 'A trip prompt is required' }, 400)
    }

    const model = process.env.GEMINI_MODEL || defaultGeminiModel
    const geminiResponse = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          systemInstruction: {
            parts: [{
              text: 'You are DhakaPath Trip Intelligence. Answer concisely in plain text. Never invent hubs, fares, transit links, live conditions, or availability. Use only the supplied local graph context. Clearly call the data seeded/simulated when relevant. If a route is not in the context, say the local router must be used instead.',
            }],
          },
          contents: [{ role: 'user', parts: [{ text: body.prompt }] }],
          generationConfig: { temperature: 0.2, maxOutputTokens: 350 },
        }),
      },
    )
    const data = await geminiResponse.json() as GeminiResponse
    if (!geminiResponse.ok) {
      return json({ error: data.error?.message ?? 'Gemini request failed' }, 502)
    }

    const text = data.candidates?.[0]?.content?.parts?.map((part) => part.text ?? '').join('').trim()
    if (!text) {
      return json({ error: 'Gemini returned no text' }, 502)
    }
    return json({ text, source: 'gemini' }, 200)
  } catch (error) {
    return json({ error: error instanceof Error ? error.message : 'Gemini request could not be completed' }, 502)
  }
}

function json(payload: unknown, status: number): Response {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}
