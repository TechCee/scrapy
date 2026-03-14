"use client";

import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { getContacts, getRuns, getConfig, exportCsvUrl, createContact, enrichContacts, getContactStats } from "@/lib/api";
import type { Contact, ContactStats } from "@/lib/api";
import ContactsTable from "@/components/ContactsTable";
import { IconPlus, IconCheck, IconFilter, IconSparkles, IconDownload, IconX, IconChevronDown, IconChevronRight } from "@/components/Icons";

function formatRunOption(r: { id: string; started_at: string; saved_count: number; with_email_count: number }) {
  const started = r.started_at ? r.started_at.replace("T", " ").slice(0, 19) : "—";
  return `${started} · ${r.saved_count} saved, ${r.with_email_count} w/ email`;
}

function TableSkeleton() {
  return (
    <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="border-b border-slate-200 bg-slate-50/80 px-6 py-4">
        <div className="h-4 w-48 animate-pulse rounded bg-slate-200" />
      </div>
      <div className="divide-y divide-slate-100">
        {[1, 2, 3, 4, 5, 6, 7, 8].map((i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-4">
            <div className="h-4 w-32 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-40 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-28 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-36 animate-pulse rounded bg-slate-100" />
          </div>
        ))}
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-[var(--sand)] bg-[var(--card-bg)] py-24 shadow-[0_2px_8px_-2px_rgba(44,31,20,0.06)]">
      <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-[var(--sand)] text-[var(--brown)]">
        <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </div>
      <h3 className="font-display text-lg font-semibold text-[var(--ink)]">No contacts found</h3>
      <p className="mt-2 max-w-sm text-center text-sm text-[var(--brown)]">
        Try changing your filters or run a new search from the Search page.
      </p>
    </div>
  );
}

export default function ContactsPage() {
  const searchParams = useSearchParams();
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [stats, setStats] = useState<ContactStats | null>(null);
  const [runs, setRuns] = useState<{ id: string; started_at: string; saved_count: number; with_email_count: number }[]>([]);
  const [hunterWarning, setHunterWarning] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [filterName, setFilterName] = useState("");
  const [filterJobTitle, setFilterJobTitle] = useState("");
  const [filterCompany, setFilterCompany] = useState("");
  const [filterHasEmail, setFilterHasEmail] = useState("");
  const [filterRunId, setFilterRunId] = useState(searchParams.get("run_id") ?? "");
  const [filterValidated, setFilterValidated] = useState("");
  const [filterContacted, setFilterContacted] = useState("");
  const [filterResponded, setFilterResponded] = useState("");
  const [filterUnemployed, setFilterUnemployed] = useState("");
  const [filterHasSource, setFilterHasSource] = useState("");

  const [addModalOpen, setAddModalOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addJobTitle, setAddJobTitle] = useState("");
  const [addCompany, setAddCompany] = useState("");
  const [addSourceUrl, setAddSourceUrl] = useState("");
  const [addRunId, setAddRunId] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [enriching, setEnriching] = useState(false);
  const [enrichMessage, setEnrichMessage] = useState<string | null>(null);
  const [lastEnrichErrors, setLastEnrichErrors] = useState<{ id: number; message: string }[] | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const loadContacts = useCallback(async () => {
    const params = {
      name: filterName || undefined,
      job_title: filterJobTitle || undefined,
      company: filterCompany || undefined,
      has_email: filterHasEmail || undefined,
      run_id: filterRunId || undefined,
      validated: filterValidated || undefined,
      contacted: filterContacted || undefined,
      responded: filterResponded || undefined,
      unemployed: filterUnemployed || undefined,
      has_source: filterHasSource || undefined,
    };
    try {
      const [data, statsData] = await Promise.all([
        getContacts(params),
        getContactStats(params),
      ]);
      setContacts(data);
      setStats(statsData);
      setError(null);
    } catch (e) {
      setError((e as Error).message);
      setContacts([]);
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, [filterJobTitle, filterCompany, filterHasEmail, filterRunId]);

  useEffect(() => {
    const runId = searchParams.get("run_id");
    if (runId) setFilterRunId(runId);
  }, [searchParams]);

  useEffect(() => {
    setLoading(true);
    loadContacts();
  }, [loadContacts]);

  useEffect(() => {
    getRuns().then(setRuns).catch(() => setRuns([]));
  }, []);

  useEffect(() => {
    getConfig().then((c) => setHunterWarning(!c.hunter_configured)).catch(() => {});
  }, []);

  const handleApply = () => {
    setLoading(true);
    loadContacts();
  };

  /** Refetch contacts and runs (e.g. after delete so run dropdown counts update). */
  const refreshAll = useCallback(() => {
    loadContacts();
    getRuns().then(setRuns).catch(() => setRuns([]));
  }, [loadContacts]);

  const exportUrl = exportCsvUrl({
    name: filterName || undefined,
    job_title: filterJobTitle || undefined,
    company: filterCompany || undefined,
    has_email: filterHasEmail || undefined,
    run_id: filterRunId || undefined,
    validated: filterValidated || undefined,
    contacted: filterContacted || undefined,
    responded: filterResponded || undefined,
    unemployed: filterUnemployed || undefined,
    has_source: filterHasSource || undefined,
  });

  const contactsWithoutEmail = contacts.filter((c) => !(c.email && c.email.trim()));
  const handleEnrichMissingEmails = async () => {
    const ids = contactsWithoutEmail.map((c) => c.id);
    if (ids.length === 0) {
      setEnrichMessage("No contacts without email in the current list.");
      return;
    }
    setEnriching(true);
    setEnrichMessage(null);
    setLastEnrichErrors(null);
    try {
      const result = await enrichContacts(ids);
      refreshAll();
      setLastEnrichErrors(result.errors?.length ? result.errors : null);
      setEnrichMessage(
        result.enriched > 0
          ? `Enriched ${result.enriched} contact${result.enriched === 1 ? "" : "s"}.`
          : "No new emails found."
      );
      if (result.errors?.length) {
        setEnrichMessage((m) => (m ? `${m} ${result.errors!.length} error(s).` : `${result.errors!.length} error(s).`));
      }
    } catch (e) {
      setEnrichMessage((e as Error).message);
    } finally {
      setEnriching(false);
    }
  };

  const openAddModal = () => {
    setAddError(null);
    setAddName("");
    setAddEmail("");
    setAddJobTitle("");
    setAddCompany("");
    setAddSourceUrl("");
    setAddRunId("");
    setAddModalOpen(true);
  };

  const handleAddContact = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = addName.trim();
    if (!name) {
      setAddError("Name is required.");
      return;
    }
    setAddSaving(true);
    setAddError(null);
    try {
      await createContact({
        name,
        email: addEmail.trim() || undefined,
        job_title: addJobTitle.trim() || undefined,
        company: addCompany.trim() || undefined,
        source_url: addSourceUrl.trim() || undefined,
        run_id: addRunId || undefined,
      });
      setAddModalOpen(false);
      refreshAll();
    } catch (err) {
      setAddError((err as Error).message);
    } finally {
      setAddSaving(false);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--warm-white)]">
      {/* Sticky header + filters */}
      <div className="sticky top-0 z-20 bg-[var(--warm-white)]/95 backdrop-blur-sm">
        <div className="border-b border-[var(--sand)] bg-[var(--card-bg)] px-8 py-6 shadow-[0_1px_0_0_var(--sand)]">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-2xl font-semibold tracking-tight text-[var(--ink)]">Contacts</h1>
              <p className="mt-1 text-sm text-[var(--brown)]">View and manage contacts from your searches.</p>
            </div>
            <button
              type="button"
              onClick={openAddModal}
              className="inline-flex items-center gap-2 rounded-xl bg-[var(--brown)] px-4 py-2.5 text-sm font-medium text-[var(--card-bg)] shadow-sm transition hover:bg-[var(--ink)] hover:shadow"
            >
              <IconPlus />
              Add contact
            </button>
          </div>
        </div>

        <div className="border-b border-[var(--sand)] bg-[var(--warm-white)] px-8 pb-4 pt-4">
          {/* Collapsible Filters & Stats */}
          <div className="rounded-xl border-2 border-[var(--sand)] bg-[var(--card-bg)] shadow-[0_2px_8px_-2px_rgba(44,31,20,0.08)] overflow-hidden">
            <button
              type="button"
              onClick={() => setFiltersOpen((o) => !o)}
              className="flex w-full items-center justify-between gap-2 px-5 py-3 text-left text-sm font-medium text-[var(--ink)] hover:bg-[var(--sand)]/50 transition"
              aria-expanded={filtersOpen}
            >
              <span className="inline-flex items-center gap-2">
                <IconFilter />
                Filters & stats
              </span>
              <span className="text-[var(--brown)]">{filtersOpen ? <IconChevronDown /> : <IconChevronRight />}</span>
            </button>
            {filtersOpen && (
              <div className="border-t border-[var(--sand)] p-5">
                {/* Stats */}
                {stats !== null && (
                  <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                    <div className="rounded-xl border-2 border-[var(--sand)] bg-[var(--warm-white)] px-4 py-3 shadow-[0_2px_8px_-2px_rgba(44,31,20,0.06)]">
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--brown)]">Contacts</p>
                      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">{stats.contacts_count}</p>
                    </div>
                    <div className="rounded-xl border-2 border-[var(--sand)] bg-[var(--warm-white)] px-4 py-3 shadow-[0_2px_8px_-2px_rgba(44,31,20,0.06)]">
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--brown)]">Unemployed</p>
                      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">{stats.unemployed_count}</p>
                    </div>
                    <div className="rounded-xl border-2 border-[var(--sand)] bg-[var(--warm-white)] px-4 py-3 shadow-[0_2px_8px_-2px_rgba(44,31,20,0.06)]">
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--brown)]">Contacted</p>
                      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">{stats.contacted_count}</p>
                    </div>
                    <div className="rounded-xl border-2 border-[var(--sand)] bg-[var(--warm-white)] px-4 py-3 shadow-[0_2px_8px_-2px_rgba(44,31,20,0.06)]">
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--brown)]">Validated</p>
                      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">{stats.validated_count}</p>
                    </div>
                    <div className="rounded-xl border-2 border-[var(--sand)] bg-[var(--warm-white)] px-4 py-3 shadow-[0_2px_8px_-2px_rgba(44,31,20,0.06)]">
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--brown)]">Responded</p>
                      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">{stats.responded_count}</p>
                    </div>
                    <div className="rounded-xl border-2 border-[var(--sand)] bg-[var(--warm-white)] px-4 py-3 shadow-[0_2px_8px_-2px_rgba(44,31,20,0.06)]">
                      <p className="text-xs font-medium uppercase tracking-wider text-[var(--brown)]">Unique companies</p>
                      <p className="mt-1 font-display text-2xl font-semibold tabular-nums text-[var(--ink)]">{stats.unique_companies_count}</p>
                    </div>
                  </div>
                )}

                {/* Filter inputs */}
                <h3 className="mb-4 text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Filters</h3>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--brown)]">Name</label>
                <input
                  type="text"
                  value={filterName}
                  onChange={(e) => setFilterName(e.target.value)}
                  placeholder="Filter by name"
                  className="w-44 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--brown)]">Job title</label>
                <input
                  type="text"
                  value={filterJobTitle}
                  onChange={(e) => setFilterJobTitle(e.target.value)}
                  placeholder="e.g. VP Engineering"
                  className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--brown)]">Company</label>
                <input
                  type="text"
                  value={filterCompany}
                  onChange={(e) => setFilterCompany(e.target.value)}
                  placeholder="Filter by company"
                  className="w-48 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder-slate-400 focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                />
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--brown)]">Has email</label>
                <select
                  value={filterHasEmail}
                  onChange={(e) => setFilterHasEmail(e.target.value)}
                  className="w-32 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                >
                  <option value="">All</option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--brown)]">Run</label>
                <select
                  value={filterRunId}
                  onChange={(e) => setFilterRunId(e.target.value)}
                  className="min-w-[220px] rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                >
                  <option value="">All runs</option>
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatRunOption(r)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap items-end gap-4 border-t border-[var(--sand)] pt-4">
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--brown)]">Validated</label>
                <select
                  value={filterValidated}
                  onChange={(e) => setFilterValidated(e.target.value)}
                  className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                >
                  <option value="">All</option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--brown)]">Contacted</label>
                <select
                  value={filterContacted}
                  onChange={(e) => setFilterContacted(e.target.value)}
                  className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                >
                  <option value="">All</option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--brown)]">Responded</label>
                <select
                  value={filterResponded}
                  onChange={(e) => setFilterResponded(e.target.value)}
                  className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                >
                  <option value="">All</option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--brown)]">Unemployed</label>
                <select
                  value={filterUnemployed}
                  onChange={(e) => setFilterUnemployed(e.target.value)}
                  className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                >
                  <option value="">All</option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--brown)]">Has source</label>
                <select
                  value={filterHasSource}
                  onChange={(e) => setFilterHasSource(e.target.value)}
                  className="w-28 rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                >
                  <option value="">All</option>
                  <option value="1">Yes</option>
                  <option value="0">No</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleApply}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--sand)] bg-[var(--card-bg)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] shadow-sm transition hover:bg-[var(--sand)]"
                >
                  <IconFilter />
                  Apply
                </button>
                <button
                  type="button"
                  onClick={handleEnrichMissingEmails}
                  disabled={enriching || contactsWithoutEmail.length === 0}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--sand)] bg-[var(--card-bg)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] shadow-sm transition hover:bg-[var(--sand)] disabled:opacity-50 disabled:pointer-events-none"
                >
                  <IconSparkles />
                  {enriching ? "Enriching…" : "Enrich"}
                  {!enriching && contactsWithoutEmail.length > 0 && (
                    <span className="text-[var(--brown)]">({contactsWithoutEmail.length})</span>
                  )}
                </button>
                <a
                  href={exportUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--brown)] px-4 py-2.5 text-sm font-medium text-[var(--card-bg)] shadow-sm transition hover:bg-[var(--ink)] hover:shadow"
                >
                  <IconDownload />
                  Export CSV
                </a>
              </div>
            </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="p-8">
        {enrichMessage && (
          <div className="mb-6 rounded-xl border border-[var(--sand)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--ink)]">
            <div className="flex items-center gap-3">
              <span className="text-[var(--brown)]" aria-hidden>ℹ</span>
              {enrichMessage}
              <button
                type="button"
                onClick={() => { setEnrichMessage(null); setLastEnrichErrors(null); }}
                className="ml-auto inline-flex items-center gap-1.5 text-[var(--brown)] hover:text-[var(--ink)] hover:underline"
              >
                <IconX />
                Dismiss
              </button>
            </div>
            {lastEnrichErrors && lastEnrichErrors.length > 0 && (
              <details className="mt-3 border-t border-[var(--sand)] pt-3">
                <summary className="cursor-pointer list-none text-[var(--brown)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                  Why did some fail?
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-[var(--brown)]">
                  {(() => {
                    const byMessage = new Map<string, number>();
                    for (const e of lastEnrichErrors) {
                      byMessage.set(e.message, (byMessage.get(e.message) ?? 0) + 1);
                    }
                    return Array.from(byMessage.entries())
                      .sort((a, b) => b[1] - a[1])
                      .map(([msg, count]) => (
                        <li key={msg}>
                          {count}× {msg}
                        </li>
                      ));
                  })()}
                </ul>
              </details>
            )}
          </div>
        )}
        {hunterWarning && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
            <span className="text-amber-500" aria-hidden>
              ⚠
            </span>
            Add <strong>HUNTER_API_KEY</strong> to your <code className="rounded bg-amber-100/80 px-1.5 py-0.5 font-mono text-xs">.env</code> to find emails automatically.
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="text-red-500" aria-hidden>
              ✕
            </span>
            {error}
            <span className="text-red-600">Make sure the backend is running (python server.py on port 5000).</span>
          </div>
        )}

        {loading ? (
          <TableSkeleton />
        ) : contacts.length === 0 ? (
          <EmptyState />
        ) : (
          <ContactsTable contacts={contacts} onRefresh={refreshAll} />
        )}
      </div>

      {/* Add contact modal */}
      {addModalOpen && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-contact-title"
          onClick={() => setAddModalOpen(false)}
        >
          <div className="w-full max-w-md rounded-2xl border-2 border-[var(--sand)] bg-[var(--card-bg)] p-6 shadow-[0_24px_48px_-12px_rgba(44,31,20,0.2)]" onClick={(e) => e.stopPropagation()}>
            <h2 id="add-contact-title" className="font-display text-lg font-semibold text-[var(--ink)]">Add contact</h2>
            <form onSubmit={handleAddContact} className="mt-4 space-y-4">
              {addError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{addError}</div>
              )}
              <div>
                <label htmlFor="add-name" className="mb-1 block text-xs font-medium text-[var(--brown)]">Name *</label>
                <input
                  id="add-name"
                  type="text"
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  placeholder="Full name"
                  required
                  className="w-full rounded-lg border-2 border-[var(--sand)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                />
              </div>
              <div>
                <label htmlFor="add-email" className="mb-1 block text-xs font-medium text-[var(--brown)]">Email</label>
                <input
                  id="add-email"
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  placeholder="email@example.com"
                  className="w-full rounded-lg border-2 border-[var(--sand)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                />
              </div>
              <div>
                <label htmlFor="add-job-title" className="mb-1 block text-xs font-medium text-[var(--brown)]">Job title</label>
                <input
                  id="add-job-title"
                  type="text"
                  value={addJobTitle}
                  onChange={(e) => setAddJobTitle(e.target.value)}
                  placeholder="e.g. VP Engineering"
                  className="w-full rounded-lg border-2 border-[var(--sand)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                />
              </div>
              <div>
                <label htmlFor="add-company" className="mb-1 block text-xs font-medium text-[var(--brown)]">Company</label>
                <input
                  id="add-company"
                  type="text"
                  value={addCompany}
                  onChange={(e) => setAddCompany(e.target.value)}
                  placeholder="Company name"
                  className="w-full rounded-lg border-2 border-[var(--sand)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                />
              </div>
              <div>
                <label htmlFor="add-source" className="mb-1 block text-xs font-medium text-[var(--brown)]">Source URL</label>
                <input
                  id="add-source"
                  type="url"
                  value={addSourceUrl}
                  onChange={(e) => setAddSourceUrl(e.target.value)}
                  placeholder="https://linkedin.com/in/..."
                  className="w-full rounded-lg border-2 border-[var(--sand)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                />
              </div>
              <div>
                <label htmlFor="add-run" className="mb-1 block text-xs font-medium text-[var(--brown)]">Run</label>
                <select
                  id="add-run"
                  value={addRunId}
                  onChange={(e) => setAddRunId(e.target.value)}
                  className="w-full rounded-lg border-2 border-[var(--sand)] px-3 py-2 text-sm text-[var(--ink)] focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                >
                  <option value="">None</option>
                  {runs.map((r) => (
                    <option key={r.id} value={r.id}>
                      {formatRunOption(r)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 pt-4">
                <button
                  type="button"
                  onClick={() => setAddModalOpen(false)}
                  className="inline-flex items-center gap-2 rounded-xl border-2 border-[var(--sand)] bg-[var(--card-bg)] px-4 py-2.5 text-sm font-medium text-[var(--ink)] hover:bg-[var(--sand)]"
                >
                  <IconX />
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addSaving}
                  className="inline-flex items-center gap-2 rounded-xl bg-[var(--brown)] px-4 py-2.5 text-sm font-medium text-[var(--card-bg)] hover:bg-[var(--ink)] disabled:opacity-50"
                >
                  <IconCheck />
                  {addSaving ? "Saving…" : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
