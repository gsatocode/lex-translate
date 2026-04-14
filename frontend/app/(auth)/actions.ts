"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { auth, ApiError } from "@/lib/api";
import { TOKEN_COOKIE } from "@/lib/auth";

export interface ActionResult {
  error?: string;
}

export async function loginAction(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  try {
    const { access_token } = await auth.login({ email, password });
    const store = await cookies();
    store.set(TOKEN_COOKIE, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    return { error: "Login failed. Please try again." };
  }

  redirect("/dashboard");
}

export async function registerAction(
  _prev: ActionResult,
  formData: FormData
): Promise<ActionResult> {
  const org_name = formData.get("org_name") as string;
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  if (!org_name || !email || !password) {
    return { error: "All fields are required." };
  }

  try {
    await auth.register({ org_name, email, password });
    const { access_token } = await auth.login({ email, password });
    const store = await cookies();
    store.set(TOKEN_COOKIE, access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });
  } catch (err) {
    if (err instanceof ApiError) {
      return { error: err.message };
    }
    return { error: "Registration failed. Please try again." };
  }

  redirect("/dashboard");
}

export async function logoutAction(): Promise<void> {
  const store = await cookies();
  store.delete(TOKEN_COOKIE);
  redirect("/login");
}
