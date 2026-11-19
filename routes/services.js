import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

const router = Router();

// Make user text safe to use inside a regex
const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const SORT_OPTIONS = {
  "price-asc": { basePrice: 1, createdAt: -1 },
  "price-desc": { basePrice: -1, createdAt: -1 },
  newest: { createdAt: -1 },
};

// GET /api/services?search=&category=&serviceMode=&sort=&limit=
router.get("/", async (req, res) => {
  const { search, category, serviceMode, sort, limit } = req.query;

  // Public pages: only approved + available
  const filter = { approvalStatus: "approved", isAvailable: true };

  if (typeof search === "string" && search.trim()) {
    const regex = new RegExp(escapeRegex(search.trim()), "i");
    filter.$or = [{ title: regex }, { category: regex }];
  }
  if (typeof category === "string" && category) filter.category = category;
  if (typeof serviceMode === "string" && serviceMode) {
    filter.serviceMode = serviceMode;
  }

  const sortBy = SORT_OPTIONS[sort] || SORT_OPTIONS.newest;

  let cursor = getDB().collection("services").find(filter).sort(sortBy);

  // Optional limit (home page uses limit=6)
  const max = parseInt(limit, 10);
  if (max > 0) cursor = cursor.limit(Math.min(max, 50));

  const services = await cursor.toArray();
  res.json({ success: true, message: "Services fetched", data: services });
});

// GET /api/services/:id
router.get("/:id", async (req, res) => {
  const { id } = req.params;

  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  const db = getDB();
  const service = await db.collection("services").findOne({
    _id: new ObjectId(id),
    approvalStatus: "approved",
    isAvailable: true,
  });

  if (!service) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  const technician = await db
    .collection("users")
    .findOne(
      { email: service.technicianEmail },
      { projection: { name: 1, image: 1, area: 1, bio: 1 } }
    );

  res.json({
    success: true,
    message: "Service fetched",
    data: {
      ...service,
      technician: {
        name: technician?.name || service.technicianName,
        image: technician?.image || null,
        area: technician?.area || "",
        bio: technician?.bio || "",
      },
    },
  });
});

export default router;