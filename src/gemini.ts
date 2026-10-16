import { answerQuery, type ConversationContext } from './conversation'
import type { RouteResult } from './data'

export async function askTripIntelligence(prompt: string, route: RouteResult | null, context: ConversationContext): Promise<string> {
  const localFallback = answerQuery(prompt, context).text

  const routeFacts = route
    ? `Grounded route: ${route.legs.map((leg) => `${leg.fromHub.name} to ${leg.toHub.name} by ${leg.mode}, ${leg.minutes} minutes, charged BDT ${route.fareBreakdown.find((fare) => fare.mode === leg.mode)?.charged ?? leg.fare}`).join('; ')}. Total ${route.totalMinutes} minutes, BDT ${route.totalFare}. Scenario: ${route.scenario}.`
    : 'No connected route was found in the local graph.'

  try {
    const response = await fetch('/api/trip-intelligence', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt: `${prompt}\n\nContext: ${JSON.stringify(context)}\n${routeFacts}\nThis is a local seeded/simulated demo, not live data.` }),
    })

    const data = await response.json() as { text?: string; error?: string }
    if (!response.ok) {
      if (response.status === 503 || response.status === 502) return localFallback
      throw new Error(data.error ?? `Gemini request failed (${response.status})`)
    }

    if (!data.text) throw new Error('Gemini returned no answer')
    return data.text
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Gemini request failed'
    if (/gemini|fetch failed|failed to fetch|not configured|returned no answer|request failed/i.test(message)) {
      return localFallback
    }
    throw error
  }
}
