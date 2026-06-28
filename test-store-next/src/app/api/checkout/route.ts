import { NextResponse } from "next/server";

export async function POST() {
  try {
    const engineUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";
    const apiKey = process.env.KAMPUS_API_KEY;

    // Server-to-server POST call to your ticketing engine
    const response = await fetch(`${engineUrl}/api/v1/tickets/issue`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`,
      },
      // Passing dummy data that your Engine can process
      body: JSON.stringify({
        eventId: "00000000-0000-0000-0000-000000000001", // Mock event UUID
        seatId: "00000000-0000-0000-0000-000000000002", // Mock seat UUID
        userId: "00000000-0000-0000-0000-000000000003", // Mock user UUID
        userEmail: "user@example.com"
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error("Engine API Error:", errorData);
      return NextResponse.json({ error: "Failed to issue ticket" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error("Checkout Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
