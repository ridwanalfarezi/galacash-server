import { isGCPAvailable, uploadToGCS } from "@/config/storage.config";
import { ValidationError } from "@/utils/errors";
import { logger } from "@/utils/logger";
import { NextFunction, Request, Response } from "express";

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

      if (!isGCPAvailable) {
        logger.warn("GCP Storage not available. File upload skipped.");
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
