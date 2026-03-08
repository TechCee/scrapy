"""
Decision Maker Sourcing Actor (orchestrator).

Supports two modes:
1. Company-based: provide companies + decisionMakerTitles → calls Company Decision Maker Finder.
2. Title-only: provide only decisionMakerTitles (no companies) → calls LinkedIn Profile Search,
   finding people with those job titles across the web (any company).
"""

import asyncio
from apify import Actor


COMPANY_DECISION_MAKER_FINDER_ACTOR_ID = "consummate_mandala/company-decision-maker-finder"
LINKEDIN_PROFILE_SEARCH_ACTOR_ID = "harvestapi/linkedin-profile-search"

# Default decision maker titles (Trustle-focused: HR, People, Engineering, L&D, Culture).
# Used when input does not provide decisionMakerTitles.
DEFAULT_DECISION_MAKER_TITLES = [
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
]


def _normalize_company(raw: str) -> str:
    if not raw or not isinstance(raw, str):
        return ""
    return raw.strip()


def _map_company_finder_item(item: dict, company: str, region_filter: list | None) -> dict | None:
    """Map Company Decision Maker Finder output to our dataset schema."""
    name = (
        item.get("name")
        or item.get("fullName")
        or item.get("full_name")
        or item.get("title")
    )
    if isinstance(name, dict):
        name = name.get("text") or name.get("name") or ""
    email = item.get("email") or item.get("estimatedEmail") or item.get("estimated_email") or ""
    job_title = (
        item.get("jobTitle")
        or item.get("job_title")
        or item.get("title")
        or item.get("position")
    )
    if isinstance(job_title, dict):
        job_title = job_title.get("text") or job_title.get("title") or ""
    company_name = item.get("company") or item.get("companyName") or item.get("company_name") or company
    company_domain = item.get("companyDomain") or item.get("company_domain") or item.get("domain") or ""
    location = item.get("location") or item.get("region") or item.get("country") or ""
    if isinstance(location, dict):
        location = location.get("text") or location.get("name") or ""
    source_url = item.get("linkedinUrl") or item.get("linkedin_url") or item.get("url") or item.get("profileUrl") or ""
    source = item.get("source") or "company_decision_maker_finder"

    if region_filter and location:
        location_lower = location.lower()
        if not any(reg.lower() in location_lower for reg in region_filter):
            return None
    region_out = location if isinstance(location, str) else ""

    return {
        "name": name or "",
        "email": email or "",
        "jobTitle": job_title or "",
        "company": company_name or company,
        "companyDomain": company_domain or "",
        "region": region_out,
        "sourceUrl": source_url or "",
        "source": source,
    }


def _map_linkedin_profile_item(item: dict, region_filter: list | None) -> dict | None:
    """Map LinkedIn Profile Search (harvestapi) output to our dataset schema."""
    first = item.get("firstName") or ""
    last = item.get("lastName") or ""
    name = f"{first} {last}".strip() or item.get("headline") or ""

    email = item.get("email") or ""

    headline = item.get("headline") or ""
    current_pos = item.get("currentPosition") or []
    experience = item.get("experience") or []
    job_title = headline
    if not job_title and experience and isinstance(experience[0], dict):
        job_title = experience[0].get("position") or ""

    company_name = ""
    if current_pos and isinstance(current_pos[0], dict):
        company_name = current_pos[0].get("companyName") or ""
    if not company_name and experience and isinstance(experience[0], dict):
        company_name = experience[0].get("companyName") or ""

    location = item.get("location")
    if isinstance(location, dict):
        region_out = location.get("linkedinText") or (location.get("parsed") or {}).get("text") or ""
    else:
        region_out = str(location) if location else ""

    if region_filter and region_out:
        region_lower = region_out.lower()
        if not any(reg.lower() in region_lower for reg in region_filter):
            return None

    linkedin_url = item.get("linkedinUrl") or ""

    return {
        "name": name,
        "email": email,
        "jobTitle": job_title or "",
        "company": company_name,
        "companyDomain": "",
        "region": region_out,
        "sourceUrl": linkedin_url,
        "source": "linkedin_profile_search",
    }


async def _run_company_based(
    companies: list[str],
    decision_maker_titles: list[str],
    region_filter: list | None,
    max_results_per_company: int,
) -> None:
    """Call Company Decision Maker Finder and push mapped results."""
    run_input = {
        "companies": companies,
        "roles": decision_maker_titles,
        "maxResultsPerCompany": max_results_per_company,
    }
    actor_run = await Actor.call(
        actor_id=COMPANY_DECISION_MAKER_FINDER_ACTOR_ID,
        run_input=run_input,
    )
    if actor_run is None:
        raise RuntimeError("Company Decision Maker Finder Actor failed to start.")

    run_client = Actor.apify_client.run(actor_run.id)
    await run_client.wait_for_finish()

    dataset_client = run_client.dataset()
    item_list = await dataset_client.list_items()
    items = getattr(item_list, "items", item_list) if not isinstance(item_list, list) else item_list

    default_company = companies[0] if companies else ""
    pushed = 0
    for raw in items:
        company = (
            raw.get("company")
            or raw.get("companyName")
            or raw.get("company_name")
            or default_company
        )
        out = _map_company_finder_item(raw, company, region_filter)
        if out is not None:
            await Actor.push_data(out)
            pushed += 1
    Actor.log.info(f"Company-based search: pushed {pushed} decision maker records.")


async def _run_title_only(
    decision_maker_titles: list[str],
    region_filter: list | None,
    max_results: int,
) -> None:
    """Call LinkedIn Profile Search by job titles (no company list) and push mapped results."""
    # HarvestAPI: currentJobTitles (list), takePages or maxItems, profileScraperMode ("Short"|"Full"|"Full + email search")
    # Use "Full" for headline/company; use takePages to limit cost (1 page ≈ 25 results per query).
    take_pages = max(1, (max_results // 25) + 1)
    run_input = {
        "currentJobTitles": decision_maker_titles,
        "takePages": min(take_pages, 100),
        "maxItems": max_results,
        "profileScraperMode": "Full",
    }
    if region_filter:
        run_input["locations"] = region_filter

    actor_run = await Actor.call(
        actor_id=LINKEDIN_PROFILE_SEARCH_ACTOR_ID,
        run_input=run_input,
    )
    if actor_run is None:
        raise RuntimeError("LinkedIn Profile Search Actor failed to start.")

    run_client = Actor.apify_client.run(actor_run.id)
    await run_client.wait_for_finish()

    dataset_client = run_client.dataset()
    item_list = await dataset_client.list_items()
    items = getattr(item_list, "items", item_list) if not isinstance(item_list, list) else item_list

    pushed = 0
    for raw in items:
        out = _map_linkedin_profile_item(raw, region_filter)
        if out is not None:
            await Actor.push_data(out)
            pushed += 1
    Actor.log.info(f"Title-only search: pushed {pushed} decision maker records.")


async def main() -> None:
    async with Actor:
        actor_input = await Actor.get_input() or {}
        companies = actor_input.get("companies") or []
        decision_maker_titles = actor_input.get("decisionMakerTitles") or []
        regions = actor_input.get("regions") or []
        max_results_per_company = actor_input.get("maxResultsPerCompany") or 10
        max_results = actor_input.get("maxResults") or 1000

        companies = [_normalize_company(c) for c in companies if _normalize_company(c)]
        if not decision_maker_titles:
            decision_maker_titles = DEFAULT_DECISION_MAKER_TITLES
            Actor.log.info(f"No titles provided; using default list ({len(decision_maker_titles)} titles).")

        region_filter = [r.strip() for r in regions if r and isinstance(r, str)] if regions else None

        if companies:
            Actor.log.info(
                f"Company-based mode: {len(companies)} companies, {len(decision_maker_titles)} titles, "
                f"max {max_results_per_company} per company. Regions: {'global' if not region_filter else region_filter}."
            )
            await _run_company_based(
                companies, decision_maker_titles, region_filter, max_results_per_company
            )
        else:
            Actor.log.info(
                f"Title-only mode: {len(decision_maker_titles)} titles, max {max_results} profiles. "
                f"Regions: {'global' if not region_filter else region_filter}."
            )
            await _run_title_only(decision_maker_titles, region_filter, max_results)


if __name__ == "__main__":
    asyncio.run(main())
