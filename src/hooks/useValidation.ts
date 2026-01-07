/**
 * CreaBomber - useValidation Hook
 * Client-side form validation with real-time feedback
 */

'use client';

import { useState, useCallback, useMemo } from 'react';

// Validation rule types
export type ValidationRule<T = string> = {
  validate: (value: T) => boolean;
  message: string;
};

export type FieldValidation<T = string> = {
  rules: ValidationRule<T>[];
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
};

export type ValidationSchema = Record<string, FieldValidation>;

export type FieldErrors = Record<string, string | undefined>;

export type TouchedFields = Record<string, boolean>;

// Built-in validation rules
export const rules = {
  required: (message = 'This field is required'): ValidationRule<string> => ({
    validate: (value) => value.trim().length > 0,
    message,
  }),

  minLength: (min: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length >= min,
    message: message ?? `Must be at least ${min} characters`,
  }),

  maxLength: (max: number, message?: string): ValidationRule<string> => ({
    validate: (value) => value.length <= max,
    message: message ?? `Must be at most ${max} characters`,
  }),

  url: (message = 'Must be a valid URL'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value.trim()) return true; // Empty is OK, use required for mandatory
      try {
        new URL(value);
        return true;
      } catch {
        // Allow relative URLs and data URLs
        return value.startsWith('/') || value.startsWith('data:');
      }
    },
    message,
  }),

  pattern: (regex: RegExp, message: string): ValidationRule<string> => ({
    validate: (value) => regex.test(value),
    message,
  }),

  email: (message = 'Must be a valid email'): ValidationRule<string> => ({
    validate: (value) => {
      if (!value.trim()) return true;
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    },
    message,
  }),

  custom: <T>(
    validateFn: (value: T) => boolean,
    message: string
  ): ValidationRule<T> => ({
    validate: validateFn,
    message,
  }),
};

interface UseValidationOptions<T> {
  initialValues: T;
  schema: Record<keyof T, FieldValidation>;
  validateOnChange?: boolean;
  validateOnBlur?: boolean;
}

interface UseValidationReturn<T> {
  values: T;
  errors: Record<keyof T, string | undefined>;
  touched: Record<keyof T, boolean>;
  isValid: boolean;
  isDirty: boolean;
  setValue: <K extends keyof T>(field: K, value: T[K]) => void;
  setTouched: (field: keyof T, isTouched?: boolean) => void;
  validateField: (field: keyof T) => string | undefined;
  validateAll: () => boolean;
  reset: () => void;
  getFieldProps: (field: keyof T) => {
    value: T[keyof T];
    onChange: (value: T[keyof T]) => void;
    onBlur: () => void;
    error: string | undefined;
  };
}

export function useValidation<T extends Record<string, unknown>>({
  initialValues,
  schema,
  validateOnChange = true,
  validateOnBlur = true,
}: UseValidationOptions<T>): UseValidationReturn<T> {
  const [values, setValues] = useState<T>(initialValues);
  const [errors, setErrors] = useState<Record<keyof T, string | undefined>>(
    () => {
      const initial: Record<string, string | undefined> = {};
      for (const key of Object.keys(initialValues)) {
        initial[key] = undefined;
      }
      return initial as Record<keyof T, string | undefined>;
    }
  );
  const [touched, setTouchedState] = useState<Record<keyof T, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    for (const key of Object.keys(initialValues)) {
      initial[key] = false;
    }
    return initial as Record<keyof T, boolean>;
  });

  // Validate a single field
  const validateField = useCallback(
    (field: keyof T): string | undefined => {
      const value = values[field];
      const fieldSchema = schema[field];

      if (!fieldSchema) return undefined;

      for (const rule of fieldSchema.rules) {
        // Cast to handle generic types
        const isValid = rule.validate(value as Parameters<typeof rule.validate>[0]);
        if (!isValid) {
          setErrors((prev) => ({ ...prev, [field]: rule.message }));
          return rule.message;
        }
      }

      setErrors((prev) => ({ ...prev, [field]: undefined }));
      return undefined;
    },
    [values, schema]
  );

  // Validate all fields
  const validateAll = useCallback((): boolean => {
    let isValid = true;
    const newErrors: Record<string, string | undefined> = {};
    const newTouched: Record<string, boolean> = {};

    for (const field of Object.keys(schema) as Array<keyof T>) {
      const value = values[field];
      const fieldSchema = schema[field];
      newTouched[field as string] = true;

      for (const rule of fieldSchema.rules) {
        const ruleValid = rule.validate(value as Parameters<typeof rule.validate>[0]);
        if (!ruleValid) {
          newErrors[field as string] = rule.message;
          isValid = false;
          break;
        }
      }

      if (!newErrors[field as string]) {
        newErrors[field as string] = undefined;
      }
    }

    setErrors(newErrors as Record<keyof T, string | undefined>);
    setTouchedState(newTouched as Record<keyof T, boolean>);

    return isValid;
  }, [values, schema]);

  // Set a field value
  const setValue = useCallback(
    <K extends keyof T>(field: K, value: T[K]) => {
      setValues((prev) => ({ ...prev, [field]: value }));

      if (validateOnChange) {
        // Defer validation to next tick to use updated value
        setTimeout(() => {
          const fieldSchema = schema[field];
          if (fieldSchema) {
            for (const rule of fieldSchema.rules) {
              const isValid = rule.validate(value as Parameters<typeof rule.validate>[0]);
              if (!isValid) {
                setErrors((prev) => ({ ...prev, [field]: rule.message }));
                return;
              }
            }
            setErrors((prev) => ({ ...prev, [field]: undefined }));
          }
        }, 0);
      }
    },
    [validateOnChange, schema]
  );

  // Set a field as touched
  const setTouched = useCallback(
    (field: keyof T, isTouched = true) => {
      setTouchedState((prev) => ({ ...prev, [field]: isTouched }));

      if (validateOnBlur && isTouched) {
        validateField(field);
      }
    },
    [validateOnBlur, validateField]
  );

  // Reset to initial state
  const reset = useCallback(() => {
    setValues(initialValues);
    setErrors(() => {
      const initial: Record<string, string | undefined> = {};
      for (const key of Object.keys(initialValues)) {
        initial[key] = undefined;
      }
      return initial as Record<keyof T, string | undefined>;
    });
    setTouchedState(() => {
      const initial: Record<string, boolean> = {};
      for (const key of Object.keys(initialValues)) {
        initial[key] = false;
      }
      return initial as Record<keyof T, boolean>;
    });
  }, [initialValues]);

  // Get props for a field
  const getFieldProps = useCallback(
    (field: keyof T) => ({
      value: values[field],
      onChange: (value: T[keyof T]) => setValue(field, value as T[typeof field]),
      onBlur: () => setTouched(field, true),
      error: touched[field] ? errors[field] : undefined,
    }),
    [values, errors, touched, setValue, setTouched]
  );

  // Computed state
  const isValid = useMemo(() => {
    return Object.values(errors).every((e) => e === undefined);
  }, [errors]);

  const isDirty = useMemo(() => {
    return Object.keys(values).some(
      (key) => values[key as keyof T] !== initialValues[key as keyof T]
    );
  }, [values, initialValues]);

  return {
    values,
    errors,
    touched,
    isValid,
    isDirty,
    setValue,
    setTouched,
    validateField,
    validateAll,
    reset,
    getFieldProps,
  };
}

export default useValidation;
