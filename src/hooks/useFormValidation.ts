import { useState, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';

// Validation rule types
interface ValidationRule {
  required?: boolean;
  minLength?: number;
  maxLength?: number;
  pattern?: RegExp;
  custom?: (value: unknown) => string | null; // returns error message or null
}

type ValidationSchema<T> = {
  [K in keyof T]?: ValidationRule;
};

interface UseFormValidationReturn<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  handleChange: (field: keyof T, value: T[keyof T]) => void;
  handleBlur: (field: keyof T) => void;
  handleSubmit: (onSubmit: (values: T) => void | Promise<void>) => (e?: React.FormEvent) => void;
  setFieldValue: (field: keyof T, value: T[keyof T]) => void;
  setFieldError: (field: keyof T, error: string) => void;
  isValid: boolean;
  reset: () => void;
}

export function useFormValidation<T extends Record<string, unknown>>(
  schema: ValidationSchema<T>,
  initialValues: T
): UseFormValidationReturn<T> {
  const { t } = useTranslation();
  const [values, setValues] = useState<T>(initialValues);
  const [touched, setTouched] = useState<Partial<Record<keyof T, boolean>>>({});
  const [manualErrors, setManualErrors] = useState<Partial<Record<keyof T, string>>>({});

  const validate = useCallback(
    (field: keyof T, value: unknown): string | null => {
      const rule = schema[field];
      if (!rule) return null;

      if (rule.required) {
        if (value === undefined || value === null || value === '') {
          return t('admin.form.required');
        }
      }

      if (typeof value === 'string') {
        if (rule.minLength !== undefined && value.length < rule.minLength) {
          return t('admin.form.minLength', { min: rule.minLength });
        }

        if (rule.maxLength !== undefined && value.length > rule.maxLength) {
          return t('admin.form.maxLength', { max: rule.maxLength });
        }

        if (rule.pattern && !rule.pattern.test(value)) {
          return t('admin.form.invalidFormat');
        }
      }

      if (rule.custom) {
        return rule.custom(value);
      }

      return null;
    },
    [schema, t]
  );

  const errors = useMemo(() => {
    const result: Partial<Record<keyof T, string>> = {};
    for (const field of Object.keys(schema) as Array<keyof T>) {
      const error = validate(field, values[field]);
      if (error) {
        result[field] = error;
      }
    }
    // Merge manual errors (manual errors take precedence)
    for (const [field, error] of Object.entries(manualErrors)) {
      if (error) {
        result[field as keyof T] = error as string;
      }
    }
    return result;
  }, [schema, values, validate, manualErrors]);

  const isValid = useMemo(() => Object.keys(errors).length === 0, [errors]);

  const handleChange = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    // Clear manual error when user changes the field
    setManualErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const handleBlur = useCallback((field: keyof T) => {
    setTouched((prev) => ({ ...prev, [field]: true }));
  }, []);

  const setFieldValue = useCallback((field: keyof T, value: T[keyof T]) => {
    setValues((prev) => ({ ...prev, [field]: value }));
    setManualErrors((prev) => {
      if (prev[field]) {
        const next = { ...prev };
        delete next[field];
        return next;
      }
      return prev;
    });
  }, []);

  const setFieldError = useCallback((field: keyof T, error: string) => {
    setManualErrors((prev) => ({ ...prev, [field]: error }));
  }, []);

  const handleSubmit = useCallback(
    (onSubmit: (values: T) => void | Promise<void>) => {
      return (e?: React.FormEvent) => {
        if (e) {
          e.preventDefault();
        }

        // Mark all fields as touched
        const allTouched: Partial<Record<keyof T, boolean>> = {};
        for (const field of Object.keys(schema) as Array<keyof T>) {
          allTouched[field] = true;
        }
        setTouched(allTouched);

        // Only submit if valid
        if (isValid) {
          onSubmit(values);
        }
      };
    },
    [schema, isValid, values]
  );

  const reset = useCallback(() => {
    setValues(initialValues);
    setTouched({});
    setManualErrors({});
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    setFieldError,
    isValid,
    reset,
  };
}
