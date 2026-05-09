import type { NextRequest } from "next/server";
import { requireUserId, AuthError } from "./session";

type AuthedHandler = (
  req: NextRequest,
  ctx: { userId: string; params?: Record<string, string> }
) => Promise<Response>;

export function withAuth(handler: AuthedHandler) {
  return async (
    req: NextRequest,
    routeCtx?: { params?: Record<string, string> }
  ): Promise<Response> => {
    try {
      const userId = await requireUserId(req);
      return await handler(req, { userId, params: routeCtx?.params });
    } catch (err) {
      if (err instanceof AuthError) {
        return Response.json({ error: "Unauthorized" }, { status: 401 });
      }
      console.error("[withAuth]", err);
      return Response.json(
        { error: "Internal server error" },
        { status: 500 }
      );
    }
  };
}
