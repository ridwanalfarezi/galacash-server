export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  const useSecureCookies = isProduction;

  return {
    httpOnly: true,
    secure: useSecureCookies,
    sameSite: useSecureCookies ? ("none" as const) : ("lax" as const),
    path: "/",
  };
}
