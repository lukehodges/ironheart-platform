import { z } from 'zod';

/**
 * Field types supported in public forms
 */
export type FieldType =
  | 'text'
  | 'textarea'
  | 'email'
  | 'phone'
  | 'dropdown'
  | 'checkbox'
  | 'date'
  | 'file';

export const FieldTypeSchema = z.enum([
  'text',
  'textarea',
  'email',
  'phone',
  'dropdown',
  'checkbox',
  'date',
  'file',
]);

/**
 * Base field configuration
 */
interface BaseFormField {
  id: string;
  label: string;
  placeholder: string | null;
  helpText: string | null;
  isRequired: boolean;
  validationRules: Record<string, unknown> | null;
}

/**
 * Text input field
 */
export interface TextFormField extends BaseFormField {
  type: 'text';
  minLength: number | null;
  maxLength: number | null;
}

/**
 * Textarea field
 */
export interface TextareaFormField extends BaseFormField {
  type: 'textarea';
  minLength: number | null;
  maxLength: number | null;
  rows: number | null;
}

/**
 * Email field
 */
export interface EmailFormField extends BaseFormField {
  type: 'email';
}

/**
 * Phone field
 */
export interface PhoneFormField extends BaseFormField {
  type: 'phone';
  format: string | null;
}

/**
 * Dropdown field
 */
export interface DropdownFormField extends BaseFormField {
  type: 'dropdown';
  options: Array<{ value: string; label: string }>;
  allowMultiple: boolean;
}

/**
 * Checkbox field
 */
export interface CheckboxFormField extends BaseFormField {
  type: 'checkbox';
  defaultChecked: boolean;
}

/**
 * Date field
 */
export interface DateFormField extends BaseFormField {
  type: 'date';
  minDate: string | null;
  maxDate: string | null;
}

/**
 * File upload field
 */
export interface FileFormField extends BaseFormField {
  type: 'file';
  allowedTypes: string[] | null;
  maxSizeMb: number | null;
  allowMultiple: boolean;
}

/**
 * Union of all field types
 */
export type PublicFormField =
  | TextFormField
  | TextareaFormField
  | EmailFormField
  | PhoneFormField
  | DropdownFormField
  | CheckboxFormField
  | DateFormField
  | FileFormField;

/**
 * Zod schemas for validation
 */
const BaseFormFieldSchema = z.object({
  id: z.uuid(),
  label: z.string(),
  placeholder: z.string().nullable(),
  helpText: z.string().nullable(),
  isRequired: z.boolean(),
  validationRules: z.record(z.string(), z.unknown()).nullable(),
});

export const TextFormFieldSchema = BaseFormFieldSchema.extend({
  type: z.literal('text'),
  minLength: z.number().int().nonnegative().nullable(),
  maxLength: z.number().int().positive().nullable(),
});

export const TextareaFormFieldSchema = BaseFormFieldSchema.extend({
  type: z.literal('textarea'),
  minLength: z.number().int().nonnegative().nullable(),
  maxLength: z.number().int().positive().nullable(),
  rows: z.number().int().positive().nullable(),
});

export const EmailFormFieldSchema = BaseFormFieldSchema.extend({
  type: z.literal('email'),
});

export const PhoneFormFieldSchema = BaseFormFieldSchema.extend({
  type: z.literal('phone'),
  format: z.string().nullable(),
});

export const DropdownFormFieldSchema = BaseFormFieldSchema.extend({
  type: z.literal('dropdown'),
  options: z.array(
    z.object({
      value: z.string(),
      label: z.string(),
    })
  ),
  allowMultiple: z.boolean(),
});

export const CheckboxFormFieldSchema = BaseFormFieldSchema.extend({
  type: z.literal('checkbox'),
  defaultChecked: z.boolean(),
});

export const DateFormFieldSchema = BaseFormFieldSchema.extend({
  type: z.literal('date'),
  minDate: z.string().nullable(),
  maxDate: z.string().nullable(),
});

export const FileFormFieldSchema = BaseFormFieldSchema.extend({
  type: z.literal('file'),
  allowedTypes: z.array(z.string()).nullable(),
  maxSizeMb: z.number().positive().nullable(),
  allowMultiple: z.boolean(),
});

export const PublicFormFieldSchema = z.discriminatedUnion('type', [
  TextFormFieldSchema,
  TextareaFormFieldSchema,
  EmailFormFieldSchema,
  PhoneFormFieldSchema,
  DropdownFormFieldSchema,
  CheckboxFormFieldSchema,
  DateFormFieldSchema,
  FileFormFieldSchema,
]);

/**
 * Form field value (for submission)
 */
export type FormFieldValue = string | string[] | boolean | File | File[] | null;

export const FormFieldValueSchema = z.union([
  z.string(),
  z.array(z.string()),
  z.boolean(),
  z.instanceof(File),
  z.array(z.instanceof(File)),
  z.null(),
]);

/**
 * Form step state for multi-step forms
 */
export interface FormStepState {
  currentStep: number;
  totalSteps: number;
  completedSteps: number[];
  fieldValues: Record<string, FormFieldValue>;
  errors: Record<string, string>;
}

export const FormStepStateSchema = z.object({
  currentStep: z.number().int().nonnegative(),
  totalSteps: z.number().int().positive(),
  completedSteps: z.array(z.number().int().nonnegative()),
  fieldValues: z.record(z.string(), FormFieldValueSchema),
  errors: z.record(z.string(), z.string()),
});
