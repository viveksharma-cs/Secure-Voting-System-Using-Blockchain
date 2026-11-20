import nodemailer from "nodemailer";
import { env } from "../config/env.js";
export async function sendMail(email, code) { const t = nodemailer.createTransport({ host: env.smtp.host, port: env.smtp.port, secure: env.smtp.port === 465, auth: { user: env.smtp.user, pass: env.smtp.pass } }); await t.sendMail({ from: env.smtp.from, to: email, subject: "SecureVote verification code", text: `Your one-time code is ${code}. It expires in 10 minutes.` }); }
