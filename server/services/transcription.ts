import { openai } from "../replit_integrations/audio/client";
import { toFile } from "openai";
import { Buffer } from "node:buffer";

export async function transcribeAudio(audioBuffer: Buffer, format: string = "mp3"): Promise<string> {
  const file = await toFile(audioBuffer, `audio.${format}`);
  const response = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe",
    response_format: "json", // Note: The integration notes say the only supported response format is 'json'
  });
  return response.text;
}

export async function generateSummary(transcript: string): Promise<string> {
  const response = await openai.chat.completions.create({
    model: "gpt-5.2",
    messages: [
      { role: "system", content: "You are a helpful assistant that summarizes transcripts concisely. Return only the summary text without any markdown or conversational filler." },
      { role: "user", content: `Please summarize the following transcript:\n\n${transcript}` }
    ],
  });
  return response.choices[0]?.message?.content || "No summary available.";
}
