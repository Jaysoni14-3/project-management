import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

const accountId = process.env.R2_ACCOUNT_ID;

export const r2 =
  accountId && process.env.R2_ACCESS_KEY_ID && process.env.R2_SECRET_ACCESS_KEY
    ? new S3Client({
        region: "auto",
        endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
        },
      })
    : null;

export const isR2Configured = () => Boolean(r2 && process.env.R2_BUCKET);

export const presignUpload = async ({ key, contentType, expiresIn = 300 }) => {
  if (!isR2Configured()) throw new Error("R2 is not configured");
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(r2, command, { expiresIn });
};

export const deleteFromR2 = async (key) => {
  if (!isR2Configured()) return;
  await r2.send(
    new DeleteObjectCommand({
      Bucket: process.env.R2_BUCKET,
      Key: key,
    })
  );
};

export const publicUrl = (key) => {
  const base = process.env.R2_PUBLIC_URL_BASE;
  if (!base) return null;
  return `${base.replace(/\/$/, "")}/${key}`;
};
