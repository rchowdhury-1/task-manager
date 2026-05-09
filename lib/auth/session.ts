import type { NextRequest } from "next/server";
import { verifyToken } from "./jwt";

export class AuthError extends Error {
  constructor(message = "Unauthorized") {
    super(message);
    this.name = "AuthError";
  }
}

export async function getUserIdFromRequest(
  req: NextRequest
): Promise<string | null> {
  // Check Authorization header first (API clients, curl, etc.)
  const authHeader = req.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload?.userId) return payload.userId;
  }

  // Fallback to httpOnly cookie (browser clients)
  const cookieToken = req.cookies.get("pos-token")?.value;
  if (cookieToken) {
    const payload = verifyToken(cookieToken);
    return payload?.userId ?? null;
  }

  return null;
}

export async function requireUserId(req: NextRequest): Promise<string> {
  const userId = await getUserIdFromRequest(req);
  if (!userId) throw new AuthError();
  return userId;
}
