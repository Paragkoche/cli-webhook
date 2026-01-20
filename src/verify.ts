import { Request, Response } from "express";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const RAZORPAY_KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_KEY!);

export const verifyPaymentHandler = async (req: Request, res: Response) => {
  const {
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature,
    user_id,
  } = req.body;

  if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
    return res.status(400).json({ error: "Missing required payment details" });
  }

  if (!RAZORPAY_KEY_SECRET) {
    console.error("RAZORPAY_KEY_SECRET is not configured");
    return res.status(500).json({ error: "Server configuration error" });
  }

  try {
    // Create the expected signature
    const generated_signature = crypto
      .createHmac("sha256", RAZORPAY_KEY_SECRET)
      .update(razorpay_order_id + "|" + razorpay_payment_id)
      .digest("hex");

    // Verify signature
    const isAuthentic = generated_signature === razorpay_signature;

    if (isAuthentic) {
      // Payment is successful

      // Optional: Update database if user_id is provided
      if (user_id) {
        const { error } = await supabaseAdmin.rpc("set_premium_status", {
          user_id: user_id,
        });

        if (error) {
          console.error("Supabase update failed:", error);
          // We still return success to client because payment is valid,
          // but log the DB error.
        }
      }

      return res.status(200).json({
        success: true,
        message: "Payment verified successfully",
      });
    } else {
      return res.status(400).json({
        success: false,
        error: "Invalid signature",
      });
    }
  } catch (error) {
    console.error("Verification error:", error);
    return res.status(500).json({ error: "Internal server error" });
  }
};
