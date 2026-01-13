import { NextRequest, NextResponse } from 'next/server';
import { z, ZodSchema } from 'zod';
import { ValidationError } from '@/services/database/errors';

/**
 * Validate request body against a Zod schema
 */
export async function validateBody<T>(request: NextRequest, schema: ZodSchema<T>): Promise<T> {
  try {
    const body = await request.json();
    return schema.parse(body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Validation failed', error.errors);
    }
    throw error;
  }
}

/**
 * Validate query parameters against a Zod schema
 */
export function validateQuery<T>(request: NextRequest, schema: ZodSchema<T>): T {
  try {
    const searchParams = Object.fromEntries(request.nextUrl.searchParams.entries());
    return schema.parse(searchParams);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid query parameters', error.errors);
    }
    throw error;
  }
}

/**
 * Validate route parameters against a Zod schema
 */
export function validateParams<T>(params: Record<string, string | undefined>, schema: ZodSchema<T>): T {
  try {
    return schema.parse(params);
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new ValidationError('Invalid route parameters', error.errors);
    }
    throw error;
  }
}
