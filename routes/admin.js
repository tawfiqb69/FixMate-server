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

export default router;