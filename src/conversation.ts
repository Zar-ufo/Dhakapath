import { hubs } from './data'
import { findRoute } from './routing'

export interface ConversationContext { from?: string; to?: string; isStudent?: boolean; budget?: number }
export interface ConversationResponse { text: string; context: ConversationContext; routeRequested: boolean }

const findHub = (text: string) => hubs.find((hub) => text.toLowerCase().includes(hub.name.toLowerCase()) || text.toLowerCase().includes(hub.shortName.toLowerCase()))

export function answerQuery(input: string, context: ConversationContext = {}): ConversationResponse {
  const normalized = input.toLowerCase()
  const fromHub = findHub(normalized)
  const student = context.isStudent || /\b(student|chhatro|ছাত্র)\b/i.test(normalized)
  const budgetMatch = normalized.match(/(?:under|within|budget|below)\s*(?:bdt\s*)?(\d+)/i)
  const next: ConversationContext = { ...context, isStudent: student, budget: budgetMatch ? Number(budgetMatch[1]) : context.budget, from: fromHub?.id ?? context.from }
  const destinationWords = /\b(to|towards|jabo|jete|going)\b/i.test(normalized)
  const mentionedHubs = hubs.filter((hub) => normalized.includes(hub.name.toLowerCase()) || normalized.includes(hub.shortName.toLowerCase()))
  const possibleTo = destinationWords ? mentionedHubs.filter((hub) => hub.id !== next.from).sort((a, b) => {
    const aIndex = Math.max(normalized.lastIndexOf(a.name.toLowerCase()), normalized.lastIndexOf(a.shortName.toLowerCase()))
    const bIndex = Math.max(normalized.lastIndexOf(b.name.toLowerCase()), normalized.lastIndexOf(b.shortName.toLowerCase()))
    return bIndex - aIndex
  })[0] : undefined
  if (possibleTo) next.to = possibleTo.id
  if (!next.from) return { text: 'Where are you starting from? Try “Mirpur 10 theke Motijheel jabo”.', context: next, routeRequested: false }
  if (!next.to) return { text: `Got ${hubs.find((hub) => hub.id === next.from)?.name}. Where are you going?`, context: next, routeRequested: false }
  const scenario = normalized.includes('rain') || normalized.includes('bristi') ? 'rain' : normalized.includes('avoid') || normalized.includes('blocked') || normalized.includes('jam') ? 'blocked' : 'clear'
  const route = findRoute(next.from, next.to, scenario, student)
  if (!route) return { text: 'I could not find a connected route yet. Try another hub.', context: next, routeRequested: true }
  const budgetNote = next.budget && route.totalFare > next.budget ? ` This is above your BDT ${next.budget} budget; try a closer destination.` : ''
  return { text: `${student ? 'Student fare' : 'Fare'} route: ${route.legs.map((leg) => leg.toHub.shortName).join(' → ')}. ${route.totalMinutes} min, BDT ${route.totalFare}.${scenario === 'blocked' ? ' Blocked/jam segments were avoided.' : ''}${budgetNote}`, context: next, routeRequested: true }
}
