import { Router } from "express";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";


const router = Router();

// PATCH /api/users/profile  (any logged-in user, only own profile)
router.patch("/profile", verifyToken, async (req, res) => {
  const { name, phone, area, bio, image } = req.body || {};
  const update = {};

  if (typeof name !== "string" || name.trim().length < 2) {
    return res.status(400).json({ success: false, message: "Name must be at least 2 characters" });
  }
  update.name = name.trim();

  if (phone !== undefined) {
    if (typeof phone !== "string" || phone.trim().length > 20) {
      return res.status(400).json({ success: false, message: "Phone is too long" });
    }
    update.phone = phone.trim();
  }
  if (area !== undefined) {
    if (typeof area !== "string" || area.trim().length > 100) {
      return res.status(400).json({ success: false, message: "Area is too long" });
    }
    update.area = area.trim();
  }


  const imageUrl = typeof image === "string" ? image.trim() : "";

  if (imageUrl) {
    if (!imageUrl.startsWith("https://") || imageUrl.length > 500) {
      return res.status(400).json({ success: false, message: "Invalid image URL" });
    }
    update.image = imageUrl;
  }


  if (image !== undefined) {
    if (typeof image !== "string" || !image.startsWith("https://") || image.length > 500) {
      return res.status(400).json({ success: false, message: "Invalid image URL" });
    }
    update.image = image;
  }

  // email and role are never read from the body
  update.updatedAt = new Date();

  await getDB()
    .collection("users")
    .updateOne({ email: req.user.email }, { $set: update });

  res.json({
    success: true,
    message: "Profile updated",
    data: {
      name: update.name,
      phone: update.phone,
      area: update.area,
      bio: update.bio,
      image: update.image,
    },
  });
});

export default router;