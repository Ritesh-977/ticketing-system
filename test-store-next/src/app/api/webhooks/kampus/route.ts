import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

export async function POST(req: NextRequest) {
  try {
    // 1. Read the raw body as text for precise signature matching
    const rawBody = await req.text();
    const signature = req.headers.get("x-kampus-signature");
    const secret = process.env.KAMPUS_WEBHOOK_SECRET;

    if (!signature || !secret) {
      return NextResponse.json({ error: "Missing signature or secret" }, { status: 400 });
    }

    // 2. Compute the HMAC signature with the raw body and secret
    const hmac = crypto.createHmac("sha256", secret);
    const expectedSignature = hmac.update(rawBody).digest("hex");

    // 3. Prevent timing attacks by using timingSafeEqual to compare buffers
    const isValid = crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expectedSignature)
    );

    if (!isValid) {
      console.error("❌ Invalid webhook signature");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // 4. Safely parse payload only AFTER signature is verified
    const payload = JSON.parse(rawBody);

    console.log("\n✅ Webhook verified and ticket received!");
    console.log("🎟️ Ticket Payload:", JSON.stringify(payload, null, 2));

    // Acknowledge receipt to the Engine so RabbitMQ considers the message delivered
    return NextResponse.json({ received: true }, { status: 200 });
  } catch (error) {
    console.error("Webhook Error:", error);
    return NextResponse.json({ error: "Webhook handler failed" }, { status: 500 });
  }
}
