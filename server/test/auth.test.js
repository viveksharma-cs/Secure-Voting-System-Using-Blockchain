import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import request from "supertest";
import { MongoMemoryServer } from "mongodb-memory-server";
import { app } from "../app.js";
import { connectDb, disconnectDb } from "../config/db.js";
import { Otp } from "../models/Otp.js";
import { User } from "../models/User.js";
import { hashOtp, signToken } from "../utils/security.js";
import bcrypt from "bcryptjs";
import { Wallet } from "ethers";
import { WalletChallenge } from "../models/WalletChallenge.js";
let mongo;
beforeAll(async () => {
  mongo = await MongoMemoryServer.create();
  await connectDb(mongo.getUri());
});
afterAll(async () => {
  await disconnectDb();
  await mongo.stop();
});
beforeEach(async () => {
  await Promise.all([
    User.deleteMany({}),
    Otp.deleteMany({}),
    WalletChallenge.deleteMany({}),
  ]);
});
const payload = {
  fullName: "Rohan Das",
  email: "rohan@example.test",
  voterId: "VOTER-0001",
  password: "StrongPass123",
  walletAddress: "0x70997970c51812dc3a010c7d01b50e0d17dc79c8",
};
describe("authentication", () => {
  it("registers without storing the raw voter ID and rejects duplicates", async () => {
    expect(
      (await request(app).post("/api/auth/register").send(payload)).status,
    ).toBe(201);
    const user = await User.findOne({ email: payload.email }).select(
      "+voterIdHash",
    );
    expect(user.voterIdHash).not.toContain(payload.voterId);
    expect(
      (await request(app).post("/api/auth/register").send(payload)).status,
    ).toBe(409);
  });
  it("verifies OTP and logs in", async () => {
    await request(app).post("/api/auth/register").send(payload);
    const user = await User.findOne({ email: payload.email });
    await Otp.updateOne({ user: user._id }, { codeHash: hashOtp("123456") });
    const verified = await request(app)
      .post("/api/auth/verify-otp")
      .send({ email: payload.email, code: "123456" });
    expect(verified.status).toBe(200);
    expect(verified.body.token).toBeTruthy();
    const login = await request(app)
      .post("/api/auth/login")
      .send({ email: payload.email, password: payload.password });
    expect(login.status).toBe(200);
  });
  it("enforces JWT and roles", async () => {
    expect((await request(app).get("/api/admin/voters")).status).toBe(401);
    const user = await User.create({
      ...payload,
      email: "voter2@example.test",
      voterIdHash: "hash2",
      passwordHash: await bcrypt.hash(payload.password, 4),
      isVerified: true,
    });
    const token = signToken(user);
    expect(
      (
        await request(app)
          .get("/api/admin/voters")
          .set("Authorization", `Bearer ${token}`)
      ).status,
    ).toBe(403);
  });
  it("verifies one-time ownership of the registered wallet", async () => {
    const wallet = Wallet.createRandom();
    const user = await User.create({
      fullName: "Ananya Gupta",
      email: "ananya@example.test",
      voterIdHash: "hash-wallet-owner",
      walletAddress: wallet.address.toLowerCase(),
      passwordHash: await bcrypt.hash(payload.password, 4),
      isVerified: true,
    });
    const token = signToken(user);
    const challenge = await request(app)
      .post("/api/wallet/challenge")
      .set("Authorization", `Bearer ${token}`);
    const signature = await wallet.signMessage(challenge.body.message);
    const verified = await request(app)
      .post("/api/wallet/verify")
      .set("Authorization", `Bearer ${token}`)
      .send({ challengeId: challenge.body.challengeId, signature });
    expect(verified.status).toBe(200);
    expect(verified.body.verified).toBe(true);
    expect(
      (
        await request(app)
          .post("/api/wallet/verify")
          .set("Authorization", `Bearer ${token}`)
          .send({ challengeId: challenge.body.challengeId, signature })
      ).status,
    ).toBe(400);
  });
});
