import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { textToVisemes } from "@/lib/virtual-avatar/tracking/ai-lipsync";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return NextResponse.json({ visemes: null, fallback: true });
  }

  const form = await req.formData();
  const audio = form.get("audio");
  if (!(audio instanceof Blob) || audio.size < 800) {
    return NextResponse.json({ visemes: null });
  }

  try {
    const whisperForm = new FormData();
    whisperForm.append("file", audio, "speech.webm");
    whisperForm.append("model", "whisper-1");
    whisperForm.append("language", "ko");

    const res = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: whisperForm,
    });

    if (!res.ok) {
      return NextResponse.json({ visemes: null, error: "transcription_failed" });
    }

    const { text } = (await res.json()) as { text?: string };
    const visemes = textToVisemes(text ?? "");
    return NextResponse.json({ visemes, text: text ?? "" });
  } catch {
    return NextResponse.json({ visemes: null, error: "server_error" }, { status: 500 });
  }
}
