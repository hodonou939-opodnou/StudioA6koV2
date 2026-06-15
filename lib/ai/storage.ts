import { Storage } from "@google-cloud/storage";

// Persists generated images to Google Cloud Storage (you're already on GCP).
// Returns a public/signed URL stored on the Generation record.
const storage = new Storage();
const bucketName = process.env.GCS_BUCKET ?? "";

export async function persistImage(
  data: Buffer,
  contentType: string,
): Promise<string> {
  if (!bucketName) {
    // Dev fallback when no bucket is configured: inline data URL.
    return `data:${contentType};base64,${data.toString("base64")}`;
  }

  // Deterministic-ish name without Math.random/Date in shared libs is fine here
  // (runtime server code, not a workflow). Use crypto for uniqueness.
  const { randomUUID } = await import("node:crypto");
  const ext = contentType.split("/")[1] ?? "png";
  const objectName = `generations/${randomUUID()}.${ext}`;

  const file = storage.bucket(bucketName).file(objectName);
  await file.save(data, { contentType, resumable: false });

  return `https://storage.googleapis.com/${bucketName}/${objectName}`;
}
