import { NextRequest, NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { users, categories } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { signToken } from "@/lib/auth/jwt";
import { registerSchema } from "@/lib/validation/auth";
import { checkRegisterRateLimit } from "@/lib/auth/registerRateLimiter";

export async function POST(req: NextRequest) {
  try {
    // Signup rate limiting (per IP)
    const ip =
      req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      req.headers.get("x-real-ip") ??
      "unknown";

    const limit = checkRegisterRateLimit(ip);
    if (!limit.allowed) {
      return NextResponse.json(
        { error: "Too many registration attempts. Please try again later.", retryAfter: limit.retryAfter },
        { status: 429 },
      );
    }

    const body = await req.json();
    const parsed = registerSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, password, name, timezone: rawTz } = parsed.data;

    // Validate IANA timezone, default to UTC if invalid/missing
    let timezone = 'UTC';
    if (rawTz) {
      try {
        new Intl.DateTimeFormat('en', { timeZone: rawTz });
        timezone = rawTz;
      } catch {
        // invalid timezone string, keep UTC default
      }
    }

    const existing = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.email, email.toLowerCase()))
      .limit(1);

    if (existing.length > 0) {
      return NextResponse.json(
        { error: "Email already registered" },
        { status: 409 }
      );
    }

    const passwordHash = await hashPassword(password);

    const trialEndsAt = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000);

    const [user] = await db
      .insert(users)
      .values({
        email: email.toLowerCase(),
        passwordHash,
        name: name ?? null,
        timezone,
        trialEndsAt,
      })
      .returning({
        id: users.id,
        email: users.email,
        name: users.name,
        timezone: users.timezone,
        createdAt: users.createdAt,
      });

    // Seed system categories for the new user
    const systemCategories = [
      { slug: 'career',    label: 'Career',    colour: 'blue',   icon: 'briefcase', sortOrder: 0 },
      { slug: 'lms',       label: 'LMS',       colour: 'violet', icon: 'book',      sortOrder: 1 },
      { slug: 'freelance', label: 'Freelance',  colour: 'amber',  icon: 'code',      sortOrder: 2 },
      { slug: 'learning',  label: 'Learning',   colour: 'green',  icon: 'layers',    sortOrder: 3 },
      { slug: 'uber',      label: 'Uber Eats',  colour: 'slate',  icon: 'truck',     sortOrder: 4 },
      { slug: 'faith',     label: 'Faith',      colour: 'rose',   icon: 'heart',     sortOrder: 5 },
    ];
    await db.insert(categories).values(
      systemCategories.map((c) => ({ userId: user.id, ...c, isSystem: true }))
    );

    const token = signToken(user.id);

    const res = NextResponse.json({ user, token }, { status: 201 });

    res.cookies.set('pos-token', token, {
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 24 * 30,
      path: '/',
    });

    return res;
  } catch (err) {
    console.error("[POST /api/v1/auth/register]", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
