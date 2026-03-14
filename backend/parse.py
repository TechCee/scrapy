"""
Extract name and company from search result title/snippet.
Best-effort heuristics; some results will be noisy.
"""
import re
from dataclasses import dataclass


@dataclass
class ParsedContact:
    name: str
    company: str
    job_title: str
    source_url: str


# Patterns: "Name - Title at Company", "Name, Title at Company", "Name | Company", "Title - Name at Company"
AT_COMPANY = re.compile(r"\s+at\s+([^|,\-–—]+?)(?:\s*[|,\-–—]|\s*$|\.)", re.I)
DASH_TITLE = re.compile(r"^([^\-–—]+?)\s*[\-–—]\s*(.+)$", re.S)
PIPE_SPLIT = re.compile(r"\s*\|\s*")
COMMA_TITLE_AT = re.compile(r"^([^,]+),\s*[^,]+\s+at\s+([^|]+)", re.I)


def _clean(s: str) -> str:
    return (s or "").strip().strip(".,;:")


# Phrases that indicate the "name" is actually a job title, not a person
JOB_TITLE_PHRASES = (
    "head of", "director of", "vp ", "vice president", "chief ", "senior ",
    "manager", "engineer", "officer", "lead ", "principal ", "hr ", "cto", "cpo",
    "people", "learning", "culture", "experience", "talent", "recruiting",
    "human resources", "employee experience",
)


def _name_looks_like_job_title(name: str) -> bool:
    """True if the extracted name is probably a job title, not a person (e.g. 'Head of HR')."""
    if not name or len(name) < 3:
        return True
    n = name.lower()
    return any(phrase in n for phrase in JOB_TITLE_PHRASES)


def parse_result(title, snippet, url, job_title):
    """
    Try to extract a person name and company from a search result.
    Returns None if we can't get at least a plausible name.
    """
    combined = f"{_clean(title)} {_clean(snippet)}"
    if not combined:
        return None

    name = ""
    company = ""

    # "Name - Title at Company" or "Name — Title at Company"
    m = DASH_TITLE.match(combined)
    if m:
        left, right = _clean(m.group(1)), _clean(m.group(2))
        at = AT_COMPANY.search(right)
        if at:
            company = _clean(at.group(1))
        # Left part is often "Name" (2-4 words) or "Name | Company"
        parts = PIPE_SPLIT.split(left, 1)
        if len(parts) >= 2:
            name, company_cand = _clean(parts[0]), _clean(parts[1])
            if not company and company_cand and len(company_cand) < 80:
                company = company_cand
        elif left and 3 <= len(left.split()) <= 5 and not name:
            name = left

    # "Name, Title at Company"
    if not name or not company:
        m = COMMA_TITLE_AT.match(combined)
        if m:
            if not name:
                name = _clean(m.group(1))
            if not company:
                company = _clean(m.group(2))

    # Fallback: look for " at Company" anywhere
    if not company:
        at = AT_COMPANY.search(combined)
        if at:
            company = _clean(at.group(1))

    # Name: take first segment that looks like a name (2–4 words, no long runs)
    if not name:
        first_part = combined.split("|")[0].split("-")[0].split("—")[0].split(",")[0]
        first_part = _clean(first_part)
        words = first_part.split()
        if 2 <= len(words) <= 5 and all(len(w) < 25 for w in words):
            name = first_part

    # Reject if no name or name is just the job title
    if not name or name.lower() == job_title.lower():
        return None
    if len(name) < 4 or len(name) > 120:
        return None
    # Reject when extracted "name" looks like a job title (we want real names like Arianne Balducci)
    if _name_looks_like_job_title(name):
        return None

    return ParsedContact(
        name=name,
        company=company or "",
        job_title=job_title,
        source_url=url or "",
    )


def parse_results(results, job_title):
    """Parse a list of search results; return deduplicated ParsedContacts."""
    seen = set()
    out = []
    for r in results:
        parsed = parse_result(
            r.get("title") or "",
            r.get("snippet") or "",
            r.get("url") or "",
            job_title,
        )
        if not parsed:
            continue
        key = (parsed.name.lower(), (parsed.company or "").lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(parsed)
    return out
