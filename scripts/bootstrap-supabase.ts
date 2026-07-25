import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
const bucketId = process.env.SUPABASE_STORAGE_BUCKET || "galacash";

if (!supabaseUrl || !supabaseSecretKey) {
  throw new Error(
    "SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are required"
  );
}

const supabase = createClient(supabaseUrl, supabaseSecretKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const bucketOptions = {
  public: true,
  allowedMimeTypes: [
    "image/jpeg",
    "image/png",
    "image/webp",
    "application/pdf",
  ],
  fileSizeLimit: "4MB",
};

const { data: existingBucket, error: getBucketError } =
  await supabase.storage.getBucket(bucketId);

if (existingBucket) {
  const { error } = await supabase.storage.updateBucket(bucketId, bucketOptions);
  if (error) {
    throw new Error(`Could not update Storage bucket: ${error.message}`);
  }
  console.log(`Updated Supabase Storage bucket "${bucketId}".`);
} else {
  const isNotFound =
    getBucketError?.message.toLowerCase().includes("not found") ||
    String((getBucketError as { statusCode?: string } | null)?.statusCode) === "404";

  if (getBucketError && !isNotFound) {
    throw new Error(`Could not inspect Storage bucket: ${getBucketError.message}`);
  }

  const { error } = await supabase.storage.createBucket(bucketId, bucketOptions);
  if (error) {
    throw new Error(`Could not create Storage bucket: ${error.message}`);
  }
  console.log(`Created Supabase Storage bucket "${bucketId}".`);
}

const { data: verifiedBucket, error: verifyError } =
  await supabase.storage.getBucket(bucketId);

if (verifyError || !verifiedBucket || !verifiedBucket.public) {
  throw new Error(
    `Storage bucket verification failed: ${verifyError?.message || "bucket is not public"}`
  );
}

console.log(`Verified public Supabase Storage bucket "${bucketId}".`);
