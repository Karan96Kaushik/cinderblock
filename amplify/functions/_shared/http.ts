import type { APIGatewayProxyResultV2, LambdaFunctionURLEvent } from 'aws-lambda'

/**
 * Do not set Access-Control-* here. Function URL CORS in amplify/backend.ts
 * owns those headers. Duplicating them produces invalid combined values.
 */
export const jsonHeaders = {
  'Content-Type': 'application/json',
}

export function json(statusCode: number, body: Record<string, unknown>): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: jsonHeaders,
    body: JSON.stringify(body),
  }
}

export function getBearerToken(event: LambdaFunctionURLEvent): string | null {
  const raw =
    event.headers.authorization ??
    event.headers.Authorization ??
    event.headers.AUTHORIZATION
  if (!raw) return null
  const match = /^Bearer\s+(.+)$/i.exec(raw.trim())
  return match?.[1]?.trim() || null
}

export function parseJsonBody<T = Record<string, unknown>>(
  event: LambdaFunctionURLEvent,
): T | null {
  if (!event.body) return null
  try {
    const raw = event.isBase64Encoded
      ? Buffer.from(event.body, 'base64').toString('utf8')
      : event.body
    return JSON.parse(raw) as T
  } catch {
    return null
  }
}
