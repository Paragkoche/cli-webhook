import express, { Request, Response } from "express";
import dotenv from "dotenv";
import { razorpayWebhookHandler } from "./webhook";

dotenv.config();

const app = express();

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

app.get("/", (req, res) => {
  res.send("Razorpay Webhook Server is running");
});

export default app;
