"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { setSessionFromHash } from "@/lib/supabase";

export default function AuthCallbackPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [status, setStatus] = useState<"processing" | "redirecting" | "error">("processing");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function handleCallback() {
      if (typeof window === "undefined") return;

      const hash = window.location.hash?.slice(1);
      const tokenHash = searchParams.get("token_hash");
      const typeQuery = searchParams.get("type");
      const hashParams = hash ? new URLSearchParams(hash) : null;
      const typeFromHash = hashParams?.get("type");
      const type = typeQuery ?? typeFromHash ?? "";

      if (hash) {
        const ok = await setSessionFromHash();
        if (cancelled) return;
        if (ok) {
          setStatus("redirecting");
          window.history.replaceState(null, "", window.location.pathname);
          if (type === "invite") {
            router.replace("/auth/set-password?from_invite=1");
            return;
          }
          if (type === "recovery" || type === "magiclink") {
            router.replace("/contacts");
            return;
          }
          router.replace("/auth/set-password?from_invite=1");
          return;
        }
      }

      if (tokenHash && type === "invite") {
        setStatus("redirecting");
        router.replace(`/auth/set-password?token_hash=${encodeURIComponent(tokenHash)}`);
        return;
      }

      if (cancelled) return;
      setStatus("error");
      setErrorMessage("Invalid or expired link. Please request a new invite.");
    }

    handleCallback();
    return () => {
      cancelled = true;
    };
  }, [router, searchParams]);

  if (status === "error") {
    return (
      <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ink)]">
        <div className="relative z-10 w-full max-w-[440px] px-6 text-center">
          <Image
            src="/trustle-logo-v2.png"
            alt="Trustle"
            width={240}
            height={64}
            className="mx-auto mb-8 h-16 w-auto object-contain"
            priority
            unoptimized
          />
          <div className="rounded-2xl border border-white/10 bg-white/95 p-8">
            <p className="text-[var(--ink)]">{errorMessage}</p>
            <button
              type="button"
              onClick={() => router.push("/login")}
              className="mt-6 rounded-xl bg-[var(--brown)] px-4 py-2 text-sm font-semibold text-white"
            >
              Go to login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ink)]">
      <div className="relative z-10 w-full max-w-[440px] px-6 text-center">
        <Image
          src="/trustle-logo-v2.png"
          alt="Trustle"
          width={240}
          height={64}
          className="mx-auto mb-8 h-16 w-auto object-contain"
          priority
          unoptimized
        />
        <div className="rounded-2xl border border-white/10 bg-white/95 p-8">
          <div className="flex flex-col items-center gap-4">
            <svg
              className="h-10 w-10 animate-spin text-[var(--brown)]"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            <p className="text-sm text-[var(--brown)]">
              {status === "redirecting" ? "Redirecting..." : "Signing you in..."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
