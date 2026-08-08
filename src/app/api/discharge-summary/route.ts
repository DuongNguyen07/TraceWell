// Generates TWO discharge documents from one admission record:
// - A clinical GP Summary, for the ongoing/referring GP
// - A formal, third-person Patient Summary, for the patient's own record
//
// IMPORTANT: neither document contains AI-transcribed numeric vital sign
// readings. The AI describes vitals only in qualitative clinical terms —
// the exact numbers are appended separately by code (see
// buildVitalsTableText in dashboard/page.tsx), directly from stored data,
// eliminating any risk of the AI mis-transcribing or reordering a reading.

import { NextRequest, NextResponse } from "next/server";

type DischargeSummaryRequest = {
  patientName: string;
  age: number;
  profileContext: string;
  notes: { authorRole: string; content: string; type: string }[];
  vitalsHistory: string;
  diagnosesSummary: string;
  medicationsSummary: string;
  reportsSummary: string;
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
    const body: DischargeSummaryRequest = await request.json();

    const notesText = body.notes.length
      ? body.notes.map((n) => `[${n.authorRole}, ${n.type}] ${n.content}`).join("\n")
      : "No notes recorded during this admission.";

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Server is missing GEMINI_API_KEY. Check .env.local." },
        { status: 500 }
      );
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

    // ================================================================
    // PROMPT — four rules, each fixing a specific real problem found in
    // earlier test output:
    //
    // 1. NO AI-AUTHORED NUMBERS. The AI never states an exact vital sign
    //    figure — only qualitative clinical description. Exact numbers
    //    come from a separately code-generated table (see
    //    buildVitalsTableText on the frontend), appended after this
    //    response returns, guaranteeing numeric accuracy no matter what
    //    the model does.
    //
    // 2. CLINICAL ACUITY MUST BE HONEST. Earlier output described a
    //    critically low SpO2 in the same calm tone as a routine
    //    discharge — clinically implausible. The model is now instructed
    //    to reflect genuine concern when the qualitative picture warrants it.
    //
    // 3. AUDIENCE-CORRECT FOLLOW-UP. The GP document must never tell the
    //    GP to "see the GP" — that instruction belongs only in the
    //    patient document.
    //
    // 4. PATIENT SUMMARY IS A FORMAL THIRD-PERSON RECORD, not a personal
    //    "you" letter — matching how real discharge paperwork given to
    //    patients is actually written (a record ABOUT the patient).
    // ================================================================
    const requestBody = {
      contents: [
        {
          parts: [
            {
              text: `You are drafting formal discharge documentation on behalf of the treating doctor. Write in DIRECT, DECLARATIVE clinical authorship — as the doctor themselves would write, e.g. "Continue Metformin 500mg twice daily" not "Consider continuing Metformin." Do not hedge or speak as an AI assistant anywhere in either document. Use ONLY the information provided below.

CRITICAL — do NOT state any specific numeric vital sign reading (exact blood pressure, heart rate, temperature, SpO2, or respiratory rate figures) anywhere in either document. Describe vitals only in QUALITATIVE clinical terms — e.g. "blood pressure was unstable with readings in the hypotensive range," or "oxygen saturation showed a critical drop during the admission." The exact numeric readings will be appended separately, verbatim, from the patient record — do not attempt to reproduce or restate any numbers yourself.

CRITICAL — clinical acuity: If the vitals data provided suggests any critical range (for reference: SpO2 below 90%, systolic BP below 90 or above 180, heart rate below 50 or above 130, temperature below 35°C or above 39°C), you MUST reflect genuine clinical concern in tone and content — do not default to calm, routine "clinically stable, cleared for discharge" language if the underlying picture does not support that.

CRITICAL — audience-correct follow-up, no overlap: The GP document's FOLLOW-UP section contains ONLY actions for the GP to take or arrange (e.g. "Review BP and SpO2 within 5-7 days," "Repeat FBC in 2 weeks") — never patient lifestyle advice, and never an instruction to "see a GP." The Patient document's guidance contains ONLY what the patient themselves should do — never clinical instructions addressed to a doctor.

Produce exactly two documents, separated by the exact line "===PATIENT_SUMMARY===" with nothing else on that line.

FIRST — the GP SUMMARY (clinical, for the ongoing/referring GP):
REASON FOR ADMISSION: (one line)
COURSE OF ADMISSION: (2-4 sentences, clinical register, qualitative only — no numbers)
DIAGNOSES AT DISCHARGE: (list)
MEDICATIONS AT DISCHARGE: (list, include changes from admission if apparent)
INVESTIGATIONS: (summarise reports/imaging, or "None recorded")
VITALS TREND: (qualitative clinical assessment only — e.g. "Vitals demonstrate ongoing haemodynamic instability with hypoxia; refer to the attached vitals record for exact readings.")
FOLLOW-UP: (specific GP actions only, with concrete timeframes — see audience rule above)

===PATIENT_SUMMARY===

SECOND — the PATIENT SUMMARY: Write this as a FORMAL THIRD-PERSON discharge record, not a personal letter. Refer to the patient by name throughout — never "you." This is an official document about the patient, given to them for their own records. Begin with a clear statement that the patient is being discharged, in the style of: "[Name] was admitted with [reason] and is being discharged today." Use plain, jargon-free language throughout while keeping the formal third-person register. Do not state specific numeric readings — describe them qualitatively, as above. Explain what happened during the stay, what the diagnosis (if any) means in plain terms, medications being taken home and why, and clear patient-actionable next steps only (see audience rule above). Under 200 words.

Patient: ${body.patientName}, age ${body.age}.
Profile: ${body.profileContext}
Diagnoses: ${body.diagnosesSummary}
Medications: ${body.medicationsSummary}
Reports/imaging: ${body.reportsSummary}
Vitals history: ${body.vitalsHistory}
Notes during admission:
${notesText}`,
            },
          ],
        },
      ],
    };

    const geminiResponse = await callGeminiWithRetry(url, requestBody);

    if (!geminiResponse.ok) {
      const errorText = await geminiResponse.text();
      console.error("Gemini discharge-summary API error (after retries):", errorText);

      const message =
        geminiResponse.status === 503
          ? "Google's AI service is temporarily overloaded and didn't recover after a few automatic retries. Please try again in a minute."
          : "The AI service returned an error. Check the server terminal for details.";

      return NextResponse.json({ error: message }, { status: 502 });
    }

    const data = await geminiResponse.json();
    const fullText: string = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";

    const DELIMITER = "===PATIENT_SUMMARY===";
    let gpSummary: string;
    let patientSummary: string;

    if (fullText.includes(DELIMITER)) {
      const parts = fullText.split(DELIMITER);
      gpSummary = parts[0].trim();
      patientSummary = parts[1].trim();
    } else {
      gpSummary = fullText.trim();
      patientSummary = "Patient summary could not be generated in the expected format — please write manually or regenerate.";
    }

    return NextResponse.json({ gpSummary, patientSummary });
  } catch (err) {
    console.error("Discharge summary route error:", err);
    return NextResponse.json(
      { error: "Something went wrong generating the discharge summary." },
      { status: 500 }
    );
  }
}
