


import { NextRequest, NextResponse } from "next/server";

type FamilyUpdateRequest = {
  patientName: string;
  profileContext: string;
  notes: { authorRole: string; content: string; type: string }[];
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function callGeminiWithRetry(
  url: string,
  requestBody: object,
  maxAttempts = 3
): Promise<Response> {
  let lastResponse: Response | null = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) return response;

    const cloned = response.clone();
    const isRetryable = response.status === 503;
    lastResponse = response;

    if (!isRetryable || attempt === maxAttempts) {
      return cloned;
    }

    console.log(`Gemini returned 503 (attempt ${attempt}/${maxAttempts}) — retrying in ${attempt}s...`);
    await wait(attempt * 1000);
  }

  return lastResponse!;
}

export async function POST(request: NextRequest) {
  try {
    const body: FamilyUpdateRequest = await request.json();

    const notesText = body.notes.length
      ? body.notes.map((n) => `[${n.type}] ${n.content}`).join("\n")
      : "No recent notes.";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is missing GEMINI_API_KEY. Check .env.local." },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent?key=${apiKey}`;

    
    
    
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `You are TraceWell's family communication assistant. Translate the clinical notes below into a warm, plain-language update for a family member with no medical background. Reference personal preferences or routine naturally if it makes the update feel more personal, but NEVER mention medication names, doses, or specific clinical measurements. 2-3 sentences, reassuring but honest, no jargon.

Patient: ${body.patientName}.
Profile: ${body.profileContext}
Recent notes:
${notesText}`,
            },
          ],
        },
      ],
    };

    const geminiResponse = await callGeminiWithRetry(url, requestBody);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini family-update API error (after retries):", errorText);

      const message =
        geminiResponse.status === 503
          ? "Google's AI service is temporarily overloaded and didn't recover after a few automatic retries. Please try again in a minute."
          : "The AI service returned an error. Check the server terminal for details.";

      return NextResponse.json({ error: message }, { status: 502 });
    }

    const data = await geminiResponse.json();
    const update: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No update generated.";

    return NextResponse.json({ update });
  } catch (err) {
    console.error("Family update route error:", err);
    return NextResponse.json(
      { error: "Something went wrong generating the family update." },
      { status: 500 }
    );
  }
}
