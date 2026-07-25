import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../utils/logger.js';

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SECRET_KEY =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const STORAGE_BUCKET = process.env.SUPABASE_STORAGE_BUCKET || 'galacash';

export const isStorageAvailable = Boolean(SUPABASE_URL && SUPABASE_SECRET_KEY);

let supabaseAdmin: SupabaseClient | null = null;

function getSupabaseAdmin(): SupabaseClient {
  if (!isStorageAvailable || !SUPABASE_URL || !SUPABASE_SECRET_KEY) {
    throw new Error(
      'Supabase Storage is not configured. Set SUPABASE_URL and SUPABASE_SECRET_KEY.'
    );
  }

  if (!supabaseAdmin) {
    supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SECRET_KEY, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  return supabaseAdmin;
}

function sanitizeFileName(originalName: string): string {
  const baseName = originalName.split(/[\\/]/).pop() || 'upload';
  const sanitized = baseName.replace(/[^a-zA-Z0-9._-]/g, '-').replace(/-+/g, '-');
  return sanitized.slice(0, 180) || 'upload';
}

function getObjectPathFromPublicUrl(fileUrl: string): string | null {
  if (!SUPABASE_URL) {
    return null;
  }

  try {
    const file = new URL(fileUrl);
    const project = new URL(SUPABASE_URL);
    const marker = `/storage/v1/object/public/${encodeURIComponent(STORAGE_BUCKET)}/`;

    if (file.origin !== project.origin || !file.pathname.startsWith(marker)) {
      return null;
    }

    return decodeURIComponent(file.pathname.slice(marker.length));
  } catch {
    return null;
  }
}

/**
 * Upload a validated in-memory Multer file to a public Supabase Storage bucket.
 * The service key remains server-side and bypasses Storage RLS for this operation.
 */
export async function uploadToStorage(file: Express.Multer.File, folder: string): Promise<string> {
  const client = getSupabaseAdmin();
  const objectPath = `${folder}/${Date.now()}-${crypto.randomUUID()}-${sanitizeFileName(
    file.originalname
  )}`;

  const { error } = await client.storage.from(STORAGE_BUCKET).upload(objectPath, file.buffer, {
    cacheControl: '3600',
    contentType: file.mimetype,
    upsert: false,
  });

  if (error) {
    logger.error('Supabase Storage upload error:', error);
    throw new Error('File upload failed');
  }

  const { data } = client.storage.from(STORAGE_BUCKET).getPublicUrl(objectPath);
  logger.info(`File uploaded successfully: ${data.publicUrl}`);
  return data.publicUrl;
}

/**
 * Delete an object previously uploaded to the configured Supabase bucket.
 */
export async function deleteFromStorage(fileUrl: string): Promise<void> {
  if (!isStorageAvailable) {
    logger.warn('Supabase Storage is unavailable, skipping file deletion');
    return;
  }

  const objectPath = getObjectPathFromPublicUrl(fileUrl);
  if (!objectPath) {
    logger.warn('Skipping deletion for a URL outside the configured Supabase bucket');
    return;
  }

  const { error } = await getSupabaseAdmin().storage.from(STORAGE_BUCKET).remove([objectPath]);
  if (error) {
    logger.error('Supabase Storage delete error:', error);
    throw new Error('File deletion failed');
  }

  logger.info(`File deleted successfully: ${objectPath}`);
}
