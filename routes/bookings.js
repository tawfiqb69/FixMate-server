import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyCustomer } from "../middleware/verifyRole.js";

const router = Router();

const ACTIVE_STATUSES = ["requested", "accepted", "in-progress"];

// POST /api/bookings  (customer only)
router.post("/", verifyToken, verifyCustomer, async (req, res) => {
  const { serviceId, customerPhone, address, preferredDate, problemDescription } =
    req.body || {};

  // 1. Validate input
  if (!serviceId || !ObjectId.isValid(serviceId)) {
    return res.status(400).json({ success: false, message: "Invalid service" });
  }
  if (!customerPhone || String(customerPhone).trim().length < 6) {
    return res.status(400).json({ success: false, message: "Phone is required" });
  }
  if (!address || String(address).trim().length < 5) {
    return res.status(400).json({ success: false, message: "Address is required" });
  }
  if (!problemDescription || String(problemDescription).trim().length < 20) {
    return res.status(400).json({
      success: false,
      message: "Problem description must be at least 20 characters",
    });
  }

  // 2. Preferred date must be today or in the future
  const date = new Date(preferredDate);
  if (!preferredDate || isNaN(date.getTime())) {
    return res.status(400).json({ success: false, message: "Preferred date is invalid" });
  }
  const now = new Date();
  const todayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
  // one day of tolerance for time zones (for example Bangladesh is UTC+6)
  if (date.getTime() < todayUtc - 24 * 60 * 60 * 1000) {
    return res.status(400).json({
      success: false,
      message: "Preferred date must be today or a future date",
    });
  }

  const db = getDB();

  // 3. Service must exist, approved and available
  const service = await db.collection("services").findOne({
    _id: new ObjectId(serviceId),
    approvalStatus: "approved",
    isAvailable: true,
  });
  if (!service) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  // 4. Cannot request own service
  if (service.technicianEmail === req.user.email) {
    return res.status(403).json({
      success: false,
      message: "You cannot request your own service",
    });
  }

  // 5. No duplicate active request for the same service
  const existing = await db.collection("bookings").findOne({
    serviceId: String(service._id),
    customerEmail: req.user.email,
    status: { $in: ACTIVE_STATUSES },
  });
  if (existing) {
    return res.status(409).json({
      success: false,
      message: "You already have an active request for this service",
    });
  }

  // 6. Build the booking. Everything important comes from the DB or the token.
  const booking = {
    serviceId: String(service._id),
    serviceTitle: service.title,
    serviceImage: service.image,
    category: service.category,
    basePrice: service.basePrice,
    technicianName: service.technicianName,
    technicianEmail: service.technicianEmail,
    customerName: req.user.name,
    customerEmail: req.user.email,
    customerPhone: String(customerPhone).trim(),
    address: String(address).trim(),
    preferredDate: date,
    problemDescription: String(problemDescription).trim(),
    status: "requested",
    finalAmount: service.basePrice,
    paymentStatus: "unpaid",
    createdAt: new Date(),
  };

  const result = await db.collection("bookings").insertOne(booking);

  res.status(201).json({
    success: true,
    message: "Repair request sent",
    data: { ...booking, _id: result.insertedId },
  });
});

export default router;