import { NextRequest, NextResponse } from "next/server";

function wait(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function callGemini(url: string, body: object, maxAttempts = 3): Promise<Response> {
  let last: Response | null = null;
  for (let i = 1; i <= maxAttempts; i++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.ok) return res;
    last = res;
    if (res.status !== 503 || i === maxAttempts) return res.clone();
    await wait(i * 1000);
  }
  return last!;
}

export async function POST(req: NextRequest) {
  try {
    const { system, prompt } = await req.json();
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return NextResponse.json({ error: "Missing GEMINI_API_KEY" }, { status: 500 });

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
    const res = await callGemini(url, {
      contents: [{ parts: [{ text: system ? `${system}\n\n${prompt}` : prompt }] }],
    });

    if (!res.ok) {
      const err = await res.text();
      console.error("Gemini chat error:", err);
      return NextResponse.json({ error: "AI service error" }, { status: 502 });
    }

    const data = await res.json();
    const text: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return NextResponse.json({ text });
  } catch (err) {
    console.error("Chat route error:", err);
    return NextResponse.json({ error: "Something went wrong" }, { status: 500 });
  }
}
