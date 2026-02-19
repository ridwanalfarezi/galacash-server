/**
 * Get cookie options based on environment
 *
 * Security considerations:
 * - Since frontend uses proxy/rewrite for /api, requests appear same-origin to the browser
 * - sameSite: "lax" provides good security while allowing top-level navigation
 * - sameSite: "strict" is most secure but may break some OAuth flows
 *
 * For this application:
 * - Development: sameSite: "lax" (proxied requests are same-origin)
 * - Production: sameSite: "lax" (Vercel rewrites make requests same-origin)
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const useSecureCookies = isProduction;
  const useStrictSameSite = process.env.SAME_SITE_STRICT === "true";

  return {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: useStrictSameSite ? ("strict" as const) : ("lax" as const),
    path: "/",
  };
}
