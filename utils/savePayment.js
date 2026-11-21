import { ObjectId } from "mongodb";
import { getDB } from "../config/db.js";

let indexReady = false;
async function ensureIndex(db) {
  if (indexReady) return;
  await db
    .collection("payments")
    .createIndex({ stripeSessionId: 1 }, { unique: true });
  indexReady = true;
}

export async function savePaymentFromSession(session) {
  if (session.payment_status !== "paid") {
    return { ok: false, status: 409, message: "Payment is not completed" };
  }

  const bookingId = session.metadata?.bookingId;
  if (!bookingId || !ObjectId.isValid(bookingId)) {
    return { ok: false, status: 400, message: "Invalid booking in session" };
  }

  const db = getDB();
  await ensureIndex(db);

  const booking = await db
    .collection("bookings")
    .findOne({ _id: new ObjectId(bookingId) });
  if (!booking) {
    return { ok: false, status: 404, message: "Booking not found" };
  }

  const payments = db.collection("payments");

  // Already saved (same session, or same booking)? Return it.
  let payment =
    (await payments.findOne({ stripeSessionId: session.id })) ||
    (await payments.findOne({ bookingId: String(booking._id) }));

  if (!payment) {
    const doc = {
      bookingId: String(booking._id),
      serviceTitle: booking.serviceTitle,
      customerName: booking.customerName,
      customerEmail: booking.customerEmail,
      technicianName: booking.technicianName,
      technicianEmail: booking.technicianEmail,
      amount: session.amount_total / 100,
      currency: "usd",
      transactionId:
        typeof session.payment_intent === "string"
          ? session.payment_intent
          : session.payment_intent?.id,
      stripeSessionId: session.id,
      paymentStatus: "paid",
      paidAt: new Date(),
    };
    try {
      const result = await payments.insertOne(doc);
      payment = { _id: result.insertedId, ...doc };
    } catch (err) {
      if (err.code === 11000) {
        payment = await payments.findOne({ stripeSessionId: session.id });
      } else {
        throw err;
      }
    }
  }

  // Safe to run many times
  await db
    .collection("bookings")
    .updateOne(
      { _id: booking._id, paymentStatus: "unpaid" },
      { $set: { paymentStatus: "paid" } }
    );

  return { ok: true, payment };
}