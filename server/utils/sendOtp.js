import { env } from "../config/env.js";
import { sendMail } from "./transporter.js";
export async function sendOtp(email, code) { if (env.nodeEnv === "test") return; if (env.smtp.host) return sendMail(email, code); if (env.allowDevOtp && env.nodeEnv !== "production") { console.info(`[development OTP] ${email}: ${code}`); return; } throw Object.assign(new Error("Email service is not configured"), { status: 503 }); }
