import { Storage } from "@google-cloud/storage";
import { logger } from "../utils/logger";

const BUCKET_NAME = process.env.GCP_BUCKET_NAME || "galacash-bucket";
const PROJECT_ID = process.env.GCP_PROJECT_ID;

let storage: Storage | null = null;
let isGCPAvailable = false;

/**
 * Initialize GCP Storage with graceful error handling
 */
try {
  if (!PROJECT_ID) {
    logger.warn(
      "⚠️  GCP_PROJECT_ID not set. File uploads will be disabled. Set GCP credentials in .env to enable."
    );
  } else {
    storage = new Storage({
      projectId: PROJECT_ID,
      // Automatically uses GOOGLE_APPLICATION_CREDENTIALS env var
    });

    isGCPAvailable = true;
    logger.info("✅ GCP Storage initialized successfully");
  }
} catch (error) {
  logger.warn("⚠️  GCP Storage not available. File uploads will be disabled:", error);
  isGCPAvailable = false;
}

/**
 * Get GCP Storage bucket
 */
export function getBucket() {
  if (!storage || !isGCPAvailable) {
    throw new Error(
      "GCP Storage is not configured. Please set GCP_PROJECT_ID, GCP_BUCKET_NAME, and GOOGLE_APPLICATION_CREDENTIALS."
    );
  }
  return storage.bucket(BUCKET_NAME);
}

/**
 * Upload file to GCP Storage
 * @param file - Multer file object
 * @param folder - Folder path in bucket (e.g., 'avatars', 'payments', 'attachments')
 * @returns Public URL of uploaded file
 */
export async function uploadToGCS(file: Express.Multer.File, folder: string): Promise<string> {
  if (!isGCPAvailable) {
    throw new Error(
      "GCP Storage is not configured. Please set GCP credentials to enable file uploads."
    );
  }

  const bucket = getBucket();
  const fileName = `${folder}/${Date.now()}-${file.originalname.replace(/\s+/g, "-")}`;
  const blob = bucket.file(fileName);

  const blobStream = blob.createWriteStream({
    resumable: false,
    metadata: {
      contentType: file.mimetype,
    },
  });

  return new Promise((resolve, reject) => {
    blobStream.on("error", (error) => {
      logger.error("GCP upload error:", error);
      reject(new Error("File upload failed"));
    });

    blobStream.on("finish", async () => {
      // Make file publicly accessible
      //await blob.makePublic();
      

      // Generate public URL
      const publicUrl = `https://storage.googleapis.com/${BUCKET_NAME}/${fileName}`;

      logger.info(`File uploaded successfully: ${publicUrl}`);
      resolve(publicUrl);
    });

    blobStream.end(file.buffer);
  });
}

/**
 * Delete file from GCP Storage
 * @param fileUrl - Public URL of the file to delete
 */
export async function deleteFromGCS(fileUrl: string): Promise<void> {
  if (!isGCPAvailable) {
    logger.warn("GCP Storage not available, skipping file deletion");
    return;
  }

  try {
    // Extract file name from URL
    const fileName = fileUrl.split(`${BUCKET_NAME}/`)[1];
    if (!fileName) {
      throw new Error("Invalid file URL");
    }

    const bucket = getBucket();
    await bucket.file(fileName).delete();

    logger.info(`File deleted successfully: ${fileName}`);
  } catch (error) {
    logger.error("GCP delete error:", error);
    throw new Error("File deletion failed");
  }
}

export { isGCPAvailable, storage };
