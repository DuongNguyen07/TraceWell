// Reads an uploaded photo using Gemini's vision capability and returns a
// factual, brief caption for the care record. Separate route from
// /api/handover since captioning happens the moment a photo is added to a
// note — a different trigger, at a different time.

import { NextRequest, NextResponse } from "next/server";

type CaptionRequest = {
  imageBase64: string; // just the raw base64 data — no "data:image/...;base64," prefix
  mimeType: string;    // e.g. "image/jpeg", "image/png"
};

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Same retry wrapper as the handover route — see its comments for full
// explanation of the retry logic.
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
    const body: CaptionRequest = await request.json();

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is missing GEMINI_API_KEY. Check .env.local." },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // A vision request's "parts" array can include an inline_data object
    // (the image itself) alongside a text instruction, unlike the text-only
    // requests in the other two routes.
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: "You are a clinical documentation assistant. Describe this photo factually and briefly for a care record — for example wound appearance, skin condition, a meal tray, a mobility aid, or anything else relevant to patient/resident care. One or two sentences, plain clinical language, no speculation about diagnosis.",
            },
            {
              inline_data: {
                mime_type: body.mimeType,
                data: body.imageBase64,
              },
            },
          ],
        },
      ],
    };

    const geminiResponse = await callGeminiWithRetry(url, requestBody);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini caption API error (after retries):", errorText);

      const message =
        geminiResponse.status === 503
          ? "Google's AI service is temporarily overloaded and didn't recover after a few automatic retries. Please try again in a minute."
          : "The AI service couldn't process that image.";

      return NextResponse.json({ error: message }, { status: 502 });
    }

    const data = await geminiResponse.json();
    const caption: string =
      data.candidates?.[0]?.content?.parts?.[0]?.text ?? "Photo attached to care record.";

    return NextResponse.json({ caption });
  } catch (err) {
    console.error("Caption route error:", err);
    return NextResponse.json(
      { error: "Something went wrong describing the image." },
      { status: 500 }
    );
  }
}
