"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Cookies from "js-cookie";
import { useAuthStore } from "@/store/useAppStore";
import LoadingLayout from "@/components/skeletons/LoadingLayout";
import SyncModal from "@/components/sync/SyncModal";

export default function AuthSuccess() {
  const router = useRouter();
  const params = useSearchParams();
  const fetchUser = useAuthStore((s) => s.fetchUser);
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [userReady, setUserReady] = useState(false);

  useEffect(() => {
    const token = params.get("token");
    if (token) {
      Cookies.set("token", token, { secure: true, sameSite: "strict" });
      fetchUser()
        .then(() => {
          setUserReady(true);
          setShowSyncModal(true);
        })
        .catch(() => {
          router.replace("/login?error=auth_failed");
        });
    } else {
      router.replace("/login?error=missing_token");
    }
  }, [params, fetchUser, router]);

  const handleSyncComplete = () => {
    setShowSyncModal(false);
    router.replace("/inbox");
  };

  const handleSkipSync = () => {
    setShowSyncModal(false);
    router.replace("/inbox");
  };

  if (!userReady) {
    return (
      <LoadingLayout showDashboard={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-muted-foreground">Setting up your account...</p>
          </div>
        </div>
      </LoadingLayout>
    );
  }

  return (
    <LoadingLayout showDashboard={false}>
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center space-y-4">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
          <p className="text-muted-foreground">Preparing your emails...</p>
        </div>
      </div>

      <SyncModal
        isOpen={showSyncModal}
        onClose={handleSkipSync}
        onComplete={handleSyncComplete}
        autoStart={true}
      />
    </LoadingLayout>
  );
}
