"use client";

import { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { checkBackendHealth } from "@/lib/api";

export type BackendStatus = "idle" | "checking" | "online" | "offline";

interface BackendStatusContextType {
  status: BackendStatus;
  retry: () => void;
}

const BackendStatusContext = createContext<BackendStatusContextType | undefined>(undefined);

export function BackendStatusProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth();
  const [status, setStatus] = useState<BackendStatus>("idle");

  const runCheck = useCallback(async () => {
    setStatus("checking");
    const ok = await checkBackendHealth();
    setStatus(ok ? "online" : "offline");
  }, []);

  useEffect(() => {
    if (!isAuthenticated) {
      setStatus("idle");
      return;
    }
    runCheck();
  }, [isAuthenticated, runCheck]);

  const retry = useCallback(() => {
    runCheck();
  }, [runCheck]);

  return (
    <BackendStatusContext.Provider value={{ status, retry }}>
      {children}
    </BackendStatusContext.Provider>
  );
}

export function useBackendStatus() {
  const context = useContext(BackendStatusContext);
  if (context === undefined) {
    throw new Error("useBackendStatus must be used within a BackendStatusProvider");
  }
  return context;
}
