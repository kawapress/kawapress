export function parsePort(port: string): number {
  const parsed = Number(port)
  if (port.trim() === '' || !Number.isInteger(parsed) || parsed < 0 || parsed > 65535) {
    throw new TypeError(
      `KawaPress: --port must be an integer between 0 and 65535, got ${JSON.stringify(port)}.`,
    )
  }
  return parsed
}
