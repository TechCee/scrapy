"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import { verifyInviteAndSetPassword } from "@/lib/supabase";

function SetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [validToken, setValidToken] = useState<boolean | null>(null);

  const tokenHash = searchParams.get("token_hash");

  useEffect(() => {
    setValidToken(!!tokenHash);
  }, [tokenHash]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    if (!tokenHash) {
      setError("Invalid or expired link");
      return;
    }
    setIsSubmitting(true);
    try {
      await verifyInviteAndSetPassword(tokenHash, password);
      router.replace("/contacts");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Failed to set password";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (validToken === null) {
    return (
      <div className="flex justify-center py-12">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--brown)] border-t-transparent" />
      </div>
    );
  }

  if (!tokenHash) {
    return (
      <div className="rounded-2xl border border-white/10 bg-white/95 p-8 text-center">
        <p className="text-[var(--ink)]">Invalid or expired invite link. Please request a new one.</p>
        <button
          type="button"
          onClick={() => router.push("/login")}
          className="mt-6 rounded-xl bg-[var(--brown)] px-4 py-2 text-sm font-semibold text-white"
        >
          Go to login
        </button>
      </div>
    );
  }

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-white/95 shadow-2xl backdrop-blur-xl">
      <div className="border-b border-[var(--sand)]/50 bg-gradient-to-r from-[var(--warm-white)] to-[var(--card-bg)] px-8 py-6">
        <h1 className="text-center font-display text-2xl font-bold tracking-tight text-[var(--ink)]">
          Set your password
        </h1>
        <p className="mt-1 text-center text-sm text-[var(--brown)]">
          You’ve been invited to Trustle. Choose a password to continue.
        </p>
      </div>
      <div className="px-8 py-8">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-semibold text-[var(--ink)]">
              Password
            </label>
            <div className="relative">
              <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-4">
                <svg className="h-5 w-5 text-[var(--tan)]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-xl border-2 border-[var(--sand)]/60 bg-[var(--warm-white)] py-3.5 pl-12 pr-12 text-sm text-[var(--ink)] placeholder-[var(--tan)] focus:border-[var(--brown)] focus:outline-none focus:ring-4 focus:ring-[var(--brown)]/10"
                placeholder="Choose a password"
                required
                minLength={6}
                autoComplete="new-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 flex items-center pr-4 text-[var(--tan)] hover:text-[var(--brown)]"
              >
                {showPassword ? (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>
          <div className="space-y-2">
            <label htmlFor="confirmPassword" className="block text-sm font-semibold text-[var(--ink)]">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? "text" : "password"}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="block w-full rounded-xl border-2 border-[var(--sand)]/60 bg-[var(--warm-white)] py-3.5 px-4 text-sm text-[var(--ink)] placeholder-[var(--tan)] focus:border-[var(--brown)] focus:outline-none focus:ring-4 focus:ring-[var(--brown)]/10"
              placeholder="Confirm your password"
              required
              minLength={6}
              autoComplete="new-password"
            />
          </div>
          {error && (
            <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
              <span className="text-sm font-medium text-red-700">{error}</span>
            </div>
          )}
          <button
            type="submit"
            disabled={isSubmitting || !password || !confirmPassword}
            className="w-full rounded-xl bg-gradient-to-r from-[var(--brown)] to-[var(--ink)] px-4 py-4 text-sm font-semibold text-white shadow-lg disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="h-5 w-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                Setting password...
              </span>
            ) : (
              "Set password & continue"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}

export default function SetPasswordPage() {
  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--ink)]">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -left-1/4 -top-1/4 h-[600px] w-[600px] rounded-full bg-[var(--brown)]/20 blur-3xl" />
        <div className="absolute -bottom-1/4 -right-1/4 h-[500px] w-[500px] rounded-full bg-[var(--accent)]/15 blur-3xl" />
      </div>
      <div className="relative z-10 w-full max-w-[440px] px-6">
        <div className="mb-12 flex justify-center">
          <Image
            src="/trustle-logo-v2.png"
            alt="Trustle"
            width={320}
            height={80}
            className="h-24 w-auto object-contain"
            priority
            unoptimized
          />
        </div>
        <Suspense fallback={<div className="rounded-2xl bg-white/95 p-8 text-center">Loading...</div>}>
          <SetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
