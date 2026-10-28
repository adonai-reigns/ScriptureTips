import { createTransport } from "nodemailer";

/** Sends plain-text email. SMTP in the stack (vision §3.13), a list in tests. */
export interface Mailer {
  send(message: { to: string; subject: string; text: string }): Promise<void>;
}

/**
 * Over standard SMTP, so the provider is swapped by configuration alone (vision §3.13):
 * `SMTP_URL` (Mailpit in development) and `MAIL_FROM`.
 */
export function smtpMailer(url: string, from: string): Mailer {
  const transport = createTransport(url);
  return {
    async send(message) {
      await transport.sendMail({ from, ...message });
    },
  };
}
