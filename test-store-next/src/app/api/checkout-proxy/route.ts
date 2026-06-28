import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { eventId, publishableKey } = await req.json();
    const engineUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const response = await fetch(`${engineUrl}/api/public/checkout/${eventId}`, {
      method: "POST",
      headers: { 
        "Content-Type": "application/json",
        "x-publishable-key": publishableKey
      }
    });

    const data = await response.json().catch(() => ({}));
    return NextResponse.json({ success: response.ok, status: response.status, data }, { status: response.status });
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
