import {
  randomBytes,
  scrypt as scryptCallback,
  timingSafeEqual,
  createHash,
} from "node:crypto";
import { promisify } from "node:util";
const scrypt = promisify(scryptCallback);
export const tokenHash = (token) =>
  createHash("sha256").update(token).digest("hex");
export async function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `${salt}:${(await scrypt(password, salt, 64)).toString("hex")}`;
}
export async function checkPassword(password, encoded) {
  const [salt, hash] = encoded.split(":");
  const candidate = await scrypt(password, salt, 64);
  const expected = Buffer.from(hash, "hex");
  return (
    candidate.length === expected.length && timingSafeEqual(candidate, expected)
  );
}
export async function createLogin(store, userId, secure = false) {
  const token = randomBytes(32).toString("hex");
  await store.run("DELETE FROM logins WHERE expires < ?", Date.now());
  await store.run(
    "INSERT INTO logins VALUES(?,?,?)",
    tokenHash(token),
    userId,
    Date.now() + 30 * 86400000,
  );
  return `pa_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=2592000${secure ? "; Secure" : ""}`;
}
export function readToken(req) {
  return (
    (req.headers.cookie || "")
      .split(";")
      .map((part) => part.trim())
      .find((part) => part.startsWith("pa_session="))
      ?.slice(11) || ""
  );
}
export async function currentUser(store, req) {
  const token = readToken(req);
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  return (
    (await store.get(
      "SELECT users.* FROM users JOIN logins ON users.id=logins.user_id WHERE token_hash=? AND expires>? AND users.status='active'",
      tokenHash(token),
      Date.now(),
    )) || null
  );
}
export function publicUser(user) {
  return user
    ? {
        id: user.id,
        email: user.email,
        role: user.role || "member",
        profile: JSON.parse(user.profile),
      }
    : null;
}
