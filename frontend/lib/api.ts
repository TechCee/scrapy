// Use same-origin so Next.js rewrites proxy to Flask (avoids CORS)
const getApiBase = () =>
  typeof window !== "undefined" ? "" : process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

/** Full backend URL. Use for long-running requests (e.g. enrich) so the browser hits Flask directly and avoids Next.js proxy socket timeout. */
const getBackendBase = () =>
  process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:5000";

export async function getConfig() {
  const res = await fetch(`${getApiBase()}/api/config`);
  if (!res.ok) throw new Error("Failed to fetch config");
  return res.json();
}

export async function getRuns() {
  const res = await fetch(`${getApiBase()}/api/runs?limit=50`);
  if (!res.ok) throw new Error("Failed to fetch runs");
  const data = await res.json();
  return data.runs as { id: string; started_at: string; job_titles: string; saved_count: number; with_email_count: number }[];
}

export type FilterParams = {
  name?: string;
  job_title?: string;
  company?: string;
  has_email?: string;
  run_id?: string;
  validated?: string;
  contacted?: string;
  responded?: string;
  unemployed?: string;
  has_source?: string;
};

export async function getContacts(params: FilterParams) {
  const sp = new URLSearchParams();
  if (params.name) sp.set("name", params.name);
  if (params.job_title) sp.set("job_title", params.job_title);
  if (params.company) sp.set("company", params.company);
  if (params.has_email) sp.set("has_email", params.has_email);
  if (params.run_id) sp.set("run_id", params.run_id);
  if (params.validated) sp.set("validated", params.validated);
  if (params.contacted) sp.set("contacted", params.contacted);
  if (params.responded) sp.set("responded", params.responded);
  if (params.unemployed) sp.set("unemployed", params.unemployed);
  if (params.has_source) sp.set("has_source", params.has_source);
  const res = await fetch(`${getApiBase()}/api/contacts?${sp.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch contacts");
  const data = await res.json();
  return data.contacts as Contact[];
}

export async function getContactStats(params: FilterParams): Promise<ContactStats> {
  const sp = new URLSearchParams();
  if (params.name) sp.set("name", params.name);
  if (params.job_title) sp.set("job_title", params.job_title);
  if (params.company) sp.set("company", params.company);
  if (params.has_email) sp.set("has_email", params.has_email);
  if (params.run_id) sp.set("run_id", params.run_id);
  if (params.validated) sp.set("validated", params.validated);
  if (params.contacted) sp.set("contacted", params.contacted);
  if (params.responded) sp.set("responded", params.responded);
  if (params.unemployed) sp.set("unemployed", params.unemployed);
  if (params.has_source) sp.set("has_source", params.has_source);
  const res = await fetch(`${getApiBase()}/api/contacts/stats?${sp.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch stats");
  return res.json() as Promise<ContactStats>;
}

export interface Contact {
  id: number;
  name: string;
  email: string | null;
  job_title: string | null;
  company: string | null;
  company_domain: string | null;
  source_url: string | null;
  run_id: string | null;
  validated?: number;
  contacted?: number;
  responded?: number;
  unemployed?: number;
  alternative_email?: string | null;
  created_at: string;
}

export interface ContactStats {
  contacts_count: number;
  unemployed_count: number;
  contacted_count: number;
  validated_count: number;
  responded_count: number;
  unique_companies_count: number;
}

export async function patchContact(
  id: number,
  payload: {
    name?: string;
    email?: string;
    job_title?: string;
    company?: string;
    validated?: boolean;
    contacted?: boolean;
    responded?: boolean;
    unemployed?: boolean;
    alternative_email?: string;
    source_url?: string;
  }
) {
  const res = await fetch(`${getApiBase()}/api/contacts/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Update failed");
  }
  return res.json();
}

export async function createContact(payload: {
  name: string;
  email?: string;
  job_title?: string;
  company?: string;
  run_id?: string;
  source_url?: string;
}): Promise<Contact> {
  const res = await fetch(`${getApiBase()}/api/contacts`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Create failed");
  }
  const data = await res.json();
  return data.contact as Contact;
}

export async function deleteContact(id: number) {
  const res = await fetch(`${getApiBase()}/api/contacts/${id}`, { method: "DELETE" });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as { error?: string }).error || "Delete failed");
  }
  return res.json();
}

export interface EnrichResult {
  enriched: number;
  skipped: number;
  errors: { id: number; message: string }[];
}

/** Enrich can take 1+ second per contact (Hunter rate limit). Use a long timeout so the client doesn't abort before the server responds. */
const ENRICH_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

export async function enrichContacts(contactIds: number[]): Promise<EnrichResult> {
  const ac = new AbortController();
  const timeoutId = setTimeout(() => ac.abort(), ENRICH_TIMEOUT_MS);
  try {
    const res = await fetch(`${getBackendBase()}/api/contacts/enrich`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contact_ids: contactIds }),
      signal: ac.signal,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error((err as { error?: string }).error || "Enrich failed");
    }
    const data = (await res.json()) as EnrichResult;
    return {
      enriched: data.enriched ?? 0,
      skipped: data.skipped ?? 0,
      errors: Array.isArray(data.errors) ? data.errors : [],
    };
  } catch (e) {
    if (e instanceof Error) {
      if (e.name === "AbortError") {
        throw new Error(
          "Enrichment timed out. The server may still be processing—refresh the contacts list to see updates."
        );
      }
      throw e;
    }
    throw e;
  } finally {
    clearTimeout(timeoutId);
  }
}

/** Always returns a relative URL so server and client render the same href (avoids hydration mismatch). */
export function exportCsvUrl(params: FilterParams) {
  const sp = new URLSearchParams();
  if (params.name) sp.set("name", params.name);
  if (params.job_title) sp.set("job_title", params.job_title);
  if (params.company) sp.set("company", params.company);
  if (params.has_email) sp.set("has_email", params.has_email);
  if (params.run_id) sp.set("run_id", params.run_id);
  if (params.validated) sp.set("validated", params.validated);
  if (params.contacted) sp.set("contacted", params.contacted);
  if (params.responded) sp.set("responded", params.responded);
  if (params.unemployed) sp.set("unemployed", params.unemployed);
  if (params.has_source) sp.set("has_source", params.has_source);
  return `/api/export?${sp.toString()}`;
}

export async function runSearchStream(
  jobTitles: string[],
  hunterEnabled: boolean,
  onEvent: (event: { type: string; message?: string; level?: string; saved?: number; with_email?: number; errors?: string[]; run_id?: string | null }) => void,
  linkedinOnly?: boolean
) {
  const res = await fetch(`${getApiBase()}/api/run/stream`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      job_titles: jobTitles.length ? jobTitles.join("\n") : "",
      hunter_enabled: hunterEnabled,
      linkedin_only: linkedinOnly ?? false,
    }),
  });
  if (!res.ok) throw new Error(`Request failed: ${res.status}`);
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const parts = buffer.split("\n\n");
    buffer = parts.pop() || "";
    for (const part of parts) {
      const m = part.match(/^data:\s*(.+)$/m);
      if (!m) continue;
      try {
        const event = JSON.parse(m[1].trim()) as { type: string; message?: string; level?: string; saved?: number; with_email?: number; errors?: string[]; run_id?: string | null };
        onEvent(event);
      } catch {
        // skip parse errors
      }
    }
  }
  if (buffer.trim()) {
    const m = buffer.match(/^data:\s*(.+)$/m);
    if (m) {
      try {
        const event = JSON.parse(m[1].trim()) as { type: string; message?: string; saved?: number; with_email?: number; errors?: string[]; run_id?: string | null };
        onEvent(event);
      } catch {
        // skip
      }
    }
  }
}

export type ImportResult = {
  created: number;
  updated: number;
  skipped: number;
  errors: { row: number; message: string }[];
  contacts?: Contact[];
  column_mappings?: Record<string, string>;
};

export async function uploadImportFile(file: File): Promise<ImportResult & { error?: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${getApiBase()}/api/imports/upload`, {
    method: "POST",
    body: form,
  });
  const data = (await res.json()) as ImportResult & { error?: string };
  if (!res.ok) {
    throw new Error(data.error || "Import failed");
  }
  return data;
}

/** Stream import with progress. Calls onProgress(processed, total) as rows are processed; returns final result. */
export async function uploadImportFileWithProgress(
  file: File,
  onProgress: (processed: number, total: number) => void
): Promise<ImportResult & { error?: string }> {
  const form = new FormData();
  form.append("file", file);
  const res = await fetch(`${getApiBase()}/api/imports/upload?stream=1`, {
    method: "POST",
    body: form,
  });
  if (!res.ok) {
    const data = (await res.json()) as { error?: string };
    throw new Error(data.error || "Import failed");
  }
  const reader = res.body?.getReader();
  if (!reader) throw new Error("No response body");
  const decoder = new TextDecoder();
  let buffer = "";
  let doneResult: (ImportResult & { error?: string }) | null = null;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      try {
        const event = JSON.parse(trimmed) as { type: string; processed?: number; total?: number; column_mappings?: Record<string, string> } & ImportResult;
        if (event.type === "progress" && typeof event.processed === "number" && typeof event.total === "number") {
          onProgress(event.processed, event.total);
        } else if (event.type === "done") {
          doneResult = {
            created: event.created ?? 0,
            updated: event.updated ?? 0,
            skipped: event.skipped ?? 0,
            errors: Array.isArray(event.errors) ? event.errors : [],
            contacts: Array.isArray((event as { contacts?: Contact[] }).contacts) ? (event as { contacts: Contact[] }).contacts : [],
            column_mappings: event.column_mappings ?? {},
          };
        }
      } catch {
        // ignore malformed lines
      }
    }
  }
  if (buffer.trim()) {
    try {
      const event = JSON.parse(buffer.trim()) as { type: string; contacts?: Contact[]; column_mappings?: Record<string, string> } & ImportResult;
      if (event.type === "done") {
        doneResult = {
          created: event.created ?? 0,
          updated: event.updated ?? 0,
          skipped: event.skipped ?? 0,
          errors: Array.isArray(event.errors) ? event.errors : [],
          contacts: Array.isArray(event.contacts) ? event.contacts : [],
          column_mappings: event.column_mappings ?? {},
        };
      }
    } catch {
      // ignore
    }
  }
  if (!doneResult) throw new Error("Import did not complete");
  return doneResult;
}

export const DEFAULT_TITLES = [
  "Head of HR",
  "Chief People Officer",
  "VP People",
  "Head of People",
  "Head of Engineering",
  "VP Engineering",
  "CTO",
  "Head of Learning & Development",
  "Director of People & Culture",
  "Head of Employee Experience",
];
