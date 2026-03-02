"use node";

/**
 * Field-level encryption for HIPAA compliance
 *
 * Uses AES-256-GCM for encryption at rest.
 * Requires PHI_ENCRYPTION_KEY environment variable (64-character hex string = 32 bytes).
 *
 * Usage:
 *   npx convex env set PHI_ENCRYPTION_KEY "your-64-char-hex-key"
 *
 * Generate a key:
 *   node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
 */

import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16; // 128 bits
const AUTH_TAG_LENGTH = 16; // 128 bits

/**
 * Get the encryption key from environment
 * @throws Error if PHI_ENCRYPTION_KEY is not configured
 */
function getEncryptionKey(): Buffer {
  const key = process.env.PHI_ENCRYPTION_KEY;
  if (!key) {
    throw new Error(
      "PHI_ENCRYPTION_KEY not configured. Set it with: npx convex env set PHI_ENCRYPTION_KEY <64-char-hex>"
    );
  }
  if (key.length !== 64) {
    throw new Error(
      "PHI_ENCRYPTION_KEY must be a 64-character hex string (32 bytes)"
    );
  }
  return Buffer.from(key, "hex");
}

/**
 * Check if encryption is configured
 */
export function isEncryptionConfigured(): boolean {
  const key = process.env.PHI_ENCRYPTION_KEY;
  return !!key && key.length === 64;
}

/**
 * Encrypt a plaintext string
 * @param plaintext - The string to encrypt
 * @returns Encrypted string in format: iv:authTag:ciphertext (hex encoded)
 */
export function encryptField(plaintext: string): string {
  if (!plaintext) return plaintext;

  const key = getEncryptionKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(plaintext, "utf8", "hex");
  encrypted += cipher.final("hex");
  const authTag = cipher.getAuthTag();

  // Format: iv:authTag:ciphertext
  return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypt an encrypted string
 * @param ciphertext - The encrypted string in format: iv:authTag:ciphertext
 * @returns Decrypted plaintext string
 */
export function decryptField(ciphertext: string): string {
  if (!ciphertext) return ciphertext;

  // Check if this is actually encrypted (has the format iv:authTag:data)
  if (!isEncryptedFormat(ciphertext)) {
    // Return as-is if not encrypted (legacy data)
    return ciphertext;
  }

  const key = getEncryptionKey();
  const [ivHex, authTagHex, encrypted] = ciphertext.split(":");

  const iv = Buffer.from(ivHex, "hex");
  const authTag = Buffer.from(authTagHex, "hex");

  const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");

  return decrypted;
}

/**
 * Check if a string is in encrypted format
 * @param value - The string to check
 * @returns true if the string appears to be encrypted
 */
export function isEncryptedFormat(value: string): boolean {
  if (!value) return false;

  const parts = value.split(":");
  if (parts.length !== 3) return false;

  const [ivHex, authTagHex, encrypted] = parts;

  // Check that each part is valid hex
  const hexRegex = /^[0-9a-f]+$/i;

  return (
    ivHex.length === IV_LENGTH * 2 &&
    hexRegex.test(ivHex) &&
    authTagHex.length === AUTH_TAG_LENGTH * 2 &&
    hexRegex.test(authTagHex) &&
    encrypted.length > 0 &&
    hexRegex.test(encrypted)
  );
}

/**
 * Encrypt sensitive PHI fields in an object
 * @param data - Object containing PHI fields
 * @param fieldsToEncrypt - Array of field names to encrypt
 * @returns Object with specified fields encrypted
 */
export function encryptPHIFields<T extends Record<string, unknown>>(
  data: T,
  fieldsToEncrypt: (keyof T)[]
): T {
  if (!isEncryptionConfigured()) {
    console.warn("PHI encryption not configured - storing fields in plaintext");
    return data;
  }

  const result = { ...data };

  for (const field of fieldsToEncrypt) {
    const value = result[field];
    if (typeof value === "string" && value) {
      (result as Record<string, unknown>)[field as string] = encryptField(value);
    }
  }

  return result;
}

/**
 * Decrypt sensitive PHI fields in an object
 * @param data - Object containing encrypted PHI fields
 * @param fieldsToDecrypt - Array of field names to decrypt
 * @returns Object with specified fields decrypted
 */
export function decryptPHIFields<T extends Record<string, unknown>>(
  data: T,
  fieldsToDecrypt: (keyof T)[]
): T {
  if (!isEncryptionConfigured()) {
    return data;
  }

  const result = { ...data };

  for (const field of fieldsToDecrypt) {
    const value = result[field];
    if (typeof value === "string" && value) {
      (result as Record<string, unknown>)[field as string] = decryptField(value);
    }
  }

  return result;
}

/**
 * List of PHI fields that should be encrypted
 * Based on HIPAA regulations for Protected Health Information
 */
export const ENCRYPTED_PHI_FIELDS = {
  // Patient/Athlete identifiers
  patient: [
    "insurancePolicyNumber",
    "insuranceGroupNumber",
    "secondaryInsurancePolicyNumber",
    "secondaryInsuranceGroupNumber",
  ],
  // Medical history fields (optional encryption for additional security)
  medicalHistory: [
    "allergies",
    "medications",
    "medicalConditions",
    "previousSurgeries",
  ],
  // EHR integration tokens
  ehrIntegration: ["accessToken", "refreshToken"],
} as const;
