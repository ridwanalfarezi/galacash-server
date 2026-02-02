import { isGCPAvailable, uploadToGCS } from "@/config/storage.config";
import { ValidationError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { NextFunction, Request, Response } from "express";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/jpg",
  "application/pdf",
];

/**
 * Validate file size and type
 */
const validateFile = (file: Express.Multer.File): void => {
  // Check file size
  if (file.size > MAX_FILE_SIZE) {
    throw new ValidationError(
      `File size exceeds maximum allowed size of ${MAX_FILE_SIZE / 1024 / 1024}MB`
    );
  }

  // Check mime type
  if (!ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    throw new ValidationError(
      "Invalid file type. Only JPEG, PNG, WebP images and PDF documents are allowed."
    );
  }

  // Additional check for file extension
  const allowedExtensions = [".jpg", ".jpeg", ".png", ".webp", ".pdf"];
  const fileExtension = file.originalname.toLowerCase().slice(file.originalname.lastIndexOf("."));

  if (!allowedExtensions.includes(fileExtension)) {
    throw new ValidationError(
      "Invalid file extension. Only .jpg, .jpeg, .png, .webp, and .pdf files are allowed."
    );
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
        next(new ValidationError("File is required"));
        return;
      }

      // Validate file before upload
      validateFile(req.file);

      if (!isGCPAvailable) {
        logger.warn("GCP Storage not available. File upload skipped.");

        // In test mode, allow file uploads to proceed with a mock URL
        if (process.env.NODE_ENV === "test") {
          req.fileUrl = `mock://test-uploads/${folder}/${req.file.originalname}`;
          logger.info(`Mock file URL generated for testing: ${req.fileUrl}`);
          next();
          return;
        }

        next(
          new ValidationError(
            "File uploads are currently disabled. Please configure GCP credentials."
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
      logger.error("File upload error:", error);
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
        logger.warn("GCP Storage not available. File upload skipped.");
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
      logger.error("File upload error:", error);
      next(error);
    }
  };
};
