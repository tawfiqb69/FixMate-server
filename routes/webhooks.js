import express from "express";
import { getStripe } from "../utils/stripe.js";
import { savePaymentFromSession } from "../utils/savePayment.js";

const router = express.Router();

// POST /api/webhooks/stripe  (raw body, signature checked)
router.post(
  "/stripe",
  express.raw({ type: "application/json" }),
  async (req, res) => {
    const signature = req.headers["stripe-signature"];

    let event;
    try {
      event = getStripe().webhooks.constructEvent(
        req.body,
        signature,
        process.env.STRIPE_WEBHOOK_SECRET
      );
    } catch (err) {
      console.error("Webhook signature failed:", err.message);
      return res.status(400).send("Invalid signature");
    }

    try {
      if (
        event.type === "checkout.session.completed" ||
        event.type === "checkout.session.async_payment_succeeded"
      ) {
        const result = await savePaymentFromSession(event.data.object);
        if (!result.ok) {
          // Not a retry problem: log it and answer 200
          console.warn("Webhook skipped:", result.message);
        }
      }
      res.json({ received: true });
    } catch (err) {
      // Real error (for example database down): 500 so Stripe retries
      console.error("Webhook error:", err);
      res.status(500).send("Webhook handler failed");
    }
  }
);

export default router;