"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { useAuthStore } from "@/store/useAppStore";
import LoadingLayout from "@/components/skeletons/LoadingLayout";
import Header from "@/components/nav/Header";
import Sidebar from "@/components/nav/Sidebar";
import { Skeleton } from "@/components/ui/skeleton";

const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const router = useRouter();
  const { user, loading, fetchUser } = useAuthStore();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted) return;

    const token = Cookies.get("token");

    if (!token) {
      router.replace("/login");
      return;
    }

    if (!user && !loading) {
      fetchUser();
    }
    // eslint-disable-next-line
  }, [mounted]);

  useEffect(() => {
    if (!mounted) return;

    if (!loading && !user) {
      const token = Cookies.get("token");
      if (!token) {
        router.replace("/login");
      }
    }
    // eslint-disable-next-line
  }, [loading, user, router, mounted]);

  if (!mounted || loading || (mounted && Cookies.get("token") && !user)) {
    return (
      <LoadingLayout>
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

  if (!user) {
    return null;
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Header
        notificationCount={3}
        userName={user.name}
        userImage={user.picture}
      />
      <div className="flex">
        <Sidebar />
        <main className="flex-1 overflow-hidden">
          <div className="h-full p-6">
            <div className="h-full">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
};

export default Layout;
