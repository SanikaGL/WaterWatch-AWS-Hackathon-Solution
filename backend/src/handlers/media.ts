// Presigned S3 upload URL for report/flood/cleanup media.
import { nanoid } from "nanoid";
import { ok, badRequest, type HttpRequest, type HttpResponse } from "../http/types.js";
import { config } from "../domain/config.js";

const ALLOWED_PREFIX = ["reports", "floods", "cleanup/before", "cleanup/after", "awareness", "avatars", "posts"];
const ALLOWED_CONTENT = ["image/jpeg", "image/png", "image/webp", "video/mp4"];

// POST /media/presign { prefix, contentType }
export async function presignUpload(req: HttpRequest): Promise<HttpResponse> {
  const b = (req.body ?? {}) as Record<string, unknown>;
  const prefix = String(b.prefix ?? "reports");
  const contentType = String(b.contentType ?? "image/jpeg");

  if (!ALLOWED_PREFIX.includes(prefix)) return badRequest(`prefix must be one of ${ALLOWED_PREFIX.join(", ")}`);
  if (!ALLOWED_CONTENT.includes(contentType)) return badRequest(`contentType must be one of ${ALLOWED_CONTENT.join(", ")}`);

  const ext = contentType.split("/")[1].replace("jpeg", "jpg");
  const key = `${prefix}/${new Date().toISOString().slice(0, 10)}/${nanoid(16)}.${ext}`;

  // Local dev: no real S3. Return a fake URL so the frontend flow works offline.
  if (config.IS_LOCAL || !process.env.MEDIA_BUCKET) {
    return ok({
      uploadUrl: `http://localhost:4000/__local_s3__/${encodeURIComponent(key)}`,
      key,
      publicUrl: `http://localhost:4000/__local_s3__/${encodeURIComponent(key)}`,
      simulated: true,
    });
  }

  const { S3Client } = await import("@aws-sdk/client-s3");
  const { PutObjectCommand } = await import("@aws-sdk/client-s3");
  const { getSignedUrl } = await import("@aws-sdk/s3-request-presigner");
  const s3 = new S3Client({ region: config.AWS_REGION });
  const command = new PutObjectCommand({
    Bucket: config.MEDIA_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  const uploadUrl = await getSignedUrl(s3, command, { expiresIn: 300 });
  const publicUrl = `https://${config.MEDIA_BUCKET}.s3.${config.AWS_REGION}.amazonaws.com/${key}`;
  return ok({ uploadUrl, key, publicUrl, simulated: false });
}
