"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { useAuthStore } from "@/store/useAppStore";
import LoadingLayout from "@/components/skeletons/LoadingLayout";
import { Skeleton } from "@/components/ui/skeleton";

export default function AuthSuccess() {
  const router = useRouter();
  const params = useSearchParams();
  const fetchUser = useAuthStore((s) => s.fetchUser);

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      Cookies.set("token", token, { secure: true, sameSite: "strict" });
      fetchUser().finally(() => {
        router.replace("/dashboard");
      });
    } else {
      router.replace("/login?error=missing_token");
    }
    // eslint-disable-next-line
  }, []);

  return (
    <LoadingLayout showDashboard={false}>
      <div className="space-y-6 p-6">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    </LoadingLayout>
  );
}
