import { hubs, segments, type RouteResult, type Scenario, type Segment, type TransitLeg } from './data'

const hubById = new Map(hubs.map((hub) => [hub.id, hub]))
const scenarioPenalty = { clear: 0, rain: 6, rush: 8, blocked: 0 }

function getTraversableSegments(from: string): Segment[] {
  return segments.flatMap((segment) => {
    if (segment.from === from) return [segment]
    if (segment.to === from) {
      return [{ ...segment, id: `${segment.id}:reverse`, from: segment.to, to: segment.from }]
    }
    return []
  })
}

function isBlockedSegment(segment: Segment, blockedSegments: string[]): boolean {
  return blockedSegments.includes(segment.id.replace(/:reverse$/, ''))
}

export function calculateFare(baseFare: number, mode: TransitLeg['mode'], isStudent: boolean, scenario: Scenario = 'clear'): number {
  if (mode === 'rickshaw' && scenario === 'rain') return Math.ceil(baseFare * 1.25)
  if (!isStudent || mode !== 'bus') return baseFare
  return Math.max(10, Math.round(baseFare * 0.5))
}

export function findRoute(from: string, to: string, scenario: Scenario = 'clear', isStudent = false): RouteResult | null {
  return findRouteInternal(from, to, scenario, isStudent, [])
}

function findRouteInternal(from: string, to: string, scenario: Scenario, isStudent: boolean, excluded: string[]): RouteResult | null {
  if (from === to) return { legs: [], totalMinutes: 0, totalFare: 0, fareBreakdown: [], transfers: 0, blockedSegments: [], scenario }
  const blockedSegments = scenario === 'blocked' ? ['BUS-FM-MJ-01', 'BUS-FM-MJ-02'] : []
  const distances = new Map<string, number>(hubs.map((hub) => [hub.id, Number.POSITIVE_INFINITY]))
  const previous = new Map<string, { segment: typeof segments[number]; from: string }>()
  const queue = [{ id: from, cost: 0 }]
  distances.set(from, 0)
  while (queue.length) {
    queue.sort((a, b) => a.cost - b.cost)
    const current = queue.shift()!
    if (current.id === to) break
    for (const segment of getTraversableSegments(current.id)) {
      if (isBlockedSegment(segment, blockedSegments) || excluded.includes(segment.id) || excluded.includes(segment.id.replace(/:reverse$/, ''))) continue
      const cost = current.cost + segment.minutes + (scenarioPenalty[scenario] * (segment.mode === 'bus' ? 1 : 0))
      if (cost < (distances.get(segment.to) ?? Number.POSITIVE_INFINITY)) {
        distances.set(segment.to, cost)
        previous.set(segment.to, { segment, from: current.id })
        queue.push({ id: segment.to, cost })
      }

    }
  }
  if (!previous.has(to)) return null
  const legs: TransitLeg[] = []
  let cursor = to
  while (cursor !== from) {
    const step = previous.get(cursor)
    if (!step) return null
    legs.unshift({ ...step.segment, fromHub: hubById.get(step.from)!, toHub: hubById.get(cursor)!, waitMinutes: step.segment.mode === 'metro' ? 4 : 3 })
    cursor = step.from
  }
  const totalMinutes = legs.reduce((sum, leg) => sum + leg.minutes + leg.waitMinutes, 0)
  const fareBreakdown = legs.map((leg) => ({
    mode: leg.mode,
    regular: leg.fare,
    charged: calculateFare(leg.fare, leg.mode, isStudent, scenario),
    note: leg.mode === 'bus' && isStudent ? '50% student bus fare' : leg.mode === 'rickshaw' && scenario === 'rain' ? '25% rain surge' : leg.mode === 'metro' ? 'no student metro discount' : leg.mode === 'leguna' ? 'no student discount' : 'base fare',
  }))
  const totalFare = fareBreakdown.reduce((sum, leg) => sum + leg.charged, 0)
  return { legs, totalMinutes, totalFare, fareBreakdown, transfers: Math.max(0, legs.length - 1), blockedSegments, scenario }
}

export function findRouteOptions(from: string, to: string, scenario: Scenario = 'clear', isStudent = false): RouteResult[] {
  const primary = findRouteInternal(from, to, scenario, isStudent, [])
  if (!primary) return []
  const options = [primary]
  for (const leg of primary.legs.slice(0, 3)) {
    const alternative = findRouteInternal(from, to, scenario, isStudent, [leg.id])
    if (alternative && alternative.legs.map((item) => item.id).join('|') !== primary.legs.map((item) => item.id).join('|')) {
      options.push(alternative)
    }
  }
  return options.sort((a, b) => a.totalMinutes - b.totalMinutes).slice(0, 3)
}
