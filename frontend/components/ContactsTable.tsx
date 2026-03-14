"use client";

import { useState, useRef, useEffect } from "react";
import type { Contact } from "@/lib/api";
import { patchContact, deleteContact } from "@/lib/api";
import { IconCheck, IconX, IconPencil, IconTrash, IconEye, IconDotsVertical, IconBriefcase, IconMail } from "@/components/Icons";
import { EMAIL_TEMPLATES, fillEmailTemplate, buildMailtoUrl } from "@/lib/emailTemplates";

function EditableCell({
  value,
  field,
  contactId,
  placeholder,
  emptyLabel,
  inputType = "text",
  onSaved,
}: {
  value: string;
  field: "name" | "email" | "job_title" | "company" | "source_url";
  contactId: number;
  placeholder: string;
  emptyLabel: string;
  inputType?: "text" | "email" | "url";
  onSaved: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(value);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await patchContact(contactId, { [field]: input });
      onSaved();
      setEditing(false);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setSaving(false);
    }
  };

  if (editing) {
    return (
      <div className="flex min-w-0 flex-col gap-2">
        <input
          type={inputType}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          className="min-w-0 rounded-lg border border-[var(--sand)] px-2.5 py-1.5 text-sm focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
          placeholder={placeholder}
          autoFocus
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={save}
            disabled={saving}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown)] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[var(--ink)] disabled:opacity-50"
          >
            <IconCheck className="h-3.5 w-3.5" />
            {saving ? "…" : "Save"}
          </button>
          <button
            type="button"
            onClick={() => { setEditing(false); setInput(value); }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sand)] bg-[var(--card-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--brown)] hover:bg-[var(--sand)]"
          >
            <IconX className="h-3.5 w-3.5" />
            Cancel
          </button>
        </div>
      </div>
    );
  }

  const isSourceUrl = field === "source_url";
  return (
    <div className="flex min-w-0 flex-col gap-1">
      {isSourceUrl && value ? (
        <a
          href={value}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex w-fit items-center gap-1.5 rounded-lg border-2 border-[var(--sand)] bg-[var(--card-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--brown)] shadow-sm transition hover:border-[var(--brown)] hover:bg-[var(--sand)] hover:text-[var(--ink)]"
          title="Open source link"
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="h-3.5 w-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
          </svg>
          Open
        </a>
      ) : (
        <span className={value ? "truncate text-[var(--ink)]" : "text-[var(--tan)]"} title={value || undefined}>
          {value || "—"}
        </span>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="inline-flex w-fit items-center gap-1.5 text-xs font-medium text-[var(--brown)] hover:text-[var(--ink)] hover:underline"
      >
        <IconPencil className="h-3.5 w-3.5" />
        {value ? "Edit" : emptyLabel}
      </button>
    </div>
  );
}

function StatusCheckbox({
  checked,
  label,
  contactId,
  field,
  onRefresh,
}: {
  checked: boolean;
  label: string;
  contactId: number;
  field: "validated" | "contacted" | "responded";
  onRefresh: () => void;
}) {
  const [updating, setUpdating] = useState(false);
  const handleChange = async () => {
    setUpdating(true);
    try {
      await patchContact(contactId, { [field]: !checked });
      onRefresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUpdating(false);
    }
  };
  return (
    <label className="flex cursor-pointer items-center justify-center" title={label}>
      <input
        type="checkbox"
        checked={checked}
        onChange={handleChange}
        disabled={updating}
        className="h-4 w-4 rounded border-[var(--tan)] text-[var(--brown)] focus:ring-[var(--brown)] disabled:opacity-50"
        aria-label={label}
      />
    </label>
  );
}

export default function ContactsTable({
  contacts,
  onRefresh,
}: {
  contacts: Contact[];
  onRefresh: () => void;
}) {
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [deletingBulk, setDeletingBulk] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [altEmailEditing, setAltEmailEditing] = useState(false);
  const [altEmailInput, setAltEmailInput] = useState("");
  const [altEmailSaving, setAltEmailSaving] = useState(false);
  const [openActionId, setOpenActionId] = useState<number | null>(null);
  const [emailTemplateContactId, setEmailTemplateContactId] = useState<number | null>(null);
  const actionMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionMenuRef.current && !actionMenuRef.current.contains(e.target as Node)) {
        setOpenActionId(null);
        setEmailTemplateContactId(null);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (viewingContact) {
      setAltEmailEditing(false);
      setAltEmailInput(viewingContact.alternative_email ?? "");
    }
  }, [viewingContact?.id]);

  const visibleIds = contacts.map((c) => c.id);
  const selectedVisible = visibleIds.filter((id) => selectedIds.has(id));
  const allVisibleSelected = visibleIds.length > 0 && selectedVisible.length === visibleIds.length;
  const someVisibleSelected = selectedVisible.length > 0;

  const toggleRow = (id: number) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (allVisibleSelected) {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.delete(id));
        return next;
      });
    } else {
      setSelectedIds((prev) => {
        const next = new Set(prev);
        visibleIds.forEach((id) => next.add(id));
        return next;
      });
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  const handleDeleteSelected = async () => {
    const count = selectedIds.size;
    if (count === 0) return;
    if (!confirm(`Delete ${count} contact${count === 1 ? "" : "s"}? This cannot be undone.`)) return;
    setDeletingBulk(true);
    const ids = Array.from(selectedIds);
    try {
      await Promise.all(ids.map((id) => deleteContact(id)));
      clearSelection();
      onRefresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeletingBulk(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this contact?")) return;
    setDeletingId(id);
    try {
      await deleteContact(id);
      onRefresh();
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (s: string | null) => {
    if (!s) return "—";
    const d = new Date(s);
    return d.toLocaleString(undefined, { day: "numeric", month: "short", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="overflow-hidden rounded-2xl border-2 border-[var(--sand)] bg-[var(--card-bg)] shadow-[0_2px_8px_-2px_rgba(44,31,20,0.08)]">
      {selectedIds.size > 0 && (
        <div className="flex items-center gap-4 border-b border-[var(--sand)] bg-[var(--accent)]/15 px-6 py-2.5 text-sm">
          <span className="font-medium text-[var(--ink)]">{selectedIds.size} selected</span>
          <button
            type="button"
            onClick={handleDeleteSelected}
            disabled={deletingBulk}
            className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-medium text-red-700 hover:bg-red-100 disabled:opacity-50"
          >
            <IconTrash className="h-4 w-4" />
            {deletingBulk ? "Deleting…" : "Delete selected"}
          </button>
          <button
            type="button"
            onClick={clearSelection}
            className="inline-flex items-center gap-1.5 text-[var(--brown)] hover:text-[var(--ink)] hover:underline"
          >
            <IconX className="h-4 w-4" />
            Clear selection
          </button>
        </div>
      )}
      <div className="min-w-0 overflow-auto max-h-[calc(100vh-18rem)]">
        <table className="w-full table-fixed border-collapse text-sm">
          <colgroup>
            <col className="w-[3%]" />
            <col className="w-[11%]" />
            <col className="w-[15%]" />
            <col className="w-[16%]" />
            <col className="w-[14%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[7%]" />
            <col className="w-[6%]" />
          </colgroup>
          <thead className="sticky top-0 z-10 bg-[var(--card-bg)]/98 shadow-[0_1px_0_0_var(--sand)] backdrop-blur-sm">
            <tr className="border-b-2 border-[var(--sand)] bg-[var(--card-bg)]">
              <th className="px-5 py-4 text-center">
                <label className="flex cursor-pointer items-center justify-center">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    ref={(el) => {
                      if (el) el.indeterminate = someVisibleSelected && !allVisibleSelected;
                    }}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-[var(--tan)] text-[var(--brown)] focus:ring-[var(--brown)]"
                    title="Select all"
                  />
                </label>
              </th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Name</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Email</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Job title</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Company</th>
              <th className="px-5 py-4 text-left text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Source</th>
              <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--brown)]" title="Validated">V</th>
              <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--brown)]" title="Contacted">C</th>
              <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--brown)]" title="Responded">R</th>
              <th className="px-5 py-4 text-center text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y-2 divide-[var(--sand)]">
            {contacts.map((c) => (
              <tr
                key={c.id}
                className={`transition hover:bg-[var(--sand)]/30 ${selectedIds.has(c.id) ? "bg-[var(--accent)]/20" : c.unemployed ? "bg-[var(--sand)]/60" : ""}`}
              >
                <td className="px-5 py-4 align-top">
                  <label className="flex cursor-pointer items-center justify-center">
                    <input
                      type="checkbox"
                      checked={selectedIds.has(c.id)}
                      onChange={() => toggleRow(c.id)}
                      className="h-4 w-4 rounded border-[var(--tan)] text-[var(--brown)] focus:ring-[var(--brown)]"
                      title="Select"
                    />
                  </label>
                </td>
                <td className="min-w-0 px-5 py-4 align-top">
                  <EditableCell
                    value={c.name || ""}
                    field="name"
                    contactId={c.id}
                    placeholder="Full name"
                    emptyLabel="Add name"
                    onSaved={onRefresh}
                  />
                </td>
                <td className="min-w-0 px-5 py-4 align-top">
                  <div className="flex min-w-0 items-start gap-1.5">
                    <div className="min-w-0 flex-1">
                      <EditableCell
                        value={c.email || ""}
                        field="email"
                        contactId={c.id}
                        placeholder="email@example.com"
                        emptyLabel="Add email"
                        inputType="email"
                        onSaved={onRefresh}
                      />
                    </div>
                    {c.alternative_email && (
                      <span
                        className="mt-0.5 shrink-0 rounded bg-[var(--brown)]/15 p-1 text-[var(--brown)]"
                        title="Has alternative email"
                        aria-label="Has alternative email"
                      >
                        <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden>
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </span>
                    )}
                  </div>
                </td>
                <td className="min-w-0 px-5 py-4 align-top">
                  <EditableCell
                    value={c.job_title || ""}
                    field="job_title"
                    contactId={c.id}
                    placeholder="Job title"
                    emptyLabel="Add title"
                    onSaved={onRefresh}
                  />
                </td>
                <td className="min-w-0 px-5 py-4 align-top">
                  <EditableCell
                    value={c.company || ""}
                    field="company"
                    contactId={c.id}
                    placeholder="Company name"
                    emptyLabel="Add company"
                    onSaved={onRefresh}
                  />
                </td>
                <td className="min-w-0 px-5 py-4 align-top">
                  <EditableCell
                    value={c.source_url || ""}
                    field="source_url"
                    contactId={c.id}
                    placeholder="https://..."
                    emptyLabel="Add source"
                    inputType="url"
                    onSaved={onRefresh}
                  />
                </td>
                <td className="px-5 py-4 align-top text-center">
                  <StatusCheckbox
                    checked={!!c.validated}
                    label="Validated"
                    contactId={c.id}
                    field="validated"
                    onRefresh={onRefresh}
                  />
                </td>
                <td className="px-5 py-4 align-top text-center">
                  <StatusCheckbox
                    checked={!!c.contacted}
                    label="Contacted"
                    contactId={c.id}
                    field="contacted"
                    onRefresh={onRefresh}
                  />
                </td>
                <td className="px-5 py-4 align-top text-center">
                  <StatusCheckbox
                    checked={!!c.responded}
                    label="Responded"
                    contactId={c.id}
                    field="responded"
                    onRefresh={onRefresh}
                  />
                </td>
                <td className="relative px-5 py-4 align-top text-center">
                  <div className="relative" ref={openActionId === c.id ? actionMenuRef : undefined}>
                  <button
                    type="button"
                    onClick={() => setOpenActionId(openActionId === c.id ? null : c.id)}
                    className="flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--sand)] bg-[var(--card-bg)] text-[var(--brown)] hover:bg-[var(--sand)]"
                    aria-expanded={openActionId === c.id}
                    aria-haspopup="true"
                    title="Actions"
                  >
                    <IconDotsVertical />
                  </button>
                  {openActionId === c.id && (
                    <div className={`absolute right-4 top-full z-20 mt-1 rounded-lg border border-[var(--sand)] bg-[var(--card-bg)] py-1 shadow-lg ${emailTemplateContactId === c.id ? "min-w-[200px] max-w-[280px]" : "min-w-[120px]"}`}>
                      {emailTemplateContactId === c.id ? (
                        <>
                          <button
                            type="button"
                            onClick={() => setEmailTemplateContactId(null)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[var(--brown)] hover:bg-[var(--sand)]"
                          >
                            ← Back
                          </button>
                          <div className="my-1 border-t border-[var(--sand)] px-2 py-1 text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">
                            Choose template
                          </div>
                          {EMAIL_TEMPLATES.map((tpl) => (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => {
                                const recipient = (c.email || c.alternative_email || "").trim();
                                if (!recipient || !recipient.includes("@")) {
                                  alert("This contact has no email address.");
                                  setOpenActionId(null);
                                  setEmailTemplateContactId(null);
                                  return;
                                }
                                const firstName = (c.name || "").trim().split(/\s+/)[0] || "there";
                                const companyName = (c.company || "").trim() || "your organisation";
                                const { subject, body } = fillEmailTemplate(tpl, firstName, companyName);
                                const mailto = buildMailtoUrl(recipient, subject, body);
                                window.location.href = mailto;
                                setOpenActionId(null);
                                setEmailTemplateContactId(null);
                              }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--sand)]"
                            >
                              <IconMail className="h-3.5 w-3.5 shrink-0" />
                              <span className="truncate">{tpl.label}</span>
                            </button>
                          ))}
                          <div className="mt-1 border-t border-[var(--sand)] px-2 py-1.5">
                            <p className="text-[10px] text-[var(--tan)]">Opens your default mail app.</p>
                            <a
                              href="https://www.zoho.com/mail/how-to/set-default-email-client.html"
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-[10px] text-[var(--brown)] underline hover:text-[var(--ink)]"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Use Zoho Mail?
                            </a>
                          </div>
                        </>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => { setViewingContact(c); setOpenActionId(null); }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--sand)]"
                          >
                            <IconEye className="h-4 w-4 shrink-0" />
                            View
                          </button>
                          <button
                            type="button"
                            onClick={() => setEmailTemplateContactId(c.id)}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--sand)]"
                          >
                            <IconMail className="h-4 w-4 shrink-0" />
                            Send email
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              try {
                                await patchContact(c.id, { unemployed: true });
                                onRefresh();
                              } catch (e) {
                                alert((e as Error).message);
                              }
                              setOpenActionId(null);
                            }}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-[var(--ink)] hover:bg-[var(--sand)]"
                          >
                            <IconBriefcase className="h-4 w-4 shrink-0" />
                            Mark as unemployed
                          </button>
                          <button
                            type="button"
                            onClick={() => { handleDelete(c.id); setOpenActionId(null); }}
                            disabled={deletingId === c.id}
                            className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                          >
                            <IconTrash className="h-4 w-4 shrink-0" />
                            {deletingId === c.id ? "Deleting…" : "Delete"}
                          </button>
                        </>
                      )}
                    </div>
                  )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Full record card modal */}
      {viewingContact && (
        <div
          className="fixed inset-0 z-30 flex items-center justify-center bg-[var(--ink)]/40 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="view-contact-title"
          onClick={() => setViewingContact(null)}
        >
          <div
            className="flex w-full max-w-md max-h-[90vh] flex-col overflow-hidden rounded-2xl border-2 border-[var(--sand)] bg-[var(--card-bg)] shadow-[0_24px_48px_-12px_rgba(44,31,20,0.25)]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b-2 border-[var(--sand)] bg-[var(--accent)]/30 px-5 py-4">
              <h2 id="view-contact-title" className="font-display text-lg font-semibold text-[var(--ink)]">
                Contact details
              </h2>
              <button
                type="button"
                onClick={() => setViewingContact(null)}
                className="rounded-lg p-1.5 text-[var(--brown)] hover:bg-[var(--sand)] hover:text-[var(--ink)]"
                aria-label="Close"
              >
                <IconX className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-y-auto px-5 py-5 space-y-5">
              <DetailRow label="Name" value={viewingContact.name} />
              <DetailRow label="Email" value={viewingContact.email} />
              <div>
                <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Alternative email</span>
                {altEmailEditing ? (
                  <div className="flex flex-col gap-2">
                    <input
                      type="email"
                      value={altEmailInput}
                      onChange={(e) => setAltEmailInput(e.target.value)}
                      placeholder="alternative@example.com"
                      className="rounded-lg border border-[var(--sand)] px-2.5 py-1.5 text-sm focus:border-[var(--brown)] focus:ring-1 focus:ring-[var(--brown)]"
                      autoFocus
                    />
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={async () => {
                          setAltEmailSaving(true);
                          try {
                            await patchContact(viewingContact.id, { alternative_email: altEmailInput });
                            onRefresh();
                            setViewingContact((prev) => prev ? { ...prev, alternative_email: altEmailInput || null } : null);
                            setAltEmailEditing(false);
                          } catch (e) {
                            alert((e as Error).message);
                          } finally {
                            setAltEmailSaving(false);
                          }
                        }}
                        disabled={altEmailSaving}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--brown)] px-2.5 py-1.5 text-xs font-medium text-white hover:bg-[var(--ink)] disabled:opacity-50"
                      >
                        <IconCheck className="h-3.5 w-3.5" />
                        {altEmailSaving ? "…" : "Save"}
                      </button>
                      <button
                        type="button"
                        onClick={() => { setAltEmailEditing(false); setAltEmailInput(viewingContact.alternative_email ?? ""); }}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--sand)] bg-[var(--card-bg)] px-2.5 py-1.5 text-xs font-medium text-[var(--brown)] hover:bg-[var(--sand)]"
                      >
                        <IconX className="h-3.5 w-3.5" />
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <p className="break-words text-[var(--ink)]">{viewingContact.alternative_email || "—"}</p>
                    <button
                      type="button"
                      onClick={() => setAltEmailEditing(true)}
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-[var(--brown)] hover:text-[var(--ink)] hover:underline"
                    >
                      <IconPencil className="h-3.5 w-3.5" />
                      {viewingContact.alternative_email ? "Edit" : "Add"}
                    </button>
                  </div>
                )}
              </div>
              <DetailRow label="Job title" value={viewingContact.job_title} />
              <DetailRow label="Company" value={viewingContact.company} />
              {viewingContact.company_domain && (
                <DetailRow label="Company domain" value={viewingContact.company_domain} />
              )}
              {viewingContact.source_url ? (
                <div>
                  <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Source</span>
                  <a
                    href={viewingContact.source_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="break-all text-[var(--brown)] underline hover:text-[var(--ink)]"
                  >
                    {viewingContact.source_url}
                  </a>
                </div>
              ) : (
                <DetailRow label="Source" value={null} />
              )}
              <DetailRow label="Added" value={formatDate(viewingContact.created_at)} />
              <div className="flex flex-wrap gap-4 border-t border-[var(--sand)] pt-4">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">Status</span>
                <div className="flex gap-6">
                  <span className="text-[var(--ink)]">Validated: {viewingContact.validated ? "Yes" : "No"}</span>
                  <span className="text-[var(--ink)]">Contacted: {viewingContact.contacted ? "Yes" : "No"}</span>
                  <span className="text-[var(--ink)]">Responded: {viewingContact.responded ? "Yes" : "No"}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  const display = value ?? "—";
  return (
    <div>
      <span className="mb-1 block text-xs font-semibold uppercase tracking-wider text-[var(--brown)]">{label}</span>
      <p className="break-words text-[var(--ink)]">{display}</p>
    </div>
  );
}
