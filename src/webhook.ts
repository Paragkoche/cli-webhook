import { Request, Response } from "express";
import { createClient } from "@supabase/supabase-js";
import crypto from "crypto";
import dotenv from "dotenv";

dotenv.config();

// Environment variables
const WEBHOOK_SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;

if (!WEBHOOK_SECRET) {
  console.error("CRITICAL: Missing RAZORPAY_WEBHOOK_SECRET");
}
if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error("CRITICAL: Missing SUPABASE_URL or SUPABASE_SERVICE_KEY");
}

const supabaseAdmin = createClient(SUPABASE_URL!, SERVICE_KEY!);

// Interfaces for Type Safety
interface RazorpayEntity {
  id: string;
  entity: string;
  amount: number;
  currency: string;
  status: string;
  order_id: string;
  invoice_id: string | null;
  international: boolean;
  method: string;
  amount_refunded: number;
  refund_status: string | null;
  captured: boolean;
  description: string | null;
  card_id: string | null;
  bank: string | null;
  wallet: string | null;
  vpa: string | null;
  email: string;
  contact: string;
  notes: Record<string, any>; // Flexible notes
  fee: number;
  tax: number;
  error_code: string | null;
  error_description: string | null;
  error_source: string | null;
  error_step: string | null;
  error_reason: string | null;
  acquirer_data: Record<string, any>;
  created_at: number;
}

interface RazorpayPayload {
  entity: string;
  account_id: string;
  event: string;
  contains: string[];
  payload: {
    payment: {
      entity: RazorpayEntity;
    };
  };
  created_at: number;
}

export const razorpayWebhookHandler = async (req: Request, res: Response) => {
  if (req.method !== "POST") {
    return res.status(405).json({ message: "Method Not Allowed" });
  }

  const signature = req.headers["x-razorpay-signature"] as string;

  if (!signature) {
    console.warn("Webhook received without signature");
    return res.status(400).json({ error: "Missing signature" });
  }

  if (!req.rawBody) {
    console.error("Raw body not available. Middleware misconfiguration?");
    return res.status(500).json({ error: "Internal Server Error" });
  }

  // 1. 🛑 SECURITY CHECK: Verify the Razorpay signature
  try {
    if (!WEBHOOK_SECRET) {
      throw new Error("Webhook secret not configured");
    }

    const expectedSignature = crypto
      .createHmac("sha256", WEBHOOK_SECRET)
      .update(req.rawBody)
      .digest("hex");

    // Timing safe comparison to prevent timing attacks
    const isAuthentic = crypto.timingSafeEqual(
      Buffer.from(expectedSignature),
      Buffer.from(signature),
    );

    if (!isAuthentic) {
      console.warn("Invalid signature. Potential spoofing attempt.");
      return res.status(403).json({ error: "Invalid signature" });
    }
  } catch (err) {
    console.error("Signature verification error:", err);
    return res.status(500).json({ error: "Internal verification error" });
  }

  // 2. Process the captured payment event
  const payload = req.body as RazorpayPayload;

  try {
    if (
      payload.event === "payment.captured" &&
      payload.payload?.payment?.entity?.status === "captured"
    ) {
      const razorpayNotes = payload.payload.payment.entity.notes;
      const supabaseUserId = razorpayNotes?.user_id;

      if (!supabaseUserId) {
        console.warn(
          "Payment captured but missing 'user_id' in notes. Order ID:",
          payload.payload.payment.entity.order_id,
        );
        // Return 200 to acknowledge receipt, otherwise Razorpay will retry
        return res
          .status(200)
          .json({ warning: "Missing Supabase User ID in notes" });
      }

      console.log(`Processing payment for user: ${supabaseUserId}`);

      // 3. Call the Supabase Postgres function to update the status
      const { error } = await supabaseAdmin.rpc("set_premium_status", {
        user_id: supabaseUserId,
      });

      if (error) {
        console.error(`Supabase RPC error for user ${supabaseUserId}:`, error);
        throw error;
      }

      console.log(
        `Successfully updated premium status for user: ${supabaseUserId}`,
      );
      return res.status(200).json({ success: true, user: supabaseUserId });
    } else {
      // Handle other events or ignore them gracefully
      console.log(
        `Received event: ${payload.event}. Ignoring as per current logic.`,
      );
      return res.status(200).json({ received: true });
    }
  } catch (error) {
    console.error("Error processing webhook payload:", error);
    // Return 500 so Razorpay knows to retry later (if your business logic allows idempotency)
    // Or return 200 if you don't want retries for logic errors.
    // Generally for database connection issues, 500 is better so it retries.
    return res.status(500).json({ error: "Internal processing error" });
  }
};
