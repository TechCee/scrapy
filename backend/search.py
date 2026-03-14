"""
DuckDuckGo search by job title. Returns list of {title, snippet, url}.
Targets real people (profiles, team pages); job ads and job boards are excluded.
"""
from ddgs import DDGS

# Domains/path patterns that indicate job boards or job ads (skip these)
JOB_BOARD_DOMAINS = (
    "indeed.com",
    "linkedin.com/jobs",
    "glassdoor.com",
    "monster.com",
    "careerbuilder.com",
    "ziprecruiter.com",
    "flexjobs.com",
    "joblistings",
    "greenhouse.io",
    "lever.co",
    "workable.com",
    "jobs.lever",
    "boards.greenhouse",
    "jobvite",
    "smartrecruiters",
    "taleo",
    "icims.com",
    "myworkdayjobs",
    "applytojob",
    "linkedin.com/jobs/",
)
JOB_BOARD_KEYWORDS = (
    "apply now",
    "submit your application",
    "apply for this job",
    "view job",
    " - job - ",
    "we're hiring",
    "hiring now",
    "open position",
    "join our team",
    "full-time",
    "part-time",
    "job description",
    "job requirements",
    "applicants",
    "posted on",
    "expires",
    "salary range",
    "submit resume",
)

# URL patterns that strongly indicate a person profile (prefer these)
PERSON_PROFILE_URL_PATTERNS = (
    "linkedin.com/in/",
    "/in/",
    "about.us/",
    "/team/",
    "/people/",
    "/about/",
    "crunchbase.com/person/",
    "twitter.com/",
    "x.com/",
)


def _is_job_board(url: str, title: str, snippet: str) -> bool:
    """True if this result looks like a job board / job posting."""
    u = (url or "").lower()
    t = (title or "").lower()
    s = (snippet or "").lower()
    combined = " ".join([u, t, s])
    for domain in JOB_BOARD_DOMAINS:
        if domain in u:
            return True
    for kw in JOB_BOARD_KEYWORDS:
        if kw in combined:
            return True
    return False


def _looks_like_person_result(url: str, title: str, snippet: str, job_title: str) -> bool:
    """
    True if this result looks like a real person (profile/team page), not a job ad.
    We want "FirstName LastName - Title at Company" or LinkedIn/profile URLs.
    """
    u = (url or "").lower()
    t = (title or "").strip()
    s = (snippet or "").lower()
    j = (job_title or "").lower()

    # Strong signal: profile-style URL
    for pattern in PERSON_PROFILE_URL_PATTERNS:
        if pattern in u:
            return True

    # Title should suggest a person: "Arianne Balducci - ..." or "Sara Trentz | LinkedIn"
    # Reject when title starts with the job title (common in job ads: "Head of HR - Acme Corp")
    if t.lower().startswith(j):
        return False
    # Reject "Job Title at Company" with no person name (e.g. "Head of HR at Stripe")
    first_part = t.split(" - ")[0].split("|")[0].split(" – ")[0].strip()
    words = first_part.split()
    # Person names are usually 2–4 words, each capitalized or short
    if len(words) >= 2 and len(words) <= 4:
        # First part looks like "FirstName LastName" (no obvious job-title word)
        job_title_words = ("head", "director", "vp", "chief", "senior", "manager", "engineer", "officer", "lead", "principal", "hr", "cto", "cpo", "people", "learning", "culture", "experience")
        first_lower = first_part.lower()
        if not any(w in first_lower for w in job_title_words):
            return True
    # Snippet shouldn't be dominated by job-ad language
    ad_phrases = ("apply now", "submit your application", "we are hiring", "join our team", "full-time", "part-time", "salary", "years of experience required")
    if sum(1 for p in ad_phrases if p in s) >= 2:
        return False
    return False


LINKEDIN_PROFILE_URL = "linkedin.com/in/"


def search_by_job_title(job_title: str, max_results: int = 30, linkedin_only: bool = False) -> list[dict]:
    """
    Search DuckDuckGo for the job title; return results that look like real people
    (profiles, team pages). Job boards and job ads are excluded.
    When linkedin_only is True, only returns results from linkedin.com/in/ URLs.
    """
    out = []
    seen_urls = set()
    fetch_per_query = min(max_results * 2, 40)

    if linkedin_only:
        queries = ['"{job_title}" site:linkedin.com/in'.format(job_title=job_title)]
    else:
        queries = [
            '"{job_title}"'.format(job_title=job_title),
            '"{job_title}" LinkedIn'.format(job_title=job_title),
        ]

    try:
        with DDGS() as ddgs:
            for query in queries:
                if len(out) >= max_results:
                    break
                for i, r in enumerate(ddgs.text(query, max_results=fetch_per_query)):
                    if len(out) >= max_results:
                        break
                    title = r.get("title") or ""
                    snippet = r.get("body") or ""
                    url = r.get("href") or ""
                    if not url or url in seen_urls:
                        continue
                    if _is_job_board(url, title, snippet):
                        continue
                    if linkedin_only:
                        if LINKEDIN_PROFILE_URL not in url.lower():
                            continue
                    else:
                        if not _looks_like_person_result(url, title, snippet, job_title):
                            continue
                    seen_urls.add(url)
                    out.append({"title": title, "snippet": snippet, "url": url})
    except Exception:
        pass
    return out
