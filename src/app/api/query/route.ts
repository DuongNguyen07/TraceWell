


import { NextRequest, NextResponse } from "next/server";

type QueryRequest = {
  patientName: string;
  age: number;
  profileContext: string;
  notes: { authorRole: string; content: string; type: string }[];
  question: string;
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
    const body: QueryRequest = await request.json();

    if (!body.question?.trim()) {
      return NextResponse.json({ error: "No question was provided." }, { status: 400 });
    }

    const notesText = body.notes.length
      ? body.notes.map((n) => `[${n.authorRole}, ${n.type}] ${n.content}`).join("\n")
      : "No notes recorded yet.";

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
              text: `You are TraceWell's AI query assistant. Answer the staff member's question using ONLY the profile and notes provided below for this specific patient. If the answer isn't covered, say so plainly rather than guessing. Keep the answer to 2-3 sentences.

Patient: ${body.patientName}, age ${body.age}.
Profile:
${body.profileContext}

Notes:
${notesText}

Question: ${body.question}`,
            },
          ],
        },
      ],
    };

    const geminiResponse = await callGeminiWithRetry(url, requestBody);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini query API error (after retries):", errorText);

      const message =
        geminiResponse.status === 503
          ? "Google's AI service is temporarily overloaded and didn't recover after a few automatic retries. Please try again in a minute."
          : "The AI service returned an error. Check the server terminal for details.";

      return NextResponse.json({ error: message }, { status: 502 });
    }

    const data = await geminiResponse.json();
    const answer: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "No response generated.";

    return NextResponse.json({ answer });
  } catch (err) {
    console.error("Query route error:", err);
    return NextResponse.json(
      { error: "Something went wrong answering the question." },
      { status: 500 }
    );
  }
}
