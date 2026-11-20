import { Router } from "express";
import { z } from "zod";
import { authenticate, authorize } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import { challenge, verify } from "../controllers/walletController.js";
const router = Router(); router.use(authenticate, authorize("voter"));
router.post("/challenge", challenge); router.post("/verify", validate(z.object({ challengeId: z.string().min(1), signature: z.string().startsWith("0x") })), verify);
export default router;
