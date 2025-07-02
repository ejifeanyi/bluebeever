"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { handleGoogleCallback } from "@/api/auth";
import { useAuthStore } from "@/store/useAppStore";

export default function GoogleCallback() {
  const router = useRouter();
  const params = useSearchParams();
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    async function processCallback() {
      try {
        await handleGoogleCallback(window.location.search);
        await fetchUser();
        router.replace("/dashboard");
      } catch {
        router.replace("/login?error=auth");
      }
    }
    processCallback();
  }, [router, fetchUser]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      Signing you in...
    </div>
  );
}
