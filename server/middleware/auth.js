import jwt from "jsonwebtoken";
import { env } from "../config/env.js";
import { User } from "../models/User.js";
import { asyncHandler } from "../utils/asyncHandler.js";

export const authenticate = asyncHandler(async (req, _res, next) => { const header = req.headers.authorization || ""; const token = header.startsWith("Bearer ") ? header.slice(7) : null; if (!token) throw Object.assign(new Error("Authentication required"), { status: 401 }); const payload = jwt.verify(token, env.jwtSecret, { issuer: "secure-vote" }); const user = await User.findById(payload.sub); if (!user || !user.isVerified) throw Object.assign(new Error("Invalid account"), { status: 401 }); req.user = user; next(); });
export const authorize = (...roles) => (req, _res, next) => roles.includes(req.user?.role) ? next() : next(Object.assign(new Error("Insufficient permissions"), { status: 403 }));
