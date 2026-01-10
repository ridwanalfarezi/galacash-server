import multer from "multer";
import { ValidationError } from "../utils/errors";

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MAX_AVATAR_SIZE = 5 * 1024 * 1024; // 5MB

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"];
const ALLOWED_DOCUMENT_TYPES = ["application/pdf", "image/jpeg", "image/png", "image/webp"];

/**
 * File filter for avatar uploads
 */
const avatarFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError("Only JPEG, PNG, and WebP images are allowed for avatars"));
  }
};

/**
 * File filter for payment proof uploads
 */
const paymentProofFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_IMAGE_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError("Only JPEG, PNG, and WebP images are allowed for payment proofs"));
  }
};

/**
 * File filter for attachment uploads
 */
const attachmentFileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (ALLOWED_DOCUMENT_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new ValidationError("Only PDF, JPEG, PNG, and WebP files are allowed for attachments"));
  }
};

/**
 * Multer configuration for avatar uploads
 */
export const uploadAvatar = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_AVATAR_SIZE,
  },
  fileFilter: avatarFileFilter,
});

/**
 * Multer configuration for payment proof uploads
 */
export const uploadPaymentProof = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: paymentProofFileFilter,
});

/**
 * Multer configuration for attachment uploads
 */
export const uploadAttachment = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE,
  },
  fileFilter: attachmentFileFilter,
});
