import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export const TOKEN_COOKIE = "lex_token";

export async function getToken(): Promise<string | null> {
  const store = await cookies();
  return store.get(TOKEN_COOKIE)?.value ?? null;
}

export async function requireToken(): Promise<string> {
  const token = await getToken();
  if (!token) redirect("/login");
  return token;
}
