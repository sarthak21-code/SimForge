import { NextResponse } from "next/server";
import { answerTutorQuestion, parseTutorInput, TUTOR_UNAVAILABLE_MESSAGE } from "@/lib/ai/tutor";

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Enter a question about this simulation." }, { status: 400 });
  }

  const input = parseTutorInput(body);
  if (!input) {
    return NextResponse.json({ error: "Enter a question and valid simulation context." }, { status: 400 });
  }

  try {
    const answer = await answerTutorQuestion(input);
    return NextResponse.json({ answer });
  } catch {
    return NextResponse.json({ error: TUTOR_UNAVAILABLE_MESSAGE, retryable: true }, { status: 503 });
  }
}
