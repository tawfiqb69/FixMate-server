import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken.js";

const router = Router();

// TEMPORARY test route. Remove it later (or keep as "who am I").
router.get("/", verifyToken, (req, res) => {
  res.json({ success: true, message: "Token is valid", data: req.user });
});

export default router;