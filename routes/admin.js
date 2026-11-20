import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyAdmin } from "../middleware/verifyRole.js";


const router = Router();

// Every route in this file is admin only
router.use(verifyToken, verifyAdmin);

const APPROVAL_STATUSES = ["pending", "approved", "rejected"];

// GET /api/admin/services?approvalStatus=pending
// All services from all technicians, pending first
router.get("/services", async (req, res) => {
  const { approvalStatus } = req.query;

  const filter = {};
  if (APPROVAL_STATUSES.includes(approvalStatus)) {
    filter.approvalStatus = approvalStatus;
  }

  const services = await getDB()
    .collection("services")
    .aggregate([
      { $match: filter },
      {
        $addFields: {
          pendingFirst: {
            $cond: [{ $eq: ["$approvalStatus", "pending"] }, 0, 1],
          },
        },
      },
      { $sort: { pendingFirst: 1, createdAt: -1 } },
      { $project: { pendingFirst: 0 } },
    ])
    .toArray();

  res.json({ success: true, message: "Services fetched", data: services });
});

// PATCH /api/admin/services/:id/approval   body: { approvalStatus }
router.patch("/services/:id/approval", async (req, res) => {
  const { id } = req.params;
  const { approvalStatus } = req.body || {};

  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }
  if (approvalStatus !== "approved" && approvalStatus !== "rejected") {
    return res.status(400).json({
      success: false,
      message: "approvalStatus must be approved or rejected",
    });
  }

  const result = await getDB()
    .collection("services")
    .findOneAndUpdate(
      { _id: new ObjectId(id) },
      { $set: { approvalStatus } },
      { returnDocument: "after" }
    );

  if (!result) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  res.json({
    success: true,
    message: `Service ${approvalStatus}`,
    data: result,
  });
});

const USER_ROLES = ["customer", "technician", "admin"];
const BOOKING_STATUSES = [
  "requested",
  "accepted",
  "rejected",
  "in-progress",
  "completed",
  "cancelled",
];

// GET /api/admin/users
router.get("/users", async (req, res) => {
  const users = await getDB()
    .collection("users")
    .find(
      {},
      { projection: { name: 1, email: 1, image: 1, role: 1, phone: 1, area: 1, createdAt: 1 } }
    )
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, message: "Users loaded", data: users });
});

// PATCH /api/admin/users/:id/role
router.patch("/users/:id/role", async (req, res) => {
  const { id } = req.params;
  const { role } = req.body || {};

  if (!USER_ROLES.includes(role)) {
    return res.status(400).json({
      success: false,
      message: "Role must be customer, technician or admin",
    });
  }
  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  const users = getDB().collection("users");

  // The id may be stored as an ObjectId or as a string, so try both
  const user = await users.findOne({ $or: [{ _id: new ObjectId(id) }, { _id: id }] });
  if (!user) {
    return res.status(404).json({ success: false, message: "User not found" });
  }

  // Admin cannot change their own role
  if (user.email === req.user.email) {
    return res.status(403).json({
      success: false,
      message: "You cannot change your own role",
    });
  }

  await users.updateOne({ _id: user._id }, { $set: { role } });

  res.json({
    success: true,
    message: "Role updated",
    data: { _id: user._id, email: user.email, role },
  });
});

// GET /api/admin/bookings  (optional ?status=)
router.get("/bookings", async (req, res) => {
  const filter = {};
  const { status } = req.query;
  if (status && BOOKING_STATUSES.includes(status)) {
    filter.status = status;
  }

  const bookings = await getDB()
    .collection("bookings")
    .find(filter)
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, message: "Bookings loaded", data: bookings });
});

export default router;