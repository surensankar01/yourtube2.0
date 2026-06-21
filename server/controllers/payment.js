import Razorpay from "razorpay";
import crypto from "crypto";
import users from "../Modals/Auth.js";
import transaction from "../Modals/transaction.js";
import { sendInvoiceEmail } from "../utils/emailSender.js";

// Initialize Razorpay client with fallback keys for test mode
const getRazorpayInstance = () => {
  return new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_key_dummy_123",
    key_secret: process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret_dummy_123",
  });
};

// Create a payment order
export const createOrder = async (req, res) => {
  const { userId, planType } = req.body;

  if (!userId || !planType) {
    return res.status(400).json({ message: "User ID and Plan Type are required" });
  }

  // Define plan prices in INR
  const planRates = {
    bronze: 10,
    silver: 50,
    gold: 100,
  };

  const amountInRupees = planRates[planType.toLowerCase()];
  if (!amountInRupees) {
    return res.status(400).json({ message: "Invalid plan type specified" });
  }

  // Razorpay accepts amounts in the smallest currency unit (paise for INR)
  const amountInPaise = amountInRupees * 100;

  try {
    const user = await users.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const instance = getRazorpayInstance();
    const options = {
      amount: amountInPaise,
      currency: "INR",
      receipt: `receipt_order_${Date.now()}`,
    };

    const order = await instance.orders.create(options);

    // Save pending transaction log to MongoDB
    const pendingTx = new transaction({
      userId: user._id,
      email: user.email,
      orderId: order.id,
      amount: amountInRupees,
      planType: planType.toLowerCase(),
      status: "pending",
    });
    await pendingTx.save();

    return res.status(200).json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
      keyId: process.env.RAZORPAY_KEY_ID || "rzp_test_key_dummy_123",
    });
  } catch (error) {
    console.error("Razorpay order creation error:", error);
    return res.status(500).json({ message: "Something went wrong during order creation" });
  }
};

// Verify payment signature
export const verifyPayment = async (req, res) => {
  const { userId, orderId, paymentId, signature, planType } = req.body;

  if (!userId || !orderId || !paymentId || !signature || !planType) {
    return res.status(400).json({ message: "All payment verification params are required" });
  }

  try {
    const keySecret = process.env.RAZORPAY_KEY_SECRET || "rzp_test_secret_dummy_123";
    
    // Generate signature check
    const hmac = crypto.createHmac("sha256", keySecret);
    hmac.update(orderId + "|" + paymentId);
    const generatedSignature = hmac.digest("hex");

    const isSignatureValid = generatedSignature === signature;

    if (isSignatureValid) {
      // Upgrade user profile planType first
      const updatedUser = await users.findByIdAndUpdate(
        userId,
        { $set: { planType: planType.toLowerCase() } },
        { new: true }
      );

      if (!updatedUser) {
        return res.status(404).json({ message: "User not found to upgrade plan" });
      }

      // ── W-07 fix: all activeTx mutations inside the null guard ──────────
      const activeTx = await transaction.findOne({ orderId: orderId });
      if (activeTx) {
        activeTx.paymentId = paymentId;
        activeTx.signature = signature;
        activeTx.status = "success";
        await activeTx.save();
      }

      // Send invoice email asynchronously
      console.log(`Sending invoice to ${updatedUser.email} for plan ${planType}...`);
      const isEmailSent = await sendInvoiceEmail({
        email: updatedUser.email,
        name: updatedUser.name || "Subscriber",
        orderId,
        paymentId,
        amount: activeTx ? activeTx.amount : 0,
        planType: planType.toLowerCase(),
      });

      if (activeTx) {
        activeTx.invoiceSent = isEmailSent;
        await activeTx.save();
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified and subscription activated successfully.",
        user: updatedUser,
      });
    } else {
      // Update transaction status to failed
      await transaction.findOneAndUpdate(
        { orderId: orderId },
        { $set: { status: "failed" } }
      );

      return res.status(400).json({
        success: false,
        message: "Invalid transaction signature validation failed.",
      });
    }
  } catch (error) {
    console.error("Payment verification error:", error);
    return res.status(500).json({ message: "Something went wrong during payment verification" });
  }
};

// Optional webhook handler
export const handleWebhook = async (req, res) => {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET || "webhook_secret_dummy";
  const signature = req.headers["x-razorpay-signature"];

  if (!signature) {
    return res.status(400).send("No signature header present");
  }

  try {
    const shasum = crypto.createHmac("sha256", secret);
    shasum.update(JSON.stringify(req.body));
    const digest = shasum.digest("hex");

    if (digest === signature) {
      const event = req.body.event;
      if (event === "payment.captured") {
        const payload = req.body.payload.payment.entity;
        const orderId = payload.order_id;
        const paymentId = payload.id;
        const email = payload.email;

        // Check if transaction is marked as pending
        const tx = await transaction.findOne({ orderId });
        if (tx && tx.status === "pending") {
          tx.paymentId = paymentId;
          tx.status = "success";
          await tx.save();

          // Upgrade the user
          const updatedUser = await users.findByIdAndUpdate(
            tx.userId,
            { $set: { planType: tx.planType } },
            { new: true }
          );

          if (updatedUser) {
            const isEmailSent = await sendInvoiceEmail({
              email: updatedUser.email,
              name: updatedUser.name || "Subscriber",
              orderId,
              paymentId,
              amount: tx.amount,
              planType: tx.planType,
            });
            tx.invoiceSent = isEmailSent;
            await tx.save();
          }
        }
      }
      return res.status(200).send("OK");
    } else {
      return res.status(400).send("Invalid webhook signature");
    }
  } catch (error) {
    console.error("Webhook processing error:", error);
    return res.status(500).send("Internal Server Error");
  }
};
