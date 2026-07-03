import jwt from "jsonwebtoken";

function getSecret(): string {
  const secret = process.env.JWT_SECRET;
  if (!secret) throw new Error("JWT_SECRET environment variable is not set");
  return secret;
}

export function signToken(userId: string): string {
  return jwt.sign({ userId }, getSecret(), { expiresIn: "30d", algorithm: "HS256" });
}

export function verifyToken(token: string): { userId: string } | null {
  try {
    const payload = jwt.verify(token, getSecret(), { algorithms: ["HS256"] }) as { userId: string };
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
