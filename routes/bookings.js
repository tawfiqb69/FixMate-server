import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyCustomer, verifyTechnician } from "../middleware/verifyRole.js";

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

// GET /api/bookings/my  (customer only, own bookings, newest first)
router.get("/my", verifyToken, verifyCustomer, async (req, res) => {
  const db = getDB();
  const bookings = await db
    .collection("bookings")
    .find({ customerEmail: req.user.email })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, message: "Bookings loaded", data: bookings });
});

// PATCH /api/bookings/:id/cancel  (customer only, owner only, requested only)
router.patch("/:id/cancel", verifyToken, verifyCustomer, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  const db = getDB();
  const bookings = db.collection("bookings");

  const booking = await bookings.findOne({ _id: new ObjectId(id) });
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  if (booking.customerEmail !== req.user.email) {
    return res.status(403).json({
      success: false,
      message: "You can only cancel your own booking",
    });
  }
  if (booking.status !== "requested") {
    return res.status(409).json({
      success: false,
      message: "Only a requested booking can be cancelled",
    });
  }

  // The status is checked again in the filter, so two clicks cannot conflict
  const result = await bookings.updateOne(
    { _id: booking._id, customerEmail: req.user.email, status: "requested" },
    { $set: { status: "cancelled" } }
  );
  if (result.modifiedCount === 0) {
    return res.status(409).json({
      success: false,
      message: "Only a requested booking can be cancelled",
    });
  }

  res.json({
    success: true,
    message: "Booking cancelled",
    data: { ...booking, status: "cancelled" },
  });
});


// Allowed status changes (technician only). Anything else is rejected.
const TECH_TRANSITIONS = {
  requested: ["accepted", "rejected"],
  accepted: ["in-progress"],
  "in-progress": ["completed"],
};
const ALL_STATUSES = [
  "requested",
  "accepted",
  "rejected",
  "in-progress",
  "completed",
  "cancelled",
];

// GET /api/bookings/technician  (technician only, own jobs, optional ?status=)
router.get("/technician", verifyToken, verifyTechnician, async (req, res) => {
  const filter = { technicianEmail: req.user.email };
  const { status } = req.query;
  if (status && ALL_STATUSES.includes(status)) {
    filter.status = status;
  }

  const bookings = await getDB()
    .collection("bookings")
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, message: "Requests loaded", data: bookings });
});

// PATCH /api/bookings/:id/status  (technician only, owner only, valid steps only)
router.patch("/:id/status", verifyToken, verifyTechnician, async (req, res) => {
  const { id } = req.params;
  const { status: nextStatus, finalAmount } = req.body || {};

  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }
  if (!ALL_STATUSES.includes(nextStatus)) {
    return res.status(400).json({ success: false, message: "Invalid status" });
  }

  const bookings = getDB().collection("bookings");
  const booking = await bookings.findOne({ _id: new ObjectId(id) });
  if (!booking) {
    return res.status(404).json({ success: false, message: "Booking not found" });
  }

  // Only the technician who owns the job
  if (booking.technicianEmail !== req.user.email) {
    return res.status(403).json({
      success: false,
      message: "You can only update your own jobs",
    });
  }

  // Only valid steps
  const allowed = TECH_TRANSITIONS[booking.status] || [];
  if (!allowed.includes(nextStatus)) {
    return res.status(409).json({
      success: false,
      message: `Cannot change status from ${booking.status} to ${nextStatus}`,
    });
  }

  const update = { status: nextStatus };

  // Completing needs a final amount greater than 0
  if (nextStatus === "completed") {
    if (typeof finalAmount !== "number" || !Number.isFinite(finalAmount) || finalAmount <= 0) {
      return res.status(400).json({
        success: false,
        message: "Final amount must be a number greater than 0",
      });
    }
    update.finalAmount = finalAmount;
  }

  // Current status is in the filter, so two quick clicks cannot both win
  const result = await bookings.updateOne(
    { _id: booking._id, technicianEmail: req.user.email, status: booking.status },
    { $set: update }
  );
  if (result.modifiedCount === 0) {
    return res.status(409).json({
      success: false,
      message: "This job was just updated. Please refresh.",
    });
  }

  res.json({
    success: true,
    message: "Status updated",
    data: { ...booking, ...update },
  });
});


export default router;