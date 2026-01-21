import express, { Request, Response } from "express";
import dotenv from "dotenv";
import cors from "cors";
import Razorpay from "razorpay";
import { razorpayWebhookHandler } from "./webhook";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.static("public"));
app.use(cors());

// Initialize Razorpay
let razorpay: any;
try {
  if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
    razorpay = new Razorpay({
      key_id: process.env.RAZORPAY_KEY_ID,
      key_secret: process.env.RAZORPAY_KEY_SECRET,
    });
  } else {
    console.warn(
      "WARNING: Razorpay keys not found. Order creation will be mocked.",
    );
  }
} catch (err) {
  console.error("Failed to initialize Razorpay:", err);
}

// Middleware to parse JSON bodies with raw body capture for signature verification
app.use(
  express.json({
    verify: (req: Request, res: Response, buf: Buffer) => {
      req.rawBody = buf;
    },
  }),
);

// Extend Express Request type to include rawBody
declare global {
  namespace Express {
    interface Request {
      rawBody?: Buffer;
    }
  }
}

// Webhook route
app.post("/webhook", razorpayWebhookHandler);

// Create Order Route
app.post("/create-order", async (req: Request, res: Response): Promise<any> => {
  try {
    const { amount, currency, userId } = req.body;

    if (!amount || !currency) {
      return res
        .status(400)
        .json({ error: "Amount and currency are required" });
    }

    if (!razorpay) {
      // Mock response for testing when keys are missing
      console.log("Mocking Razorpay order creation");
      return res.json({
        orderId: `order_mock_${Date.now()}`,
        amount: amount,
        currency: currency,
        status: "created",
      });
    }

    const options = {
      amount: amount, // Amount in smallest currency unit (e.g., paise)
      currency: currency,
      receipt: `receipt_${Date.now()}`,
      notes: {
        userId: userId || "",
      },
    };

    const order = await razorpay.orders.create(options);
    res.json({
      orderId: order.id,
      amount: order.amount,
      currency: order.currency,
    });
  } catch (error: any) {
    console.error("Error creating order:", error);
    res.status(500).json({ error: error.message || "Something went wrong" });
  }
});

app.get("/", (req, res) => {
  res.send("Razorpay Webhook Server is running");
});

app.get("/config", (req, res) => {
  res.json({
    razorpayKeyId: process.env.RAZORPAY_KEY_ID || "rzp_test_mock",
  });
});

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
