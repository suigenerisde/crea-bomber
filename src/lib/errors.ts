/**
 * CreaBomber Error Handling Utilities
 * Standardized error types, handling, and response formatting
 */

import { NextResponse } from 'next/server';

// Standard API error response format
export interface ApiErrorResponse {
  error: string;
  code?: string;
  details?: Record<string, unknown>;
}

// Custom error classes for different error types
export class AppError extends Error {
  public readonly code: string;
  public readonly statusCode: number;
  public readonly details?: Record<string, unknown>;

  constructor(
    message: string,
    options: {
      code?: string;
      statusCode?: number;
      details?: Record<string, unknown>;
    } = {}
  ) {
    super(message);
    this.name = 'AppError';
    this.code = options.code ?? 'INTERNAL_ERROR';
    this.statusCode = options.statusCode ?? 500;
    this.details = options.details;
  }
}

export class ValidationError extends AppError {
  constructor(message: string, details?: Record<string, unknown>) {
    super(message, {
      code: 'VALIDATION_ERROR',
      statusCode: 400,
      details,
    });
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends AppError {
  constructor(resource: string, id?: string) {
    super(id ? `${resource} with id '${id}' not found` : `${resource} not found`, {
      code: 'NOT_FOUND',
      statusCode: 404,
      details: { resource, id },
    });
    this.name = 'NotFoundError';
  }
}

export class DatabaseError extends AppError {
  constructor(message: string, originalError?: unknown) {
    super(message, {
      code: 'DATABASE_ERROR',
      statusCode: 500,
      details: originalError instanceof Error
        ? { originalMessage: originalError.message }
        : undefined,
    });
    this.name = 'DatabaseError';
  }
}

export class NetworkError extends AppError {
  public readonly isRetryable: boolean;

  constructor(message: string, isRetryable = true) {
    super(message, {
      code: 'NETWORK_ERROR',
      statusCode: 503,
      details: { isRetryable },
    });
    this.name = 'NetworkError';
    this.isRetryable = isRetryable;
  }
}

// API error response helper
export function apiError(
  error: unknown,
  context?: string
): NextResponse<ApiErrorResponse> {
  // Log error for debugging
  console.error(`[API Error]${context ? ` ${context}:` : ''}`, error);

  // Handle known error types
  if (error instanceof AppError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
        details: error.details,
      },
      { status: error.statusCode }
    );
  }

  // Handle SQLite specific errors
  if (error instanceof Error) {
    const sqliteErrorMatch = error.message.match(/SQLITE_(\w+)/);
    if (sqliteErrorMatch) {
      const sqliteCode = sqliteErrorMatch[1];
      const friendlyMessages: Record<string, string> = {
        CONSTRAINT: 'Database constraint violation',
        BUSY: 'Database is busy, please try again',
        LOCKED: 'Database is locked, please try again',
        CORRUPT: 'Database integrity error',
        NOTFOUND: 'Database file not found',
        CANTOPEN: 'Cannot open database',
        READONLY: 'Database is read-only',
      };

      return NextResponse.json(
        {
          error: friendlyMessages[sqliteCode] ?? 'Database error occurred',
          code: `DATABASE_${sqliteCode}`,
        },
        { status: 500 }
      );
    }

    // Handle JSON parse errors
    if (error.message.includes('JSON')) {
      return NextResponse.json(
        {
          error: 'Invalid request body - malformed JSON',
          code: 'INVALID_JSON',
        },
        { status: 400 }
      );
    }
  }

  // Generic error fallback
  return NextResponse.json(
    {
      error: 'An unexpected error occurred',
      code: 'INTERNAL_ERROR',
    },
    { status: 500 }
  );
}

// Validation helpers
export interface ValidationResult {
  valid: boolean;
  errors: ValidationFieldError[];
}

export interface ValidationFieldError {
  field: string;
  message: string;
}

export function validateRequired(
  value: unknown,
  fieldName: string
): ValidationFieldError | null {
  if (value === undefined || value === null || value === '') {
    return { field: fieldName, message: `${fieldName} is required` };
  }
  return null;
}

export function validateString(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number } = {}
): ValidationFieldError | null {
  if (typeof value !== 'string') {
    return { field: fieldName, message: `${fieldName} must be a string` };
  }
  if (options.minLength !== undefined && value.length < options.minLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be at least ${options.minLength} characters`,
    };
  }
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must be at most ${options.maxLength} characters`,
    };
  }
  return null;
}

export function validateArray(
  value: unknown,
  fieldName: string,
  options: { minLength?: number; maxLength?: number } = {}
): ValidationFieldError | null {
  if (!Array.isArray(value)) {
    return { field: fieldName, message: `${fieldName} must be an array` };
  }
  if (options.minLength !== undefined && value.length < options.minLength) {
    return {
      field: fieldName,
      message: `${fieldName} must have at least ${options.minLength} items`,
    };
  }
  if (options.maxLength !== undefined && value.length > options.maxLength) {
    return {
      field: fieldName,
      message: `${fieldName} must have at most ${options.maxLength} items`,
    };
  }
  return null;
}

export function validateUrl(
  value: unknown,
  fieldName: string
): ValidationFieldError | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null; // Optional URL - let validateRequired handle required check
  }

  try {
    new URL(value);
    return null;
  } catch {
    // Check if it's a relative URL or data URL
    if (value.startsWith('/') || value.startsWith('data:')) {
      return null;
    }
    return { field: fieldName, message: `${fieldName} must be a valid URL` };
  }
}

export function validateEnum<T extends string>(
  value: unknown,
  fieldName: string,
  validValues: T[]
): ValidationFieldError | null {
  if (!validValues.includes(value as T)) {
    return {
      field: fieldName,
      message: `${fieldName} must be one of: ${validValues.join(', ')}`,
    };
  }
  return null;
}

export function combineValidation(
  ...results: (ValidationFieldError | null)[]
): ValidationResult {
  const errors = results.filter((r): r is ValidationFieldError => r !== null);
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Create validation error from result
export function validationResultToError(result: ValidationResult): ValidationError | null {
  if (result.valid) return null;

  const messages = result.errors.map((e) => e.message).join('; ');
  return new ValidationError(messages, {
    fields: result.errors,
  });
}

// Safe JSON parse with error handling
export async function safeJsonParse<T>(
  request: Request
): Promise<{ data: T | null; error: ValidationError | null }> {
  try {
    const text = await request.text();
    if (!text.trim()) {
      return {
        data: null,
        error: new ValidationError('Request body is empty'),
      };
    }
    const data = JSON.parse(text) as T;
    return { data, error: null };
  } catch {
    return {
      data: null,
      error: new ValidationError('Invalid JSON in request body'),
    };
  }
}

// Extract user-friendly error message
export function getErrorMessage(error: unknown): string {
  if (error instanceof AppError) {
    return error.message;
  }
  if (error instanceof Error) {
    // Sanitize common error messages
    if (error.message.includes('SQLITE_')) {
      return 'A database error occurred';
    }
    if (error.message.includes('ECONNREFUSED')) {
      return 'Could not connect to the server';
    }
    if (error.message.includes('ETIMEDOUT')) {
      return 'Connection timed out';
    }
    if (error.message.includes('fetch failed')) {
      return 'Network request failed';
    }
    return error.message;
  }
  return 'An unexpected error occurred';
}
