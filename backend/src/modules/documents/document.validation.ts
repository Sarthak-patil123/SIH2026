import { Request } from "express";

export interface ValidationError {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validates LLM override options passed as form fields or query params.
 * These optional fields allow callers to supply a custom LLM model/key at request time.
 */
export function validateLLMOptions(req: Request): ValidationResult {
  const errors: ValidationError[] = [];
  const { llm_api_base } = req.body;

  if (llm_api_base) {
    try {
      new URL(llm_api_base as string);
    } catch {
      errors.push({
        field: "llm_api_base",
        message: "llm_api_base must be a valid URL (e.g. https://api.openai.com/v1)",
      });
    }
  }

  return { valid: errors.length === 0, errors };
}

/**
 * Validates that a required file field is present in a multer-processed request.
 *
 * @param req         Express request
 * @param fieldNames  One or more acceptable multer field names (first match wins)
 */
export function validateRequiredFile(
  req: Request,
  ...fieldNames: string[]
): ValidationResult {
  const files = req.files as
    | { [fieldname: string]: Express.Multer.File[] }
    | undefined;

  const found = fieldNames.some((name) => {
    if (req.file?.fieldname === name) return true;
    if (files?.[name]?.[0]) return true;
    return false;
  });

  if (!found) {
    return {
      valid: false,
      errors: [
        {
          field: fieldNames[0],
          message: `A file is required. Upload it as one of: ${fieldNames.join(", ")}`,
        },
      ],
    };
  }

  return { valid: true, errors: [] };
}

/** Multer file size limit in bytes (25 MB — matches document.routes.ts) */
export const UPLOAD_MAX_SIZE_BYTES = 25 * 1024 * 1024;

/** Allowed MIME types for uploaded document images */
export const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/tiff",
  "application/pdf",
];

/**
 * Validates the MIME type of an uploaded file.
 */
export function validateFileMimeType(file: Express.Multer.File): ValidationResult {
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    return {
      valid: false,
      errors: [
        {
          field: file.fieldname,
          message: `Unsupported file type '${file.mimetype}'. Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
        },
      ],
    };
  }
  return { valid: true, errors: [] };
}

/** Exported as schema-compatible object for backward compatibility */
export const uploadDocSchema = {
  validateLLMOptions,
  validateRequiredFile,
  validateFileMimeType,
  UPLOAD_MAX_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
};
