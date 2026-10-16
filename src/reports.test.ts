import { describe, expect, it } from 'vitest'
import { isStale, validateReport, type CrowdReport } from './reports'

describe('crowd reports', () => {
  const report: CrowdReport = { id: 'x', title: 'test', location: 'test', category: 'test', createdAt: '2026-10-16T08:00:00Z', corroborations: 2, status: 'pending' }
  it('marks reports older than 24 hours stale', () => expect(isStale('2026-10-14T08:00:00Z')).toBe(true))
  it('corroborates reports after five confirmations', () => expect(validateReport({ ...report, corroborations: 5 }).status).toBe('corroborated'))
  it('does not let stale reports remain active', () => expect(validateReport({ ...report, createdAt: '2026-10-14T08:00:00Z' }).status).toBe('stale'))
})
