"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useSidebar } from "@/contexts/SidebarContext";
import { useAuth } from "@/contexts/AuthContext";
import { useBackendStatus } from "@/contexts/BackendStatusContext";

const nav = [
  {
    href: "/contacts",
    label: "Contacts",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
      </svg>
    ),
  },
  {
    href: "/search",
    label: "Search",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    ),
  },
  {
    href: "/imports",
    label: "Imports",
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
      </svg>
    ),
  },
  {
    href: "https://www.trustle.online/admin",
    label: "Admin Portal",
    external: true,
    icon: (
      <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();
  const { logout } = useAuth();
  const { status, retry } = useBackendStatus();

  return (
    <aside
      className={`fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-[var(--brown)]/30 bg-[var(--ink)] transition-[width] duration-200 ${
        collapsed ? "w-16" : "w-64"
      }`}
    >
      <div className={`flex h-24 items-center border-b border-[var(--brown)]/30 ${collapsed ? "justify-center px-2" : "px-4"}`}>
        {collapsed ? (
          <span className="font-display text-3xl font-bold text-[var(--accent)]">T</span>
        ) : (
          <Image
            src="/trustle-logo-v2.png"
            alt="Trustle"
            width={240}
            height={64}
            className="h-16 w-auto object-contain"
            priority
            unoptimized
          />
        )}
      </div>
      <div className="flex flex-1 flex-col gap-0.5 p-3">
        <button
          type="button"
          onClick={toggle}
          className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-medium text-[var(--tan)] transition-colors hover:bg-[var(--brown)]/30 hover:text-[var(--card-bg)]"
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <svg
            className={`h-5 w-5 shrink-0 transition-transform ${collapsed ? "rotate-180" : ""}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
          </svg>
          {!collapsed && <span>Collapse</span>}
        </button>
        {nav.map((item) => {
          const active = pathname === item.href;
          const className = `flex items-center rounded-xl py-2.5 text-sm font-medium transition-colors ${
            collapsed ? "justify-center px-0" : "gap-3 px-3"
          } ${
            active
              ? "bg-[var(--accent)]/20 text-[var(--card-bg)] shadow-inner"
              : "text-[var(--tan)] hover:bg-[var(--brown)]/30 hover:text-[var(--card-bg)]"
          }`;
          
          if (item.external) {
            return (
              <a
                key={item.href}
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                title={collapsed ? item.label : undefined}
                className={className}
              >
                {item.icon}
                {!collapsed && item.label}
              </a>
            );
          }
          
          return (
            <Link
              key={item.href}
              href={item.href}
              title={collapsed ? item.label : undefined}
              className={className}
            >
              {item.icon}
              {!collapsed && item.label}
            </Link>
          );
        })}
      </div>
      
      <div className="border-t border-[var(--brown)]/30 p-3 space-y-2">
        {status !== "idle" && (
          <div
            role={status === "offline" && collapsed ? "button" : undefined}
            tabIndex={status === "offline" && collapsed ? 0 : undefined}
            onClick={status === "offline" && collapsed ? retry : undefined}
            onKeyDown={
              status === "offline" && collapsed
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      retry();
                    }
                  }
                : undefined
            }
            className={`flex items-center gap-2 rounded-xl px-3 py-2 text-xs ${
              collapsed ? "justify-center" : ""
            } ${status === "offline" && collapsed ? "cursor-pointer hover:bg-[var(--brown)]/30" : ""} ${
              status === "online"
                ? "text-emerald-400"
                : status === "offline"
                  ? "text-amber-400"
                  : "text-[var(--tan)]"
            }`}
            title={
              status === "checking"
                ? "Checking backend…"
                : status === "online"
                  ? "Backend connected"
                  : status === "offline"
                    ? collapsed
                      ? "Backend offline – click to retry"
                      : "Backend offline or starting"
                    : undefined
            }
          >
            {status === "checking" && (
              <span className="h-2 w-2 shrink-0 animate-pulse rounded-full bg-current" aria-hidden />
            )}
            {status === "online" && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-emerald-500" aria-hidden />
            )}
            {status === "offline" && (
              <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden />
            )}
            {!collapsed && (
              <>
                {status === "checking" && <span>Checking…</span>}
                {status === "online" && <span>Backend connected</span>}
                {status === "offline" && (
                  <span className="flex items-center gap-2">
                    <span>Backend offline</span>
                    <button
                      type="button"
                      onClick={retry}
                      className="rounded bg-amber-500/20 px-1.5 py-0.5 text-amber-300 hover:bg-amber-500/30"
                    >
                      Retry
                    </button>
                  </span>
                )}
              </>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={logout}
          className={`flex w-full items-center rounded-xl py-2.5 text-sm font-medium text-[var(--tan)] transition-colors hover:bg-red-500/20 hover:text-red-300 ${
            collapsed ? "justify-center px-0" : "gap-3 px-3"
          }`}
          title={collapsed ? "Sign out" : undefined}
        >
          <svg className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
          </svg>
          {!collapsed && <span>Sign Out</span>}
        </button>
      </div>
    </aside>
  );
}
