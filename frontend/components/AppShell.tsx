"use client";

import { usePathname } from "next/navigation";
import { SidebarProvider, useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import Sidebar from "@/components/Sidebar";

function MainWithPadding({ children }: { children: React.ReactNode }) {
  const { collapsed } = useSidebar();
  const pathname = usePathname();
  const isLoginPage = pathname === "/login";
  
  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }
  
  return (
    <main className={`min-h-screen transition-[padding-left] duration-200 ${collapsed ? "pl-16" : "pl-64"}`}>
      {children}
    </main>
  );
}

function AuthenticatedShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading } = useAuth();
  const isLoginPage = pathname === "/login";

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[var(--background)]">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-[var(--sand)] border-t-[var(--brown)]"></div>
      </div>
    );
  }

  if (isLoginPage) {
    return <main className="min-h-screen">{children}</main>;
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <>
      <Sidebar />
      <MainWithPadding>{children}</MainWithPadding>
    </>
  );
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <AuthenticatedShell>{children}</AuthenticatedShell>
    </SidebarProvider>
  );
}
