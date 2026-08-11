/**
 * SSL is required for Neon (both production and any neon.tech host used in
 * dev) and disabled for a plain local Postgres connection. Neon presents
 * valid certificates, so we verify them rather than disabling verification.
 */
export function resolveSsl(
  connectionString: string,
  nodeEnv = process.env.NODE_ENV
): false | { rejectUnauthorized: true } {
  const required = nodeEnv === "production" || connectionString.includes("neon.tech");
  return required ? { rejectUnauthorized: true } : false;
}
