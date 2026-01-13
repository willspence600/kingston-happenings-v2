import { NextResponse } from 'next/server';

/**
 * Standardized API response helpers
 */

export function success<T>(data: T, status: number = 200): NextResponse {
  return NextResponse.json(data, { status });
}

export function error(message: string, status: number = 500, details?: unknown): NextResponse {
  return NextResponse.json(
    {
      error: message,
      ...(details && { details }),
    },
    { status }
  );
}
