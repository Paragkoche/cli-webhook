import crypto from 'crypto';
import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const SECRET = process.env.RAZORPAY_WEBHOOK_SECRET;
const PORT = process.env.PORT || 3000;
const URL = `http://localhost:${PORT}/webhook`;

if (!SECRET) {
    console.error("Error: RAZORPAY_WEBHOOK_SECRET is missing in .env");
    process.exit(1);
}

const payload = JSON.stringify({
    "entity": "event",
    "account_id": "acc_BFQ7uQEaa7j2z7",
    "event": "payment.captured",
    "contains": [
        "payment"
    ],
    "payload": {
        "payment": {
            "entity": {
                "id": "pay_DESlfW9H8K9snM",
                "entity": "payment",
                "amount": 50000,
                "currency": "INR",
                "status": "captured",
                "order_id": "order_DESlLckIVRkMjB",
                "invoice_id": null,
                "international": false,
                "method": "card",
                "amount_refunded": 0,
                "refund_status": null,
                "captured": true,
                "description": "Test Transaction",
                "card_id": "card_DESlfXaXA50eA9",
                "email": "gaurav.kumar@example.com",
                "contact": "+919000090000",
                "notes": {
                   "user_id": "user_test_123"
                },
                "fee": 1000,
                "tax": 0,
                "error_code": null,
                "error_description": null,
                "created_at": 1567674599
            }
        }
    },
    "created_at": 1567674606
});

// Generate Signature
const signature = crypto.createHmac('sha256', SECRET)
    .update(payload)
    .digest('hex');

console.log(`\n🚀 Testing Webhook at ${URL}`);
console.log(`🔑 Using Secret: ${SECRET}`);
console.log(`✍️  Generated Signature: ${signature}`);

// Send Request
axios.post(URL, JSON.parse(payload), {
    headers: {
        'x-razorpay-signature': signature,
        'Content-Type': 'application/json'
    }
})
.then(response => {
    console.log(`\n✅ Success! Status: ${response.status}`);
    console.log('Response:', response.data);
})
.catch(error => {
    console.error(`\n❌ Failed! Status: ${error.response?.status}`);
    console.error('Error:', error.response?.data || error.message);
});
