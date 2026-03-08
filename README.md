# Decision Maker Sourcing Actor

Finds enterprise decision makers (e.g. Head of HR, VP Engineering, CTO) and returns **name** and **email**, with job title, company, region, and source URL. Supports two modes:

1. **Title-only:** Provide only **decision maker job titles** (leave companies empty). The Actor searches the web for people in those roles at **any company** via [LinkedIn Profile Search](https://apify.com/harvestapi/linkedin-profile-search).
2. **Company-based:** Provide **companies** and job titles. The Actor finds decision makers at those specific companies via [Company Decision Maker Finder](https://apify.com/consummate_mandala/company-decision-maker-finder).

No geographical limit by default; you can optionally restrict to specific regions.

## How it works

- **Input:** **Decision maker job titles** (optional; if empty, a default list is baked in). **Companies** (optional): if provided, company-based search; if empty, title-only search. Optional: regions, max results (default 1000 for title-only).
- **Output:** For each person: `name`, `email`, `jobTitle`, `company`, `companyDomain`, `region`, `sourceUrl`, `source`.

Decision maker titles are baked into the code: Head of HR, Chief People Officer, VP People, Head of People, Head of Engineering, VP Engineering, CTO, Head of Learning & Development, Director of People & Culture, Head of Employee Experience. If you leave the titles input empty, this list is used. You can override or extend by passing your own list.

## Run locally

1. Install the [Apify CLI](https://docs.apify.com/cli) and log in:
   ```bash
   npm install -g apify-cli
   apify login
   ```

2. From the repo root:
   ```bash
   apify run
   ```

   You can pass input via `INPUT.json` in the repo root or via the CLI.

   **Title-only (no companies; uses baked-in default titles, max 1000):**
   ```json
   {
     "decisionMakerTitles": [],
     "regions": [],
     "maxResults": 1000
   }
   ```

   **Company-based:**
   ```json
   {
     "companies": ["stripe.com", "vercel.com"],
     "decisionMakerTitles": ["Head of HR", "CTO"],
     "regions": [],
     "maxResultsPerCompany": 5
   }
   ```

3. To run with the Apify SDK's default input handling (e.g. from Apify Console), run the main script:
   ```bash
   python src/main.py
   ```
   Ensure `APIFY_IS_AT_HOME` or the correct Apify token is set when running outside Apify.

## Deploy to Apify

1. **Via Apify CLI** (from the repo root):
   ```bash
   apify push
   ```
   This builds and deploys the Actor to your Apify account.

2. **Via GitHub:** Connect your repo to Apify (Settings → Integrations → GitHub). With the Actor at the repo root, Apify will use the Dockerfile and `.actor/actor.json` from the root. No build context directory change needed.

## Permissions required (fix "Insufficient permissions" error)

This Actor **calls other Apify Store Actors** (Company Decision Maker Finder and/or LinkedIn Profile Search). By default, Actors run with **Limited** permissions and can only start other Limited-permission Actors. If the Store Actors require **Full** permissions, you will see:

`ApifyApiError: Insufficient permissions for the Actor. Make sure you're passing a correct API token and that it has the required permissions.`

**Fix: set your Actor to Full permissions**

1. Open [Apify Console](https://console.apify.com/) and go to **Actors**.
2. Open **your** Actor (Decision Maker Sourcing Actor).
3. Go to the **Settings** tab (or **Configure** → **Settings**).
4. Find **Permission level** or **Default run options** (may be under "Run" or "Build & run").
5. Set **Permission level** to **Full permissions** (instead of Limited).
6. Save. New runs will use Full permissions and will be able to start the Store Actors.

**Optional: override for a single run**

When starting a run from the Console, expand **Run options** (or "Advanced") and set **Permission level** to **Full** for that run only. Via API: pass `forcePermissionLevel: "FULL_PERMISSIONS"` in the run options.

## Requirements

- Python 3.11+
- [apify](https://pypi.org/project/apify/) Python package (see `requirements.txt`).

## Input schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `decisionMakerTitles` | array of strings | No | Job titles to find. Empty = use baked-in default list (Head of HR, CPO, VP People, etc.). |
| `companies` | array of strings | No | Company names or domains. If empty, title-only search (any company). |
| `regions` | array of strings | No | Restrict to these countries/regions. Empty = global. |
| `maxResultsPerCompany` | integer | No | When companies provided: cap per company (default 10). |
| `maxResults` | integer | No | Title-only mode: max profiles to fetch (default 1000). |

## Output (dataset)

Each record contains:

- `name` – Full name
- `email` – Email address (estimated by the called Actor when possible)
- `jobTitle` – Job title
- `company` – Company name
- `companyDomain` – Company domain (if available)
- `region` – Location/region (if available)
- `sourceUrl` – e.g. LinkedIn profile URL
- `source` – `company_decision_maker_finder` or `linkedin_profile_search`

## Will the Actor run successfully?

Yes, with **valid input** it will run successfully:

- You can leave **decision maker job titles** empty to use the baked-in default list, or provide your own. Leave **companies** empty for title-only search.
- If you provide companies and titles (or use default titles), the company-based path runs; if companies are empty, the title-only (LinkedIn) path runs.
- Success also depends on the child Actors (Apify Store) and your Apify account (credits, rate limits). Use small limits when testing (`maxResults` or `maxResultsPerCompany`).

## Notes

- **Costs:** This Actor calls Store Actors ([Company Decision Maker Finder](https://apify.com/consummate_mandala/company-decision-maker-finder) or [LinkedIn Profile Search](https://apify.com/harvestapi/linkedin-profile-search)). You pay for this run plus the child Actor's usage. Use small limits when testing.
- **LinkedIn:** Title-only mode uses LinkedIn data. Use it in line with Apify's and the Actor's terms and compliance.
- **Emails:** In company-based mode emails are often estimated; in title-only mode (Full profile) emails may be empty unless the child Actor supports email search. Verify before using for outreach.

## License

Private. All rights reserved.
