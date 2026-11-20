import { Router } from "express";
import { z } from "zod";
import { register, verifyOtp, login, me } from "../controllers/authController.js";
import { authenticate } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { authLimit, otpLimit } from "../middleware/rateLimits.js";

const router = Router();
const email = z.string().email().transform(x => x.toLowerCase());
router.post("/register", authLimit, validate(z.object({ fullName: z.string().trim().min(2).max(100), email, voterId: z.string().trim().min(5).max(64), password: z.string().min(10).max(128).regex(/[A-Z]/, "Password needs an uppercase letter").regex(/[a-z]/, "Password needs a lowercase letter").regex(/[0-9]/, "Password needs a number"), walletAddress: z.string().regex(/^0x[a-fA-F0-9]{40}$/, "Invalid Ethereum address") })), register);
router.post("/verify-otp", otpLimit, validate(z.object({ email, code: z.string().regex(/^\d{6}$/) })), verifyOtp);
router.post("/login", authLimit, validate(z.object({ email, password: z.string().min(1).max(128) })), login);
router.get("/me", authenticate, me);
export default router;
