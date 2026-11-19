import { Router } from "express";
import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyTechnician } from "../middleware/verifyRole.js";

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



const CATEGORIES = [
  "Smartphone", "Laptop & PC", "AC", "Refrigerator",
  "TV", "Washing Machine", "Electrical",
];
const SERVICE_MODES = ["Home Visit", "Shop Drop-off"];

// POST /api/services  (technician only)
router.post("/", verifyToken, verifyTechnician, async (req, res) => {
  const b = req.body || {};
  const text = (v) => (typeof v === "string" ? v.trim() : "");

  const title = text(b.title);
  const category = text(b.category);
  const description = text(b.description);
  const image = text(b.image);
  const estimatedDuration = text(b.estimatedDuration);
  const serviceMode = text(b.serviceMode);
  const serviceArea = text(b.serviceArea);
  const basePrice = Number(b.basePrice);

  if (!title || !description || !image || !estimatedDuration || !serviceArea) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }
  if (!CATEGORIES.includes(category)) {
    return res.status(400).json({ success: false, message: "Invalid category" });
  }
  if (!SERVICE_MODES.includes(serviceMode)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid service mode" });
  }
  if (!Number.isFinite(basePrice) || basePrice <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Base price must be greater than 0" });
  }

  // Owner and status come from the server, never from the browser
  const service = {
    title,
    category,
    description,
    image,
    basePrice,
    estimatedDuration,
    serviceMode,
    serviceArea,
    technicianName: req.user.name,
    technicianEmail: req.user.email,
    approvalStatus: "pending",
    isAvailable: true,
    createdAt: new Date(),
  };

  const result = await getDB().collection("services").insertOne(service);

  res.status(201).json({
    success: true,
    message: "Service created and waiting for admin approval",
    data: { ...service, _id: result.insertedId },
  });
});



// GET /api/services/my  (technician: own services only)
router.get("/my", verifyToken, verifyTechnician, async (req, res) => {
  const services = await getDB()
    .collection("services")
    .find({ technicianEmail: req.user.email })
    .sort({ createdAt: -1 })
    .toArray();

  res.json({ success: true, message: "Your services fetched", data: services });
});

// PATCH /api/services/:id  (technician owner: edit OR toggle availability)
router.patch("/:id", verifyToken, verifyTechnician, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  const collection = getDB().collection("services");
  const service = await collection.findOne({ _id: new ObjectId(id) });

  if (!service) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }
  if (service.technicianEmail !== req.user.email) {
    return res
      .status(403)
      .json({ success: false, message: "You can only change your own service" });
  }

  const b = req.body || {};
  const keys = Object.keys(b);

  // Toggle availability only (does NOT reset approval)
  if (keys.length === 1 && keys[0] === "isAvailable") {
    if (typeof b.isAvailable !== "boolean") {
      return res
        .status(400)
        .json({ success: false, message: "isAvailable must be true or false" });
    }
    await collection.updateOne(
      { _id: service._id },
      { $set: { isAvailable: b.isAvailable } }
    );
    return res.json({
      success: true,
      message: b.isAvailable ? "Service is now available" : "Service is now hidden",
      data: { _id: service._id, isAvailable: b.isAvailable },
    });
  }

  // Full edit (resets approval to pending)
  const text = (v) => (typeof v === "string" ? v.trim() : "");
  const updates = {
    title: text(b.title),
    category: text(b.category),
    description: text(b.description),
    image: text(b.image),
    estimatedDuration: text(b.estimatedDuration),
    serviceMode: text(b.serviceMode),
    serviceArea: text(b.serviceArea),
    basePrice: Number(b.basePrice),
  };

  if (
    !updates.title || !updates.description || !updates.image ||
    !updates.estimatedDuration || !updates.serviceArea
  ) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }
  if (!CATEGORIES.includes(updates.category)) {
    return res.status(400).json({ success: false, message: "Invalid category" });
  }
  if (!SERVICE_MODES.includes(updates.serviceMode)) {
    return res
      .status(400)
      .json({ success: false, message: "Invalid service mode" });
  }
  if (!Number.isFinite(updates.basePrice) || updates.basePrice <= 0) {
    return res
      .status(400)
      .json({ success: false, message: "Base price must be greater than 0" });
  }

  updates.approvalStatus = "pending";
  await collection.updateOne({ _id: service._id }, { $set: updates });

  res.json({
    success: true,
    message: "Service updated and waiting for admin approval",
    data: { ...service, ...updates },
  });
});

// DELETE /api/services/:id  (technician owner)
router.delete("/:id", verifyToken, verifyTechnician, async (req, res) => {
  const { id } = req.params;
  if (!ObjectId.isValid(id)) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }

  const collection = getDB().collection("services");
  const service = await collection.findOne({ _id: new ObjectId(id) });

  if (!service) {
    return res.status(404).json({ success: false, message: "Service not found" });
  }
  if (service.technicianEmail !== req.user.email) {
    return res
      .status(403)
      .json({ success: false, message: "You can only delete your own service" });
  }

  await collection.deleteOne({ _id: service._id });
  res.json({ success: true, message: "Service deleted", data: { _id: id } });
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