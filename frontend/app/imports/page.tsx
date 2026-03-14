"use client";

import { useState, useRef } from "react";
import Link from "next/link";
import { uploadImportFileWithProgress } from "@/lib/api";
import type { Contact } from "@/lib/api";
import { IconUpload, IconX } from "@/components/Icons";

const SUPPORTED_COLUMNS = [
  { field: "name", examples: "Name, Full Name, Contact Name" },
  { field: "email", examples: "Email, Email Address, Work Email" },
  { field: "company", examples: "Company, Company Name, Organization" },
  { field: "job_title", examples: "Job Title, Title, Position, Role" },
  { field: "source_url", examples: "LinkedIn, LinkedIn URL, Source URL" },
  { field: "validated", examples: "Validated, Valid, Verified" },
  { field: "alternative_email", examples: "Alternative Email, Alt Email, Secondary Email" },
];

export default function ImportsPage() {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState<{ processed: number; total: number } | null>(null);
  const [result, setResult] = useState<{
    created: number;
    updated: number;
    skipped: number;
    errors: { row: number; message: string }[];
    contacts?: Contact[];
    column_mappings?: Record<string, string>;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    setFile(f || null);
    setResult(null);
    setError(null);
    setProgress(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setUploading(true);
    setError(null);
    setResult(null);
    setProgress(null);
    try {
      const data = await uploadImportFileWithProgress(file, (processed, total) => {
        setProgress({ processed, total });
      });
      setResult({
        created: data.created ?? 0,
        updated: data.updated ?? 0,
        skipped: data.skipped ?? 0,
        errors: Array.isArray(data.errors) ? data.errors : [],
        contacts: Array.isArray(data.contacts) ? data.contacts : [],
        column_mappings: data.column_mappings ?? {},
      });
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setUploading(false);
      setProgress(null);
      if (inputRef.current) inputRef.current.value = "";
      setFile(null);
    }
  };

  const clearResult = () => {
    setResult(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[var(--background)]">
      <div className="border-b border-[var(--sand)] bg-[var(--card-bg)]/80 px-8 py-6 shadow-[var(--shadow-sm)]">
        <h1 className="font-display text-xl font-bold text-[var(--ink)]">Import Contacts</h1>
        <p className="mt-1 text-sm text-[var(--brown)]">
          Upload an .xlsx file to add or update contacts. Column headers are automatically detected. Re-uploading the same file updates existing records.
        </p>
      </div>

      <div className="p-8">
        <div className="rounded-2xl border border-[var(--sand)] bg-[var(--card-bg)] p-6 shadow-[var(--shadow)]">
          <h2 className="font-display text-sm font-semibold uppercase tracking-wider text-[var(--brown)]">Upload File</h2>
          <p className="mt-1 text-sm text-[var(--ink)]">
            Columns are auto-detected from your file headers. Supported columns:
          </p>
          <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {SUPPORTED_COLUMNS.map((col) => (
              <div key={col.field} className="rounded-lg bg-[var(--sand)]/40 px-3 py-2">
                <div className="text-xs font-semibold text-[var(--ink)]">{col.field}</div>
                <div className="text-xs text-[var(--brown)]">{col.examples}</div>
              </div>
            ))}
          </div>
          <ul className="mt-4 list-inside list-disc space-y-1 text-sm text-[var(--brown)]">
            <li>Existing contacts are matched by <strong>email first</strong>, then by <strong>company + name</strong>.</li>
            <li>If a match is found, the record is updated; otherwise, a new contact is created.</li>
            <li>Set <strong>Validated</strong> to <code className="rounded bg-[var(--sand)]/60 px-1 py-0.5 font-mono text-xs">Y</code> or <code className="rounded bg-[var(--sand)]/60 px-1 py-0.5 font-mono text-xs">1</code> to mark as validated.</li>
          </ul>

          <form onSubmit={handleSubmit} className="mt-6">
            <label className="block">
              <span className="mb-2 block text-sm font-medium text-[var(--ink)]">Choose .xlsx file</span>
              <input
                ref={inputRef}
                type="file"
                accept=".xlsx,.xls"
                onChange={handleFileChange}
                className="block w-full max-w-md text-sm text-[var(--brown)] file:mr-4 file:rounded-lg file:border-0 file:bg-[var(--sand)] file:px-4 file:py-2 file:text-sm file:font-medium file:text-[var(--ink)] hover:file:bg-[var(--accent)]/80"
              />
            </label>
            <div className="mt-4 flex items-center gap-3">
              <button
                type="submit"
                disabled={!file || uploading}
                className="inline-flex items-center gap-2 rounded-xl bg-[var(--brown)] px-4 py-2.5 text-sm font-medium text-white shadow-sm transition hover:bg-[var(--ink)] disabled:opacity-50"
              >
                <IconUpload className="h-4 w-4" />
                {uploading ? "Importing…" : "Import"}
              </button>
              <Link
                href="/contacts"
                className="inline-flex items-center gap-2 rounded-xl border border-[var(--sand)] bg-[var(--card-bg)] px-4 py-2.5 text-sm font-medium text-[var(--brown)] transition hover:bg-[var(--sand)] hover:text-[var(--ink)]"
              >
                View contacts
              </Link>
            </div>
            {uploading && progress && (
              <div className="mt-4">
                <div className="flex items-center justify-between text-xs text-[var(--brown)]">
                  <span>Processing rows</span>
                  <span>
                    {progress.processed} / {progress.total}
                  </span>
                </div>
                <div
                  className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-[var(--sand)]"
                  role="progressbar"
                  aria-valuenow={progress.total ? Math.round((100 * progress.processed) / progress.total) : 0}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  <div
                    className="h-full rounded-full bg-[var(--brown)] transition-[width] duration-200 ease-out"
                    style={{
                      width: progress.total ? `${(100 * progress.processed) / progress.total}%` : "0%",
                    }}
                  />
                </div>
              </div>
            )}
          </form>
        </div>

        {error && (
          <div className="mt-6 flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            <span className="text-red-500" aria-hidden>✕</span>
            {error}
            <button type="button" onClick={clearResult} className="ml-auto flex items-center gap-1.5 text-red-600 hover:underline">
              <IconX className="h-4 w-4" />
              Dismiss
            </button>
          </div>
        )}

        {result && (
          <div className="mt-6 rounded-xl border border-[var(--sand)] bg-[var(--card-bg)] px-4 py-3 text-sm text-[var(--ink)]">
            <div className="flex items-center gap-3">
              <span className="text-[var(--brown)]" aria-hidden>ℹ</span>
              <span>
                Created <strong>{result.created}</strong>, updated <strong>{result.updated}</strong>, skipped <strong>{result.skipped}</strong>.
                {result.errors.length > 0 && ` ${result.errors.length} row error(s).`}
              </span>
              <button
                type="button"
                onClick={clearResult}
                className="ml-auto inline-flex items-center gap-1.5 text-[var(--brown)] hover:text-[var(--ink)] hover:underline"
              >
                <IconX className="h-4 w-4" />
                Dismiss
              </button>
            </div>

            {result.column_mappings && Object.keys(result.column_mappings).length > 0 && (
              <div className="mt-3 border-t border-[var(--sand)] pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Detected columns</h3>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(result.column_mappings).map(([header, field]) => (
                    <span
                      key={header}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--sand)]/60 px-2 py-1 text-xs"
                    >
                      <span className="text-[var(--ink)]">{header}</span>
                      <span className="text-[var(--brown)]">→</span>
                      <span className="font-medium text-[var(--brown)]">{field}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}

            {result.errors.length > 0 && (
              <details className="mt-3 border-t border-[var(--sand)] pt-3">
                <summary className="cursor-pointer list-none text-[var(--brown)] hover:text-[var(--ink)] [&::-webkit-details-marker]:hidden">
                  Row errors
                </summary>
                <ul className="mt-2 space-y-1 text-xs text-[var(--brown)]">
                  {result.errors.map((e, i) => (
                    <li key={i}>
                      Row {e.row}: {e.message}
                    </li>
                  ))}
                </ul>
              </details>
            )}

            {result.contacts && result.contacts.length > 0 && (
              <div className="mt-4 border-t border-[var(--sand)] pt-3">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Imported records ({result.contacts.length})</h3>
                <div className="mt-2 overflow-x-auto rounded-lg border border-[var(--sand)]">
                  <table className="w-full min-w-[400px] text-sm">
                    <thead className="bg-[var(--sand)]/40">
                      <tr>
                        <th className="px-4 py-2.5 text-left font-medium text-[var(--brown)]">Name</th>
                        <th className="px-4 py-2.5 text-left font-medium text-[var(--brown)]">Company</th>
                        <th className="px-4 py-2.5 text-left font-medium text-[var(--brown)]">Email</th>
                        <th className="px-4 py-2.5 text-center font-medium text-[var(--brown)]">Validated</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[var(--sand)]">
                      {result.contacts.map((c) => (
                        <tr key={c.id} className="bg-[var(--card-bg)]">
                          <td className="px-4 py-2.5 text-[var(--ink)]">{c.name || "—"}</td>
                          <td className="px-4 py-2.5 text-[var(--ink)]">{c.company || "—"}</td>
                          <td className="px-4 py-2.5 text-[var(--brown)]">{c.email || "—"}</td>
                          <td className="px-4 py-2.5 text-center">
                            {c.validated ? (
                              <span className="text-[var(--brown)]" title="Validated">✓</span>
                            ) : (
                              <span className="text-[var(--tan)]">—</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
