import { describe, expect, it } from 'vitest'
import { parsePort } from './parse-port'

describe('parsePort', () => {
  it('accepts integer ports, including 0 for a random free port', () => {
    expect(parsePort('5172')).toBe(5172)
    expect(parsePort('0')).toBe(0)
    expect(parsePort('65535')).toBe(65535)
  })

  it.each(['', ' ', 'abc', '51.5', '-1', '65536'])('rejects %j', (port) => {
    expect(() => parsePort(port)).toThrow(
      `KawaPress: --port must be an integer between 0 and 65535, got ${JSON.stringify(port)}.`,
    )
  })
})
