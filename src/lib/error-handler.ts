import { NextRequest, NextResponse } from 'next/server';
import {
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  ValidationError,
  ConflictError,
} from '@/services/database/errors';

/**
 * Log request with context
 */
function logRequest(request: NextRequest, userId?: string) {
  if (process.env.NODE_ENV === 'development') {
    console.log('[API Request]', {
      method: request.method,
      path: request.nextUrl.pathname,
      userId: userId || 'anonymous',
      timestamp: new Date().toISOString(),
    });
  }
}

/**
 * Log error with context
 */
function logError(error: unknown, request?: NextRequest, userId?: string) {
  const context = {
    timestamp: new Date().toISOString(),
    ...(request && {
      method: request.method,
      path: request.nextUrl.pathname,
    }),
    ...(userId && { userId }),
  };

  if (error instanceof Error) {
    console.error('[API Error]', {
      ...context,
      name: error.name,
      message: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  } else {
    console.error('[API Error]', {
      ...context,
      error: String(error),
    });
  }
}

/**
 * Handle API errors and convert them to appropriate HTTP responses
 */
export function handleApiError(error: unknown, request?: NextRequest, userId?: string): NextResponse {
  logError(error, request, userId);

  // Service layer errors
  if (error instanceof NotFoundError) {
    return NextResponse.json(
      { error: error.message },
      { status: 404 }
    );
  }

  if (error instanceof UnauthorizedError) {
    return NextResponse.json(
      { error: error.message },
      { status: 401 }
    );
  }

  if (error instanceof ForbiddenError) {
    return NextResponse.json(
      { error: error.message },
      { status: 403 }
    );
  }

  if (error instanceof ValidationError) {
    return NextResponse.json(
      { 
        error: error.message,
        details: error.details,
      },
      { status: 400 }
    );
  }

  if (error instanceof ConflictError) {
    return NextResponse.json(
      { error: error.message },
      { status: 409 }
    );
  }

  // Generic Error
  if (error instanceof Error) {
    return NextResponse.json(
      { 
        error: error.message || 'Internal server error',
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      { status: 500 }
    );
  }

  // Unknown error type
  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

/**
 * Wrapper for API route handlers that adds logging and error handling
 */
export function withErrorHandling(
  handler: (request: NextRequest, context?: any) => Promise<NextResponse>,
  getUserId?: (request: NextRequest) => Promise<string | undefined>
) {
  return async (request: NextRequest, context?: any): Promise<NextResponse> => {
    const userId = getUserId ? await getUserId(request) : undefined;
    
    if (process.env.NODE_ENV === 'development') {
      logRequest(request, userId);
    }

    try {
      const response = await handler(request, context);
      
      if (process.env.NODE_ENV === 'development') {
        console.log('[API Response]', {
          method: request.method,
          path: request.nextUrl.pathname,
          status: response.status,
          timestamp: new Date().toISOString(),
        });
      }

      return response;
    } catch (error) {
      return handleApiError(error, request, userId);
    }
  };
}
