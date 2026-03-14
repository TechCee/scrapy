"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { runSearchStream, getConfig, DEFAULT_TITLES } from "@/lib/api";
import { useRouter } from "next/navigation";
import { IconPlay, IconUsers, IconDocumentText, IconChevronDown, IconChevronRight } from "@/components/Icons";

export default function SearchPage() {
  const router = useRouter();
  const [jobTitles, setJobTitles] = useState(DEFAULT_TITLES.join("\n"));
  const [hunterEnabled, setHunterEnabled] = useState(true);
  const [linkedInOnly, setLinkedInOnly] = useState(false);
  const [running, setRunning] = useState(false);
  const [status, setStatus] = useState("");
  const [logOpen, setLogOpen] = useState(true);
  const [logLines, setLogLines] = useState<{ level: string; text: string }[]>([]);
  const [lastRunId, setLastRunId] = useState<string | null>(null);
  const [hunterWarning, setHunterWarning] = useState(false);
  const [connectionError, setConnectionError] = useState(false);
  const logEndRef = useRef<HTMLDivElement>(null);

  const scrollLog = useCallback(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    getConfig()
      .then((c) => {
        setHunterWarning(!c.hunter_configured);
        setConnectionError(false);
      })
      .catch(() => setConnectionError(true));
  }, []);

  const runSearch = async () => {
    const titles = jobTitles
      .split("\n")
      .map((t) => t.trim())
      .filter(Boolean);
    if (titles.length === 0) {
      setStatus("Enter at least one job title.");
      return;
    }
    setRunning(true);
    setStatus("Starting search…");
    setLogLines([]);
    setLastRunId(null);
    setConnectionError(false);

    try {
      await runSearchStream(
        titles,
        hunterEnabled,
        (event) => {
          if (event.type === "progress") {
            setStatus(event.message ?? "Running…");
            if (event.message) {
              setLogLines((prev) => [...prev, { level: event.level ?? "info", text: event.message ?? "" }]);
              scrollLog();
            }
          } else if (event.type === "done") {
            setStatus(`Done. Saved: ${event.saved ?? 0}, with email: ${event.with_email ?? 0}`);
            if (event.run_id) setLastRunId(event.run_id);
            setLogLines((prev) => [
              ...prev,
              { level: "info", text: `Run completed. Run ID: ${event.run_id ?? "—"}` },
            ]);
            scrollLog();
            setRunning(false);
          }
        },
        linkedInOnly
      );
    } catch (e) {
      setStatus(`Error: ${(e as Error).message}`);
      setLogLines((prev) => [...prev, { level: "error", text: (e as Error).message }]);
      setRunning(false);
      setConnectionError(true);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--warm-white)]">
      {/* Page header */}
      <div className="border-b border-[var(--sand)] bg-[var(--card-bg)] px-8 py-6 shadow-[0_1px_0_0_var(--sand)]">
        <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">Search</h1>
        <p className="mt-1 text-sm text-[var(--brown)]">Run a new search by job titles. Results appear in Contacts.</p>
      </div>

      <div className="p-8">
        {connectionError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="text-red-500" aria-hidden>✕</span>
            <span>
              Cannot reach the API. Start the backend with <code className="rounded bg-red-100 px-1.5 py-0.5 font-mono text-xs">python server.py</code> (port 5000), then refresh.
            </span>
          </div>
        )}

        {hunterWarning && !connectionError && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="text-amber-500" aria-hidden>⚠</span>
            Add <strong>HUNTER_API_KEY</strong> to your <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs">.env</code> to find emails automatically.
          </div>
        )}

        {/* Search card */}
        <div className="mb-6 rounded-2xl border-2 border-[var(--sand)] bg-[var(--card-bg)] p-6 shadow-[0_2px_8px_-2px_rgba(44,31,20,0.08)]">
          <h2 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Job titles</h2>
          <label htmlFor="search-job-titles" className="sr-only">
            Job titles (one per line)
          </label>
          <textarea
            id="search-job-titles"
            value={jobTitles}
            onChange={(e) => setJobTitles(e.target.value)}
            rows={10}
            className="w-full rounded-xl border-2 border-[var(--sand)] bg-white px-4 py-3 font-mono text-sm text-[var(--ink)] placeholder-[var(--tan)] focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
            placeholder="Head of HR&#10;Chief People Officer&#10;..."
            disabled={running}
            aria-describedby="search-job-titles-hint"
          />
          <p id="search-job-titles-hint" className="mt-1.5 text-xs text-[var(--brown)]">
            One job title per line. Results are saved to Contacts.
          </p>

          {/* Options */}
          <div className="mt-6 border-t-2 border-[var(--sand)] pt-5">
            <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Options</h3>
            <div className="flex flex-wrap gap-6">
              <label className="flex cursor-pointer items-start gap-2.5" htmlFor="search-hunter">
                <input
                  id="search-hunter"
                  type="checkbox"
                  checked={hunterEnabled}
                  onChange={(e) => setHunterEnabled(e.target.checked)}
                  disabled={running}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--tan)] text-[var(--brown)] focus:ring-[var(--brown)]"
                  aria-describedby="search-hunter-hint"
                />
                <span className="text-sm font-medium text-[var(--ink)]">Use Hunter.io for emails</span>
                <span id="search-hunter-hint" className="sr-only">
                  When enabled, the pipeline will look up email addresses from company and name using Hunter.io.
                </span>
              </label>
              <label className="flex cursor-pointer items-start gap-2.5" htmlFor="search-linkedin-only">
                <input
                  id="search-linkedin-only"
                  type="checkbox"
                  checked={linkedInOnly}
                  onChange={(e) => setLinkedInOnly(e.target.checked)}
                  disabled={running}
                  className="mt-0.5 h-4 w-4 rounded border-[var(--tan)] text-[var(--brown)] focus:ring-[var(--brown)]"
                  aria-describedby="search-linkedin-only-hint"
                />
                <div>
                  <span className="text-sm font-medium text-[var(--ink)]">Search on LinkedIn only</span>
                  <p id="search-linkedin-only-hint" className="mt-0.5 text-xs text-[var(--brown)]">
                    Only LinkedIn profile URLs; name and company from search snippet.
                  </p>
                </div>
              </label>
            </div>
          </div>

          {/* Actions */}
          <div className="mt-6 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={runSearch}
              disabled={running}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brown)] px-5 py-2.5 text-sm font-medium text-[var(--card-bg)] shadow-sm transition hover:bg-[var(--ink)] hover:shadow disabled:opacity-50"
            >
              {running ? (
                <>
                  <svg className="h-4 w-4 shrink-0 animate-spin text-white" fill="none" viewBox="0 0 24 24" aria-hidden>
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Running…
                </>
              ) : (
                <>
                  <IconPlay />
                  Run search
                </>
              )}
            </button>
            {lastRunId && (
              <button
                type="button"
                onClick={() => router.push(`/contacts?run_id=${lastRunId}`)}
                className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--sand)] bg-[var(--card-bg)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] shadow-sm transition hover:bg-[var(--sand)]"
              >
                <IconUsers />
                View this run in Contacts
                <IconChevronRight />
              </button>
            )}
          </div>
        </div>

        {status && (
          <div className="mb-6 rounded-xl border-2 border-[var(--sand)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--ink)] shadow-[0_2px_8px_-2px_rgba(44,31,20,0.06)]">
            {status}
          </div>
        )}

        {/* Log panel */}
        <div className="overflow-hidden rounded-2xl border-2 border-[var(--sand)] bg-slate-900 shadow-[0_2px_8px_-2px_rgba(44,31,20,0.08)]">
          <button
            type="button"
            onClick={() => setLogOpen(!logOpen)}
            className="flex w-full items-center justify-between gap-2 px-5 py-3.5 text-left text-sm font-medium text-[var(--tan)] hover:bg-slate-800/50 transition"
            aria-expanded={logOpen}
          >
            <span className="inline-flex items-center gap-2">
              <IconDocumentText />
              Log
            </span>
            <span className="text-[var(--brown)]">{logOpen ? <IconChevronDown /> : <IconChevronRight />}</span>
          </button>
          {logOpen && (
            <div className="max-h-72 overflow-y-auto border-t border-slate-700 px-5 py-4 font-mono text-xs">
              {logLines.length === 0 ? (
                <div className="text-[var(--brown)]">No log output yet. Run a search to see progress.</div>
              ) : (
                logLines.map((line, i) => (
                  <div
                    key={i}
                    className={line.level === "error" ? "text-red-400" : "text-slate-400"}
                  >
                    {line.text}
                  </div>
                ))
              )}
              <div ref={logEndRef} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
