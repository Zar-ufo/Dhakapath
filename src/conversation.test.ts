import { describe, expect, it } from 'vitest'
import { answerQuery } from './conversation'

describe('conversational grounding', () => {
  it('keeps a follow-up contextual and grounded in the graph', () => {
    const first = answerQuery('Mirpur 10 theke Motijheel jabo student fare')
    expect(first.routeRequested).toBe(true)
    expect(first.context.from).toBe('mirpur-10')
    expect(first.context.to).toBe('motijheel')
    const second = answerQuery('avoid jam under 50', first.context)
    expect(second.text).toContain('avoided')
    expect(second.text).toContain('BDT 50')
  })
})
