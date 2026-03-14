"""
Orchestrate: for each job title -> search -> parse -> domain -> email -> save.
"""
import time
from backend.search import search_by_job_title
from backend.parse import parse_results
from backend.hunter import company_to_domain, find_email
from backend import db

# Throttle between DuckDuckGo searches (seconds)
SEARCH_DELAY = 1.5
# Max search results per job title
MAX_RESULTS_PER_TITLE = 25


def _first_last(name: str) -> tuple[str, str]:
    parts = (name or "").strip().split(maxsplit=1)
    if len(parts) >= 2:
        return parts[0], parts[1]
    if len(parts) == 1:
        return parts[0], ""
    return "", ""


def run_pipeline_events(job_titles: list[str], hunter_enabled: bool = True, linkedin_only: bool = False):
    """
    Generator that runs the pipeline and yields progress events.
    Events: {"type": "progress", "message": "...", ...} and final {"type": "done", "saved": N, "with_email": N, "errors": [], "run_id": "..."}.
    """
    db.init_db()
    saved = 0
    with_email = 0
    errors = []
    titles = [t.strip() for t in job_titles if (t or "").strip()]
    if not titles:
        yield {"type": "done", "saved": 0, "with_email": 0, "errors": [], "run_id": None}
        return

    run_id = db.create_run(titles)
    yield {
        "type": "progress",
        "message": "Starting search",
        "total_titles": len(titles),
    }

    for idx, job_title in enumerate(titles):
        job_title = (job_title or "").strip()
        if not job_title:
            continue
        yield {
            "type": "progress",
            "message": "Searching: {}".format(job_title),
            "title_index": idx + 1,
            "total_titles": len(titles),
            "title": job_title,
        }
        try:
            results = search_by_job_title(job_title, max_results=MAX_RESULTS_PER_TITLE, linkedin_only=linkedin_only)
            time.sleep(SEARCH_DELAY)
        except Exception as e:
            err_msg = "Search '{}': {}".format(job_title, e)
            errors.append(err_msg)
            yield {"type": "progress", "message": err_msg, "level": "error"}
            continue

        yield {
            "type": "progress",
            "message": "Found {} results for {}".format(len(results), job_title),
            "title": job_title,
        }

        parsed = parse_results(results, job_title)
        for p in parsed:
            company_domain = ""
            email = None
            if p.company and hunter_enabled:
                domain, domain_err = company_to_domain(p.company)
                if domain_err:
                    yield {"type": "progress", "message": domain_err, "level": "error"}
                company_domain = domain or ""
                if company_domain:
                    first, last = _first_last(p.name)
                    email, email_err = find_email(company_domain, first, last)
                    if email_err:
                        yield {"type": "progress", "message": email_err, "level": "error"}

            try:
                db.upsert_contact(
                    name=p.name,
                    job_title=p.job_title,
                    company=p.company,
                    company_domain=company_domain,
                    source_url=p.source_url,
                    email=email,
                    run_id=run_id,
                )
                saved += 1
                if email:
                    with_email += 1
                yield {
                    "type": "progress",
                    "message": "Saved: {} ({})".format(p.name, p.company or "—"),
                }
            except Exception as e:
                err_msg = "Save {}: {}".format(p.name, e)
                errors.append(err_msg)
                yield {"type": "progress", "message": err_msg, "level": "error"}

    db.update_run_counts(run_id, saved, with_email)
    yield {"type": "done", "saved": saved, "with_email": with_email, "errors": errors, "run_id": run_id}


def run_pipeline(job_titles: list[str], hunter_enabled: bool = True, linkedin_only: bool = False) -> dict:
    """
    Run full pipeline: search by title -> parse -> resolve domain -> find email -> save.
    Returns {"saved": N, "with_email": N, "errors": []}.
    """
    result = None
    for event in run_pipeline_events(job_titles, hunter_enabled=hunter_enabled, linkedin_only=linkedin_only):
        if event.get("type") == "done":
            result = event
    return result or {"saved": 0, "with_email": 0, "errors": []}
