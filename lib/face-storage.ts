import { Storage } from "@google-cloud/storage";

// PRIVATE face-reference storage. Bytes are never public — they're streamed back
// only to their owner (via /api/face/[id]) or read server-side for generation.
let _storage: Storage | null = null;
function bucket() {
  const name = process.env.FACES_BUCKET;
  if (!name) return null;
  _storage ??= new Storage();
  return _storage.bucket(name);
}

export async function uploadFace(userId: string, data: Buffer, angle: string): Promise<string | null> {
  const b = bucket();
  if (!b) return null;
  const { randomUUID } = await import("node:crypto");
  const path = `faces/${userId}/${angle}-${randomUUID()}.png`;
  await b.file(path).save(data, { contentType: "image/png", resumable: false });
  return path;
}

export async function downloadFace(objectPath: string): Promise<Buffer | null> {
  const b = bucket();
  if (!b) return null;
  try {
    const [buf] = await b.file(objectPath).download();
    return buf;
  } catch {
    return null;
  }
}

export async function deleteFace(objectPath: string): Promise<void> {
  const b = bucket();
  if (!b) return;
  try {
    await b.file(objectPath).delete();
  } catch {
    /* already gone */
  }
}
