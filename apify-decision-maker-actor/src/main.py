"""
Decision Maker Sourcing Actor (orchestrator).

Reads input (companies, decisionMakerTitles, optional regions, maxResultsPerCompany),
calls the Company Decision Maker Finder Apify Actor, maps results to a unified
schema, optionally filters by region, and pushes name, email, jobTitle, company,
region, sourceUrl, source to the dataset.
"""

import asyncio
from apify import Actor


# Store Actor we call: finds decision makers by company and role, returns names/titles/emails.
COMPANY_DECISION_MAKER_FINDER_ACTOR_ID = "consummate_mandala/company-decision-maker-finder"


def _normalize_company(raw: str) -> str:
    """Use company name or domain as given; strip whitespace."""
    if not raw or not isinstance(raw, str):
        return ""
    return raw.strip()


def _map_item_to_output(item: dict, company: str, region_filter: list | None) -> dict | None:
    """
    Map a result item from the called Actor to our dataset schema.
    If region_filter is set and we have location data, filter by it; otherwise include.
    """
    # Common field names used by Company Decision Maker Finder (and similar) actors.
    name = (
        item.get("name")
        or item.get("fullName")
        or item.get("full_name")
        or item.get("title")  # sometimes "title" is the person's name in scrapers
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

    # Optional region filter: if we have location and a filter list, check match (simple substring).
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


async def main() -> None:
    async with Actor:
        actor_input = await Actor.get_input() or {}
        companies = actor_input.get("companies") or []
        decision_maker_titles = actor_input.get("decisionMakerTitles") or []
        regions = actor_input.get("regions") or []
        max_results_per_company = actor_input.get("maxResultsPerCompany") or 10

        companies = [_normalize_company(c) for c in companies if _normalize_company(c)]
        if not companies:
            Actor.log.warning("No companies provided. Exiting.")
            return
        if not decision_maker_titles:
            Actor.log.warning("No decision maker titles provided. Exiting.")
            return

        # Optional: restrict to specific regions (empty = global).
        region_filter = [r.strip() for r in regions if r and isinstance(r, str)] if regions else None

        Actor.log.info(
            f"Running for {len(companies)} companies, {len(decision_maker_titles)} titles, "
            f"max {max_results_per_company} per company. Regions: {'global' if not region_filter else region_filter}."
        )

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

        pushed = 0
        default_company = companies[0] if companies else ""
        for raw in items:
            company = (
                raw.get("company")
                or raw.get("companyName")
                or raw.get("company_name")
                or default_company
            )
            out = _map_item_to_output(raw, company, region_filter)
            if out is not None:
                await Actor.push_data(out)
                pushed += 1

        Actor.log.info(f"Pushed {pushed} decision maker records to dataset.")


if __name__ == "__main__":
    asyncio.run(main())
