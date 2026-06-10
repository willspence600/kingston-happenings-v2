import { supabaseAdmin } from './supabaseAdmin';

const BUCKET = 'event-images';
let bucketReady = false;

async function ensureBucket() {
  if (bucketReady) return;
  const { error } = await supabaseAdmin.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 5 * 1024 * 1024, // 5 MB
    allowedMimeTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
  });
  // 'already exists' is fine
  if (error && !error.message.includes('already exists')) {
    throw new Error(`Failed to create storage bucket: ${error.message}`);
  }
  bucketReady = true;
}

/**
 * Upload a base64 data URL to Supabase Storage and return the RELATIVE
 * public path (e.g. `/storage/v1/object/public/event-images/abc.jpg`).
 * Relative paths are resolved to absolute URLs at the API layer via
 * `getAbsoluteImageUrl`, so the storage host can differ per environment.
 * If the input is already an http(s):// URL, returns it as-is.
 */
export async function uploadImage(base64DataUrl: string, eventId: string): Promise<string> {
  if (!base64DataUrl) return '';
  if (base64DataUrl.startsWith('http://') || base64DataUrl.startsWith('https://')) {
    return base64DataUrl;
  }

  await ensureBucket();

  const match = base64DataUrl.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) throw new Error('Invalid image data URL');

  const mimeType = match[1];
  const ext = mimeType.split('/')[1] === 'jpeg' ? 'jpg' : mimeType.split('/')[1];
  const buffer = Buffer.from(match[2], 'base64');
  const path = `${eventId}.${ext}`;

  const { error } = await supabaseAdmin.storage
    .from(BUCKET)
    .upload(path, buffer, {
      contentType: mimeType,
      upsert: true,
    });

  if (error) throw new Error(`Storage upload failed: ${error.message}`);

  return `/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * Delete an image from Supabase Storage given its public URL or
 * relative storage path.
 */
export async function deleteImage(imageUrl: string): Promise<void> {
  if (!imageUrl) return;

  // Works for both absolute URLs and relative paths: extract the pathname
  // when it's a valid absolute URL, otherwise use the string directly.
  let pathname = imageUrl;
  try {
    pathname = new URL(imageUrl).pathname;
  } catch {
    // Not an absolute URL — treat it as a relative storage path
  }

  const parts = pathname.split(`/storage/v1/object/public/${BUCKET}/`);
  if (parts.length < 2 || !parts[1]) return;
  await supabaseAdmin.storage.from(BUCKET).remove([parts[1]]);
}
