import 'server-only'

export function logServerError(context: string, err: unknown): void {
  const message = err instanceof Error ? err.message : String(err)
  console.error(JSON.stringify({
    level: 'error',
    context,
    message,
    ts: new Date().toISOString(),
  }))
}
