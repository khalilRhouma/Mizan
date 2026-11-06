import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { localDateString } from './dates.js'

describe('localDateString', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    assert.equal(localDateString(new Date(2026, 0, 5)), '2026-01-05')
  })

  it('keeps the local day just after midnight (UTC is still the day before in UTC+1)', () => {
    // 00:30 local time on 6 Nov 2026
    assert.equal(localDateString(new Date(2026, 10, 6, 0, 30)), '2026-11-06')
  })
})
