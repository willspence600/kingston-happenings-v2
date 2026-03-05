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
 * Upload a base64 data URL to Supabase Storage and return the public URL.
 * If the input is already an https:// URL, returns it as-is.
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

  const { data } = supabaseAdmin.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Delete an image from Supabase Storage given its public URL.
 */
export async function deleteImage(publicUrl: string): Promise<void> {
  if (!publicUrl) return;
  const url = new URL(publicUrl);
  const parts = url.pathname.split(`/storage/v1/object/public/${BUCKET}/`);
  if (parts.length < 2) return;
  const path = parts[1];
  await supabaseAdmin.storage.from(BUCKET).remove([path]);
}
