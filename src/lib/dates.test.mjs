import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { friendlyDay, localDateString } from './dates.js'

describe('localDateString', () => {
  it('formats a local date as YYYY-MM-DD with zero padding', () => {
    assert.equal(localDateString(new Date(2026, 0, 5)), '2026-01-05')
  })

  it('keeps the local day just after midnight (UTC is still the day before in UTC+1)', () => {
    // 00:30 local time on 6 Nov 2026
    assert.equal(localDateString(new Date(2026, 10, 6, 0, 30)), '2026-11-06')
  })
})

describe('friendlyDay', () => {
  const labels = { today: 'اليوم', yesterday: 'أمس' }
  const today = new Date(2026, 10, 7, 10, 0)

  it('says today and yesterday in words', () => {
    assert.equal(friendlyDay('2026-11-07', 'ar', labels, today), 'اليوم')
    assert.equal(friendlyDay('2026-11-06', 'ar', labels, today), 'أمس')
  })

  it('handles yesterday across a month boundary', () => {
    assert.equal(friendlyDay('2026-10-31', 'ar', labels, new Date(2026, 10, 1)), 'أمس')
  })

  it('shows weekday, day and month in Arabic with Latin digits', () => {
    const label = friendlyDay('2026-11-03', 'ar', labels, today)
    assert.match(label, /الثلاثاء/)
    assert.match(label, /3/)
    assert.doesNotMatch(label, /2026/)
  })

  it('adds the year for another year', () => {
    assert.match(friendlyDay('2025-12-30', 'en', labels, today), /2025/)
  })
})
