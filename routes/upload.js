import { Router } from "express";
import multer from "multer";
import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
});

// Run multer and return a friendly error if it fails
const readFile = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err) {
      const message =
        err.code === "LIMIT_FILE_SIZE"
          ? "Image must be 5MB or smaller"
          : "Invalid upload";
      return res.status(400).json({ success: false, message });
    }
    next();
  });
};

// POST /api/upload  (any logged-in user)
router.post("/", verifyToken, readFile, async (req, res) => {
  if (!req.file || !req.file.mimetype.startsWith("image/")) {
    return res
      .status(400)
      .json({ success: false, message: "Please upload an image file" });
  }

  const key = process.env.IMGBB_API_KEY;
  if (!key) {
    return res
      .status(500)
      .json({ success: false, message: "Image upload is not configured" });
  }

  const form = new FormData();
  form.append(
    "image",
    new Blob([req.file.buffer], { type: req.file.mimetype }),
    req.file.originalname
  );

  const response = await fetch(`https://api.imgbb.com/1/upload?key=${key}`, {
    method: "POST",
    body: form,
  });
  const result = await response.json();

  if (!response.ok || !result.success) {
    return res
      .status(502)
      .json({ success: false, message: "Image upload failed" });
  }

  res.json({
    success: true,
    message: "Image uploaded",
    data: { url: result.data.url },
  });
});

export default router;