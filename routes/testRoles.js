import { Router } from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import {
  verifyCustomer,
  verifyTechnician,
  verifyAdmin,
} from "../middleware/verifyRole.js";

const router = Router();

// TEMPORARY test routes. Delete after Step 2.7 is tested.
router.get("/customer", verifyToken, verifyCustomer, (req, res) => {
  res.json({ success: true, message: "Customer OK", data: req.user });
});
router.get("/technician", verifyToken, verifyTechnician, (req, res) => {
  res.json({ success: true, message: "Technician OK", data: req.user });
});
router.get("/admin", verifyToken, verifyAdmin, (req, res) => {
  res.json({ success: true, message: "Admin OK", data: req.user });
});

export default router;