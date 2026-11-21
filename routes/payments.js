import { Router } from "express";
import { getDB } from "../config/db.js";
import { verifyToken } from "../middleware/verifyToken.js";
import { verifyCustomer } from "../middleware/verifyRole.js";
import Stripe from "stripe";
import { ObjectId } from "mongodb";

let stripeInstance = null;
function getStripe() {
  if (!stripeInstance) {
    stripeInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripeInstance;
}

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

// POST /api/payments/create-checkout-session
router.post(
  "/create-checkout-session",
  verifyToken,
  verifyCustomer,
  async (req, res) => {
    const { bookingId } = req.body;

    if (!bookingId || !ObjectId.isValid(bookingId)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid bookingId is required" });
    }

    const db = getDB();
    const booking = await db
      .collection("bookings")
      .findOne({ _id: new ObjectId(bookingId) });

    if (!booking) {
      return res
        .status(404)
        .json({ success: false, message: "Booking not found" });
    }
    if (booking.customerEmail !== req.user.email) {
      return res
        .status(403)
        .json({ success: false, message: "This is not your booking" });
    }
    if (booking.status !== "completed") {
      return res
        .status(409)
        .json({ success: false, message: "Job is not completed yet" });
    }
    if (booking.paymentStatus !== "unpaid") {
      return res
        .status(409)
        .json({ success: false, message: "This booking is already paid" });
    }
    if (typeof booking.finalAmount !== "number" || booking.finalAmount <= 0) {
      return res
        .status(400)
        .json({ success: false, message: "Final amount is not valid" });
    }

    const session = await getStripe().checkout.sessions.create({
      mode: "payment",
      line_items: [
        {
          price_data: {
            currency: "usd",
            unit_amount: Math.round(booking.finalAmount * 100), // cents
            product_data: { name: booking.serviceTitle },
          },
          quantity: 1,
        },
      ],
      metadata: {
        bookingId: String(booking._id),
        customerEmail: booking.customerEmail,
      },
      customer_email: booking.customerEmail,
      success_url: `${process.env.CLIENT_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/payment/cancel`,
    });

    res.json({
      success: true,
      message: "Checkout session created",
      data: { url: session.url },
    });
  }
);

export default router;