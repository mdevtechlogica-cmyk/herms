import { supabase } from "@/lib/db";

const BUCKET = "rental-assets";
const MAX_EMBED_BYTES = 2 * 1024 * 1024;

function isBucketMissing(error: unknown): boolean {
  const msg = error instanceof Error ? error.message : String(error);
  return (
    msg.includes("Bucket not found") ||
    msg.includes("bucket not found") ||
    msg.includes("not found")
  );
}

function fileToDataUrl(file: File | Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("Could not read file"));
    reader.readAsDataURL(file);
  });
}

export async function uploadRentalAsset(
  file: File | Blob,
  path: string,
): Promise<string> {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    upsert: true,
    contentType: file instanceof File ? file.type : "image/png",
  });
  if (error) throw error;
  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return data.publicUrl;
}

/** Upload to storage, or embed small files if bucket is not set up yet. */
export async function uploadRentalAssetWithFallback(
  file: File | Blob,
  path: string,
): Promise<string> {
  try {
    return await uploadRentalAsset(file, path);
  } catch (error) {
    if (!isBucketMissing(error)) throw error;
    if (file.size > MAX_EMBED_BYTES) {
      throw new Error(
        "Document storage is not set up. Run supabase/CREATE_STORAGE_BUCKET.sql in Supabase SQL Editor, then try again.",
      );
    }
    return fileToDataUrl(file);
  }
}

export async function uploadDataUrl(dataUrl: string, path: string): Promise<string> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    return uploadRentalAssetWithFallback(blob, path);
  } catch (error) {
    if (isBucketMissing(error)) return dataUrl;
    throw error;
  }
}
