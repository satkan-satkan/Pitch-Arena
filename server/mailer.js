import { z } from "zod";

// Only the server knows this key. No SDK, paid storage, console mail links or
// network calls when the provider is disabled. Test transports are injected.
export function createMailer({
  provider = process.env.MAIL_PROVIDER || "off",
  key = process.env.BREVO_API_KEY || "",
  sender = process.env.MAIL_FROM_EMAIL || "",
  name = process.env.MAIL_FROM_NAME || "Pitch Arena",
  fetchImpl = fetch,
} = {}) {
  const ready =
    provider === "brevo" && !!key && z.email().safeParse(sender).success;
  return {
    ready,
    async send({ to, subject, text }) {
      if (!ready) throw new Error("MAIL_UNAVAILABLE");
      const response = await fetchImpl("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", "api-key": key },
        body: JSON.stringify({
          sender: { email: sender, name },
          to: [{ email: to }],
          subject,
          textContent: text,
        }),
        signal: AbortSignal.timeout(10000),
      });
      // Never expose the provider response, recipient, link or credentials.
      await response.body?.cancel();
      if (!response.ok) throw new Error("MAIL_DELIVERY_FAILED");
    },
  };
}
