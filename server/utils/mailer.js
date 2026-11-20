import nodemailer from "nodemailer";
import { env } from "../config/env.js";
export async function sendOtp(email, code) {
  if (!env.smtp.host) { if (env.nodeEnv !== "test") console.info(`[development OTP] ${email}: ${code}`); return; }
  const transport = nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, secure: env.smtp.port === 465, auth: { user: env.smtp.user, pass: env.smtp.pass } });
  await transport.sendMail({ from: env.smtp.from, to: email, subject: "Your SecureVote verification code", text: `Your verification code is ${code}. It expires in 10 minutes. If you did not register, ignore this email.` });
}
