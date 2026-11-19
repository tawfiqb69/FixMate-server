// Use these AFTER verifyToken: router.get("/x", verifyToken, verifyCustomer, handler)
function requireRole(role) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, message: "Unauthorized" });
    }
    if (req.user.role !== role) {
      return res
        .status(403)
        .json({ success: false, message: `Forbidden: ${role}s only` });
    }
    next();
  };
}

export const verifyCustomer = requireRole("customer");
export const verifyTechnician = requireRole("technician");
export const verifyAdmin = requireRole("admin");