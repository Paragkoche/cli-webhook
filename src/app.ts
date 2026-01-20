import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { razorpayWebhookHandler } from "./webhook";
import { verifyPaymentHandler } from "./verify";

dotenv.config();

const app = express();

// Serve static files from 'public' directory
app.use(express.static("public"));

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

// Routes
app.post("/webhook", razorpayWebhookHandler); // For Razorpay Server -> Your Server
app.post("/verify", verifyPaymentHandler); // For Your App -> Your Server

app.get("/", (req, res) => {
  res.send("Razorpay Webhook Server is running");
});

export default app;
