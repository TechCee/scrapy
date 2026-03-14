"""
SQLite schema and access for contacts and runs.
"""
import re
import sqlite3
import uuid
from pathlib import Path

# DB path: data/contacts.db at repo root
APP_ROOT = Path(__file__).resolve().parent.parent
DATA_DIR = APP_ROOT / "data"
DB_PATH = DATA_DIR / "contacts.db"


def get_db_path() -> Path:
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    return DB_PATH


def _normalize_company(s):
    """Normalize company for dedup: strip, lowercase, remove common suffixes."""
    if not s:
        return ""
    s = (s or "").strip().lower()
    s = re.sub(r"\s+", " ", s)
    for suffix in [" inc.", " inc", ".com", " ltd.", " ltd", " llc", " corp.", " corp"]:
        if s.endswith(suffix):
            s = s[: -len(suffix)].strip()
    return s.strip()


def init_db() -> None:
    path = get_db_path()
    conn = sqlite3.connect(path)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS contacts (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT,
            job_title TEXT,
            company TEXT,
            company_domain TEXT,
            source_url TEXT,
            run_id TEXT,
            created_at TEXT DEFAULT (datetime('now'))
        )
    """)
    conn.execute("""
        CREATE TABLE IF NOT EXISTS runs (
            id TEXT PRIMARY KEY,
            started_at TEXT DEFAULT (datetime('now')),
            job_titles TEXT,
            saved_count INTEGER DEFAULT 0,
            with_email_count INTEGER DEFAULT 0
        )
    """)
    for col in ("run_id TEXT", "validated INTEGER DEFAULT 0", "contacted INTEGER DEFAULT 0", "responded INTEGER DEFAULT 0", "unemployed INTEGER DEFAULT 0", "alternative_email TEXT"):
        try:
            conn.execute("ALTER TABLE contacts ADD COLUMN " + col.split()[0] + " " + " ".join(col.split()[1:]))
        except sqlite3.OperationalError:
            pass
    conn.execute("CREATE INDEX IF NOT EXISTS idx_contacts_name_company ON contacts(name, company)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email)")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_contacts_run_id ON contacts(run_id)")
    conn.commit()
    conn.close()


def create_run(job_titles) -> str:
    """Create a run record; return run_id."""
    path = get_db_path()
    run_id = str(uuid.uuid4())
    titles_text = "\n".join(job_titles) if isinstance(job_titles, (list, tuple)) else str(job_titles)
    conn = sqlite3.connect(path)
    conn.execute(
        "INSERT INTO runs (id, job_titles) VALUES (?, ?)",
        (run_id, titles_text),
    )
    conn.commit()
    conn.close()
    return run_id


def update_run_counts(run_id: str, saved: int, with_email: int) -> None:
    path = get_db_path()
    conn = sqlite3.connect(path)
    conn.execute(
        "UPDATE runs SET saved_count = ?, with_email_count = ? WHERE id = ?",
        (saved, with_email, run_id),
    )
    conn.commit()
    conn.close()


def list_runs(limit: int = 50):
    """Return recent runs with id, started_at, job_titles, saved_count, with_email_count. Counts are computed from contacts so they stay correct after deletes."""
    path = get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    cur = conn.execute(
        """
        SELECT r.id, r.started_at, r.job_titles,
            (SELECT COUNT(*) FROM contacts c WHERE c.run_id = r.id) AS saved_count,
            (SELECT COUNT(*) FROM contacts c WHERE c.run_id = r.id AND c.email IS NOT NULL AND TRIM(c.email) != '') AS with_email_count
        FROM runs r
        ORDER BY r.started_at DESC
        LIMIT ?
        """,
        (limit,),
    )
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def upsert_contact(
    name: str,
    job_title: str,
    company: str,
    company_domain: str = "",
    source_url: str = "",
    email: str = None,
    run_id: str = None,
) -> None:
    """Insert or update: dedup by email first, then by normalized (name, company)."""
    path = get_db_path()
    conn = sqlite3.connect(path)
    name_trim = (name or "").strip()
    company_trim = (company or "").strip()
    company_norm = _normalize_company(company_trim)
    email_trim = (email or "").strip() if email else ""

    # 1) If we have an email, try to find existing by email (update that row)
    if email_trim and "@" in email_trim:
        cur = conn.execute(
            "SELECT id FROM contacts WHERE email IS NOT NULL AND TRIM(email) != '' AND LOWER(TRIM(email)) = LOWER(?)",
            (email_trim,),
        )
        row = cur.fetchone()
        if row:
            conn.execute(
                "UPDATE contacts SET email = ?, company_domain = COALESCE(?, company_domain), source_url = COALESCE(?, source_url), job_title = ?, name = ?, company = ?, run_id = ? WHERE id = ?",
                (email_trim, company_domain or "", source_url or "", job_title, name_trim, company_trim, run_id, row[0]),
            )
            conn.commit()
            conn.close()
            return

    # 2) Find by normalized (name, company): match name in SQL, then company norm in Python
    cur = conn.execute(
        "SELECT id, company FROM contacts WHERE LOWER(TRIM(name)) = LOWER(?)",
        (name_trim,),
    )
    rows = cur.fetchall()
    existing_id = None
    for r in rows:
        if _normalize_company(r[1]) == company_norm:
            existing_id = r[0]
            break

    if existing_id:
        conn.execute(
            "UPDATE contacts SET email = COALESCE(?, email), company_domain = COALESCE(?, company_domain), source_url = COALESCE(?, source_url), job_title = ?, run_id = ? WHERE id = ?",
            (email_trim or "", company_domain or "", source_url or "", job_title, run_id, existing_id),
        )
    else:
        conn.execute(
            "INSERT INTO contacts (name, email, job_title, company, company_domain, source_url, run_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
            (name_trim, email_trim or "", job_title, company_trim, company_domain or "", source_url or "", run_id),
        )
    conn.commit()
    conn.close()


def insert_contact(
    name: str,
    email: str = None,
    job_title: str = None,
    company: str = None,
    run_id: str = None,
    validated: bool = False,
    source_url: str = None,
) -> int:
    """Insert a new contact. Returns the new contact id."""
    path = get_db_path()
    conn = sqlite3.connect(path)
    name_trim = (name or "").strip()
    if not name_trim:
        conn.close()
        raise ValueError("name is required")
    email_trim = (email or "").strip() if email else ""
    job_trim = (job_title or "").strip() if job_title else ""
    company_trim = (company or "").strip() if company else ""
    source_trim = (source_url or "").strip() if source_url else ""
    val = 1 if validated else 0
    conn.execute(
        """INSERT INTO contacts (name, email, job_title, company, company_domain, source_url, run_id, validated, contacted, responded)
           VALUES (?, ?, ?, ?, '', ?, ?, ?, 0, 0)""",
        (name_trim, email_trim, job_trim, company_trim, source_trim, run_id or "", val),
    )
    cur = conn.execute("SELECT last_insert_rowid()")
    new_id = cur.fetchone()[0]
    conn.commit()
    conn.close()
    return new_id


def get_contact(contact_id: int):
    """Return a single contact by id, or None."""
    path = get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    cur = conn.execute(
        "SELECT id, name, email, job_title, company, company_domain, source_url, run_id, created_at, validated, contacted, responded, unemployed, alternative_email FROM contacts WHERE id = ?",
        (contact_id,),
    )
    row = cur.fetchone()
    conn.close()
    return dict(row) if row else None


def find_contact_id_by_company_and_name(company: str, name: str):
    """Return contact id if a contact exists with the given company and name (normalized); else None."""
    if not (company or "").strip() or not (name or "").strip():
        return None
    path = get_db_path()
    conn = sqlite3.connect(path)
    name_trim = (name or "").strip()
    company_norm = _normalize_company((company or "").strip())
    cur = conn.execute(
        "SELECT id, company FROM contacts WHERE LOWER(TRIM(name)) = LOWER(?)",
        (name_trim,),
    )
    rows = cur.fetchall()
    conn.close()
    for r in rows:
        if _normalize_company(r[1] or "") == company_norm:
            return r[0]
    return None


def get_contacts_by_ids(ids):
    """Return list of contact dicts for the given ids (same shape as list_contacts rows). Order by id."""
    if not ids:
        return []
    path = get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    placeholders = ",".join("?" * len(ids))
    cur = conn.execute(
        "SELECT id, name, email, job_title, company, company_domain, source_url, run_id, created_at, validated, contacted, responded, unemployed, alternative_email FROM contacts WHERE id IN ({}) ORDER BY id".format(placeholders),
        tuple(ids),
    )
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def list_contacts(
    job_title_filter=None,
    company_filter=None,
    has_email_only=False,
    no_email_only=False,
    run_id=None,
    name_filter=None,
    validated=None,
    contacted=None,
    responded=None,
    unemployed_filter=None,
    has_source_only=False,
    no_source_only=False,
    limit=500,
):
    """Return contacts with optional filters including run_id and per-column filters."""
    path = get_db_path()
    conn = sqlite3.connect(path)
    conn.row_factory = sqlite3.Row
    q = "SELECT id, name, email, job_title, company, company_domain, source_url, run_id, created_at, validated, contacted, responded, unemployed, alternative_email FROM contacts WHERE 1=1"
    params = []
    if name_filter:
        q += " AND LOWER(name) LIKE LOWER(?)"
        params.append("%{}%".format(name_filter))
    if job_title_filter:
        q += " AND LOWER(job_title) LIKE LOWER(?)"
        params.append("%{}%".format(job_title_filter))
    if company_filter:
        q += " AND LOWER(company) LIKE LOWER(?)"
        params.append("%{}%".format(company_filter))
    if has_email_only:
        q += " AND email IS NOT NULL AND TRIM(email) != ''"
    if no_email_only:
        q += " AND (email IS NULL OR TRIM(COALESCE(email, '')) = '')"
    if run_id:
        q += " AND run_id = ?"
        params.append(run_id)
    if validated is True:
        q += " AND validated = 1"
    elif validated is False:
        q += " AND (validated = 0 OR validated IS NULL)"
    if contacted is True:
        q += " AND contacted = 1"
    elif contacted is False:
        q += " AND (contacted = 0 OR contacted IS NULL)"
    if responded is True:
        q += " AND responded = 1"
    elif responded is False:
        q += " AND (responded = 0 OR responded IS NULL)"
    if unemployed_filter is True:
        q += " AND unemployed = 1"
    elif unemployed_filter is False:
        q += " AND (unemployed = 0 OR unemployed IS NULL)"
    if has_source_only:
        q += " AND source_url IS NOT NULL AND TRIM(source_url) != ''"
    if no_source_only:
        q += " AND (source_url IS NULL OR TRIM(COALESCE(source_url, '')) = '')"
    q += " ORDER BY created_at DESC LIMIT ?"
    params.append(limit)
    cur = conn.execute(q, params)
    rows = cur.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def update_contact(contact_id: int, name=None, email=None, job_title=None, company=None, validated=None, contacted=None, responded=None, unemployed=None, alternative_email=None, source_url=None) -> bool:
    """Update a contact by id. Only non-None fields are updated."""
    path = get_db_path()
    conn = sqlite3.connect(path)
    updates = []
    params = []
    if name is not None:
        updates.append("name = ?")
        params.append((name or "").strip())
    if email is not None:
        updates.append("email = ?")
        params.append(email if email else "")
    if alternative_email is not None:
        updates.append("alternative_email = ?")
        params.append((alternative_email or "").strip())
    if source_url is not None:
        updates.append("source_url = ?")
        params.append((source_url or "").strip())
    if job_title is not None:
        updates.append("job_title = ?")
        params.append(job_title if job_title else "")
    if company is not None:
        updates.append("company = ?")
        params.append(company if company else "")
    if validated is not None:
        updates.append("validated = ?")
        params.append(1 if validated else 0)
    if contacted is not None:
        updates.append("contacted = ?")
        params.append(1 if contacted else 0)
    if responded is not None:
        updates.append("responded = ?")
        params.append(1 if responded else 0)
    if unemployed is not None:
        updates.append("unemployed = ?")
        params.append(1 if unemployed else 0)
    if not updates:
        conn.close()
        return False
    params.append(contact_id)
    cur = conn.execute("UPDATE contacts SET " + ", ".join(updates) + " WHERE id = ?", params)
    updated = cur.rowcount > 0
    conn.commit()
    conn.close()
    return updated


def _contacts_where_clause(
    job_title_filter,
    company_filter,
    has_email_only,
    no_email_only,
    run_id,
    name_filter=None,
    validated=None,
    contacted=None,
    responded=None,
    unemployed_filter=None,
    has_source_only=False,
    no_source_only=False,
):
    """Build WHERE clause and params for list_contacts-style filtering (no ORDER BY/LIMIT)."""
    q = " WHERE 1=1"
    params = []
    if name_filter:
        q += " AND LOWER(name) LIKE LOWER(?)"
        params.append("%{}%".format(name_filter))
    if job_title_filter:
        q += " AND LOWER(job_title) LIKE LOWER(?)"
        params.append("%{}%".format(job_title_filter))
    if company_filter:
        q += " AND LOWER(company) LIKE LOWER(?)"
        params.append("%{}%".format(company_filter))
    if has_email_only:
        q += " AND email IS NOT NULL AND TRIM(email) != ''"
    if no_email_only:
        q += " AND (email IS NULL OR TRIM(COALESCE(email, '')) = '')"
    if run_id:
        q += " AND run_id = ?"
        params.append(run_id)
    if validated is True:
        q += " AND validated = 1"
    elif validated is False:
        q += " AND (validated = 0 OR validated IS NULL)"
    if contacted is True:
        q += " AND contacted = 1"
    elif contacted is False:
        q += " AND (contacted = 0 OR contacted IS NULL)"
    if responded is True:
        q += " AND responded = 1"
    elif responded is False:
        q += " AND (responded = 0 OR responded IS NULL)"
    if unemployed_filter is True:
        q += " AND unemployed = 1"
    elif unemployed_filter is False:
        q += " AND (unemployed = 0 OR unemployed IS NULL)"
    if has_source_only:
        q += " AND source_url IS NOT NULL AND TRIM(source_url) != ''"
    if no_source_only:
        q += " AND (source_url IS NULL OR TRIM(COALESCE(source_url, '')) = '')"
    return q, params


def contact_stats(
    job_title_filter=None,
    company_filter=None,
    has_email_only=False,
    no_email_only=False,
    run_id=None,
    name_filter=None,
    validated=None,
    contacted=None,
    responded=None,
    unemployed_filter=None,
    has_source_only=False,
    no_source_only=False,
):
    """Return aggregate stats for contacts matching the same filters as list_contacts."""
    path = get_db_path()
    conn = sqlite3.connect(path)
    where_sql, params = _contacts_where_clause(
        job_title_filter,
        company_filter,
        has_email_only,
        no_email_only,
        run_id,
        name_filter=name_filter,
        validated=validated,
        contacted=contacted,
        responded=responded,
        unemployed_filter=unemployed_filter,
        has_source_only=has_source_only,
        no_source_only=no_source_only,
    )
    cur = conn.execute(
        "SELECT "
        "COUNT(*) AS contacts_count, "
        "SUM(CASE WHEN unemployed = 1 THEN 1 ELSE 0 END) AS unemployed_count, "
        "SUM(CASE WHEN contacted = 1 THEN 1 ELSE 0 END) AS contacted_count, "
        "SUM(CASE WHEN validated = 1 THEN 1 ELSE 0 END) AS validated_count, "
        "SUM(CASE WHEN responded = 1 THEN 1 ELSE 0 END) AS responded_count "
        "FROM contacts" + where_sql,
        params,
    )
    row = cur.fetchone()
    cur2 = conn.execute(
        "SELECT COUNT(DISTINCT company) FROM contacts" + where_sql + " AND company IS NOT NULL AND TRIM(company) != ''",
        params,
    )
    unique_row = cur2.fetchone()
    conn.close()
    return {
        "contacts_count": row[0] or 0,
        "unemployed_count": row[1] or 0,
        "contacted_count": row[2] or 0,
        "validated_count": row[3] or 0,
        "responded_count": row[4] or 0,
        "unique_companies_count": unique_row[0] or 0,
    }


def delete_contact(contact_id: int) -> bool:
    """Delete a contact by id. Returns True if a row was deleted."""
    path = get_db_path()
    conn = sqlite3.connect(path)
    cur = conn.execute("DELETE FROM contacts WHERE id = ?", (contact_id,))
    deleted = cur.rowcount > 0
    conn.commit()
    conn.close()
    return deleted
