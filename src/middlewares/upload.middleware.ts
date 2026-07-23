import { isGCPAvailable, uploadToGCS } from '@/config/storage.config';
import { ValidationError } from '@/utils/errors';
import { logger } from '@/utils/logger';
import { NextFunction, Request, Response } from 'express';

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/jpg',
  'application/pdf',
];

// ---------------------------------------------------------------------------
// Magic-byte (file signature) validation
// ---------------------------------------------------------------------------
// Each MIME type maps to one or more candidate signatures. A candidate is a
// list of { offset, bytes } probes that ALL must match for the candidate to
// pass. Any one passing candidate is enough to accept the file.
//
// This is the only reliable way to verify file type — file.mimetype and
// file.originalname are both attacker-controlled strings from the HTTP
// request and MUST NOT be trusted on their own.
// ---------------------------------------------------------------------------
interface MagicProbe {
  offset: number;
  bytes: number[];
}

type FileSignature = MagicProbe[]; // all probes must match

const MAGIC_SIGNATURES: Record<string, FileSignature[]> = {
  'image/jpeg': [[{ offset: 0, bytes: [0xff, 0xd8, 0xff] }]],
  'image/jpg': [[{ offset: 0, bytes: [0xff, 0xd8, 0xff] }]],
  'image/png': [[{ offset: 0, bytes: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] }]],
  // WebP: RIFF????WEBP — bytes 0-3 and 8-11 are fixed; bytes 4-7 are file size
  'image/webp': [
    [
      { offset: 0, bytes: [0x52, 0x49, 0x46, 0x46] }, // "RIFF"
      { offset: 8, bytes: [0x57, 0x45, 0x42, 0x50] }, // "WEBP"
    ],
  ],
  'application/pdf': [[{ offset: 0, bytes: [0x25, 0x50, 0x44, 0x46] }]], // "%PDF"
};

const MIN_BUFFER_SIZE = 12; // enough to cover the longest signature above

function hasMagicBytes(buffer: Buffer, mimetype: string): boolean {
  if (buffer.length < MIN_BUFFER_SIZE) return false;

  const candidates = MAGIC_SIGNATURES[mimetype];
  if (!candidates) return false;

  return candidates.some((probes) =>
    probes.every(({ offset, bytes }) => bytes.every((byte, i) => buffer[offset + i] === byte))
  );
}

/**
 * Validate file size, declared MIME type, extension, and actual file content.
 * The magic-byte check is the authoritative gate — MIME type and extension
 * checks only run first to fail fast on obviously wrong requests.
 */
const validateFile = (file: Express.Multer.File): void => {
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new ValidationError(
      'Invalid file type. Only JPEG, PNG, WebP images and PDF documents are allowed.'
    );
  }

  const allowedExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
  const ext = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf('.'));
  if (!allowedExtensions.includes(ext)) {
    throw new ValidationError(
      'Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .pdf files are allowed.'
    );
  }

  // Magic-byte check — reads actual file bytes, not the attacker-supplied headers
  if (!hasMagicBytes(file.buffer, file.mimetype)) {
    throw new ValidationError('File content does not match the declared file type.');
  }
};

/**
 * Handle file upload to GCP Storage
 * Uploads file and attaches the public URL to req.fileUrl
 */
export const handleFileUpload = (folder: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        next(new ValidationError('File is required'));
        return;
      }

      // Validate file before upload
      validateFile(req.file);

      if (!isGCPAvailable) {
        logger.warn('GCP Storage not available. File upload skipped.');

        // In test mode, allow file uploads to proceed with a mock URL
        if (process.env.NODE_ENV === 'test') {
          req.fileUrl = `mock://test-uploads/${folder}/${req.file.originalname}`;
          logger.info(`Mock file URL generated for testing: ${req.fileUrl}`);
          next();
          return;
        }

        next(
          new ValidationError(
            'File uploads are currently disabled. Please configure GCP credentials.'
          )
        );
        return;
      }

      // Upload to GCP
      const fileUrl = await uploadToGCS(req.file, folder);

      // Attach URL to request
      req.fileUrl = fileUrl;

      logger.info(`File uploaded successfully: ${fileUrl}`);
      next();
    } catch (error) {
      logger.error('File upload error:', error);
      next(error);
    }
  };
};

/**
 * Make file upload optional
 * If file exists, upload it; otherwise continue
 */
export const handleOptionalFileUpload = (folder: string) => {
  return async (req: Request, _res: Response, next: NextFunction): Promise<void> => {
    try {
      if (!req.file) {
        // No file uploaded, continue
        next();
        return;
      }

      // Validate file before upload
      validateFile(req.file);

      if (!isGCPAvailable) {
        logger.warn('GCP Storage not available. File upload skipped.');

        if (process.env.NODE_ENV === 'test') {
          req.fileUrl = `mock://test-uploads/${folder}/${req.file.originalname}`;
          next();
          return;
        }

        next();
        return;
      }

      // Upload to GCP
      const fileUrl = await uploadToGCS(req.file, folder);

      // Attach URL to request
      req.fileUrl = fileUrl;

      logger.info(`File uploaded successfully: ${fileUrl}`);
      next();
    } catch (error) {
      logger.error('File upload error:', error);
      next(error);
    }
  };
};
