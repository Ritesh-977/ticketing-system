import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { inventory } = await req.json();
    const engineUrl = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

    const response = await fetch(`${engineUrl}/api/test-setup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ inventory }),
    });

    if (!response.ok) {
      return NextResponse.json({ error: "Failed to setup test" }, { status: response.status });
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
