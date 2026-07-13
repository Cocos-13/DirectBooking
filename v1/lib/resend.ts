import { Resend } from "resend";

let client: Resend | null = null;

export function getResendClient(): Resend {
  if (!client) {
    const apiKey = process.env.RESEND_API_KEY;
    if (!apiKey) {
      throw new Error("RESEND_API_KEY is not set — add it to .env.local (see .env.local.example)");
    }
    client = new Resend(apiKey);
  }
  return client;
}
