import { Router } from "express";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyCustomer } from "../middleware/verifyRole.js";

const router = Router();

// Customer payment history (own payments only, email from the token)
router.get("/my", verifyToken, verifyCustomer, async (req, res) => {
  const payments = await getDB()
    .collection("payments")
    .find({ customerEmail: req.user.email })
    .sort({ paidAt: -1 })
    .toArray();
  res.json({ success: true, message: "Payments loaded", data: payments });
});

export default router;