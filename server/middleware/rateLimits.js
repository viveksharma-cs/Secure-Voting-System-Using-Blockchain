import rateLimit from "express-rate-limit";
const base = { windowMs: 15 * 60 * 1000, standardHeaders: true, legacyHeaders: false };
export const authLimit = rateLimit({ ...base, limit: 20, message: { error: "Too many authentication attempts" } });
export const otpLimit = rateLimit({ ...base, limit: 10, message: { error: "Too many OTP attempts" } });
