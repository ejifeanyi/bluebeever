import Cookies from "js-cookie";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000/api";

export function signInWithGoogle() {
  window.location.href = `${API_URL}/auth/google`;
}

export async function handleGoogleCallback(query: string) {
  const res = await fetch(`${API_URL}/auth/google/callback${query}`, {
    credentials: "include",
  });
  if (!res.ok) throw new Error("Google sign-in failed");
  const data = await res.json();
  Cookies.set("token", data.token, { secure: true, sameSite: "strict" });
  Cookies.set("refreshToken", data.refreshToken, {
    secure: true,
    sameSite: "strict",
  });
  return data;
}

export async function refreshToken() {
  const refreshToken = Cookies.get("refreshToken");
  if (!refreshToken) throw new Error("No refresh token");
  const res = await fetch(`${API_URL}/auth/refresh`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${refreshToken}`,
    },
  });
  if (!res.ok) throw new Error("Failed to refresh token");
  const data = await res.json();
  Cookies.set("token", data.token, { secure: true, sameSite: "strict" });
  return data;
}

export async function getMe() {
  const token = Cookies.get("token");
  if (!token) throw new Error("No token");
  const res = await fetch(`${API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Failed to fetch user");
  return res.json();
}

export function logout() {
  Cookies.remove("token");
  Cookies.remove("refreshToken");
}
