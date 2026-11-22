/**
 * Image Upload Service
 * Handles file validation, storage, and unique filename generation
 */

import { randomBytes } from 'crypto';
import { join } from 'path';
import { mkdir, writeFile } from 'fs/promises';
import { existsSync } from 'fs';

// Configuration
const ALLOWED_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'public/uploads';

// Response types
export interface UploadResult {
  success: boolean;
  filePath?: string;
  fileName?: string;
  error?: string;
}

export interface FileValidation {
  valid: boolean;
  error?: string;
}

/**
 * Validate file type
 */
export function validateFile(mimeType: string): FileValidation {
  if (!ALLOWED_MIME_TYPES.includes(mimeType)) {
    return {
      valid: false,
      error: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}`,
    };
  }
  return { valid: true };
}

/**
 * Validate file size
 */
export function validateFileSize(size: number): FileValidation {
  if (size > MAX_FILE_SIZE) {
    return {
      valid: false,
      error: `File too large. Maximum size: ${MAX_FILE_SIZE / 1024 / 1024}MB`,
    };
  }
  return { valid: true };
}

/**
 * Generate unique filename to prevent collisions
 */
export function generateUniqueFilename(originalName: string): string {
  const timestamp = Date.now();
  const random = randomBytes(8).toString('hex');
  const extension = originalName.split('.').pop() || 'jpg';
  return `${timestamp}-${random}.${extension}`;
}

/**
 * Ensure upload directory exists
 */
async function ensureUploadDir(): Promise<string> {
  const fullPath = join(process.cwd(), UPLOAD_DIR);
  if (!existsSync(fullPath)) {
    await mkdir(fullPath, { recursive: true });
  }
  return fullPath;
}

/**
 * Save uploaded file to disk
 */
export async function saveUploadedFile(
  buffer: Buffer,
  mimeType: string,
  originalName: string
): Promise<UploadResult> {
  // Validate file type
  const typeValidation = validateFile(mimeType);
  if (!typeValidation.valid) {
    return {
      success: false,
      error: typeValidation.error,
    };
  }

  // Ensure upload directory exists
  const uploadPath = await ensureUploadDir();

  // Generate unique filename
  const fileName = generateUniqueFilename(originalName);
  const filePath = join(uploadPath, fileName);

  try {
    // Write file to disk
    await writeFile(filePath, buffer);

    // Return the public URL path
    const publicPath = `/uploads/${fileName}`;

    return {
      success: true,
      filePath: filePath,
      fileName: publicPath,
    };
  } catch (error) {
    console.error('Failed to save uploaded file:', error);
    return {
      success: false,
      error: 'Failed to save file',
    };
  }
}

/**
 * Parse multipart form data
 */
export async function parseMultipartFormData(
  body: Buffer,
  boundary: string
): Promise<{ fields: Record<string, string>; files: Record<string, { buffer: Buffer; mimeType: string; name: string }> }> {
  const fields: Record<string, string> = {};
  const files: Record<string, { buffer: Buffer; mimeType: string; name: string }> = {};

  const parts = body.toString('utf-8').split(`--${boundary}`);
  const boundaryMarker = `\r\n--${boundary}`;

  for (const part of parts) {
    if (!part || part === '--\r\n' || part === '--') continue;

    const headerEndIndex = part.indexOf('\r\n\r\n');
    if (headerEndIndex === -1) continue;

    const headers = part.substring(0, headerEndIndex);
    const content = part.substring(headerEndIndex + 4);

    // Remove trailing boundary markers
    const cleanContent = content.replace(/-\r\n$/, '');

    // Parse content-disposition
    const nameMatch = headers.match(/name="([^"]+)"/);
    const filenameMatch = headers.match(/filename="([^"]+)"/);
    const typeMatch = headers.match(/Content-Type:\s*([^\s\r\n]+)/i);

    if (!nameMatch) continue;

    const fieldName = nameMatch[1];

    if (filenameMatch && typeMatch) {
      // This is a file
      files[fieldName] = {
        buffer: Buffer.from(cleanContent, 'base64'),
        mimeType: typeMatch[1],
        name: filenameMatch[1],
      };
    } else {
      // This is a field
      fields[fieldName] = cleanContent;
    }
  }

  return { fields, files };
}