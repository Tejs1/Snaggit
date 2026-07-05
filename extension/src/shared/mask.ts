export function maskKey(key: string): string {
  if (key.length > 8)
    return `${key.slice(0, 3)}••••${key.slice(-4)}`
  return '••••'
}
