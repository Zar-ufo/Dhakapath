import { describe, expect, it } from 'vitest'
import { findRoute, findRouteOptions, calculateFare } from './routing'

describe('DhakaPath routing', () => {
  it('enforces the BDT 10 minimum student bus fare', () => {
    expect(calculateFare(12, 'bus', true)).toBe(10)
    expect(calculateFare(30, 'bus', true)).toBe(15)
    expect(calculateFare(40, 'metro', true)).toBe(40)
    expect(calculateFare(40, 'leguna', true)).toBe(40)
    expect(calculateFare(40, 'rickshaw', true)).toBe(40)
    expect(calculateFare(40, 'rickshaw', true, 'rain')).toBe(50)
  })
  it('returns valid connected multi-leg routes', () => {
    const route = findRoute('farmgate', 'motijheel', 'clear', false)
    expect(route?.legs.length).toBeGreaterThan(0)
    expect(route?.legs[0].from).toBe('farmgate')
    expect(route?.legs.at(-1)?.to).toBe('motijheel')
  })
  it('supports Gulistan as either the origin or destination', () => {
    const fromGulistan = findRoute('gulistan', 'motijheel', 'clear', false)
    const toGulistan = findRoute('mirpur-dohs', 'gulistan', 'clear', false)
    expect(fromGulistan?.legs.length).toBeGreaterThan(0)
    expect(fromGulistan?.legs[0].from).toBe('gulistan')
    expect(fromGulistan?.legs.at(-1)?.to).toBe('motijheel')
    expect(toGulistan?.legs.at(-1)?.to).toBe('gulistan')
  })
  it('avoids a blocked segment and still reroutes', () => {
    const route = findRoute('farmgate', 'motijheel', 'blocked', false)
    expect(route?.blockedSegments).toContain('BUS-FM-MJ-01')
    expect(route?.legs.some((leg) => leg.id === 'BUS-FM-MJ-01' || leg.id === 'BUS-FM-MJ-02')).toBe(false)
    expect(route?.legs.length).toBeGreaterThan(0)
  })
  it('returns distinct grounded alternatives when the graph allows them', () => {
    const options = findRouteOptions('mirpur-10', 'motijheel', 'clear', true)
    expect(options.length).toBeGreaterThan(1)
    expect(new Set(options.map((option) => option.legs.map((leg) => leg.id).join('|'))).size).toBe(options.length)
  })
})
