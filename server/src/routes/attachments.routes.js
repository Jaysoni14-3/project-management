import { Router } from "express";
import { requireAuth } from "../middleware/requireAuth.js";
import { validate } from "../middleware/validate.js";
import { presignSchema } from "../schemas/attachments.schema.js";
import { isR2Configured, presignUpload } from "../lib/r2.js";
import { badRequest } from "../lib/errors.js";

const router = Router();
router.use(requireAuth);

const safeFilename = (name) => name.replace(/[^a-zA-Z0-9._-]/g, "_");

const buildKey = (filename) => {
  const safe = safeFilename(filename);
  const rand = Math.random().toString(36).slice(2, 8);
  return `uploads/${Date.now()}-${rand}-${safe}`;
};

router.post("/presign", validate({ body: presignSchema }), async (req, res) => {
  if (!isR2Configured()) throw badRequest("File uploads are not configured");

  const results = await Promise.all(
    req.body.files.map(async (f) => {
      const storageKey = buildKey(f.filename);
      const uploadUrl = await presignUpload({
        key: storageKey,
        contentType: f.mimeType,
      });
      return {
        filename: f.filename,
        mimeType: f.mimeType,
        size: f.size,
        storageKey,
        uploadUrl,
      };
    })
  );

  res.json(results);
});

export default router;
