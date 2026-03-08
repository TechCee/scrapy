# Decision Maker Sourcing Actor

Finds enterprise decision makers (e.g. Head of HR, VP Engineering, CTO) at target companies and returns **name** and **email**, with optional job title, company, region, and source URL. No geographical limit by default; you can optionally restrict to specific regions (e.g. Europe, United States, India).

## How it works

This Actor is an **orchestrator**: it takes your input (companies, job titles, optional regions, max results per company), calls the [Company Decision Maker Finder](https://apify.com/consummate_mandala/company-decision-maker-finder) Apify Actor, maps the results to a unified schema, optionally filters by region, and pushes the dataset.

- **Input:** Companies (names or domains), decision maker job titles, optional regions, optional max results per company.
- **Output:** For each person: `name`, `email`, `jobTitle`, `company`, `companyDomain`, `region`, `sourceUrl`, `source`.

Default job titles are tailored to buyers of feedback/trust/culture tools (e.g. Head of HR, Chief People Officer, VP People, Head of Engineering, CTO, Head of L&D, Director of People & Culture, Head of Employee Experience). You can override or extend the list in the input.

## Run locally

1. Install the [Apify CLI](https://docs.apify.com/cli) and log in:
   ```bash
   npm install -g apify-cli
   apify login
   ```

2. From the Actor root (`apify-decision-maker-actor/`):
   ```bash
   apify run
   ```

   You can pass input via `INPUT.json` in the Actor folder or via the CLI. Example `INPUT.json`:

   ```json
   {
     "companies": ["stripe.com", "vercel.com"],
     "decisionMakerTitles": ["Head of HR", "CTO"],
     "regions": [],
     "maxResultsPerCompany": 5
   }
   ```

3. To run with the Apify SDK’s default input handling (e.g. from Apify Console), run the main script:
   ```bash
   python src/main.py
   ```
   Ensure `APIFY_IS_AT_HOME` or the correct Apify token is set when running outside Apify.

## Deploy to Apify

1. **Via Apify CLI** (from the Actor root):
   ```bash
   apify push
   ```
   This builds and deploys the Actor to your Apify account.

2. **Via GitHub:** Connect your repo to Apify (Settings → Integrations → GitHub). Put the Actor in a folder or branch that Apify is configured to build from. Apify will use the Dockerfile and `.actor/actor.json` in that path.

## Requirements

- Python 3.11+
- [apify](https://pypi.org/project/apify/) Python package (see `requirements.txt`).

## Input schema

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `companies` | array of strings | Yes | Company names or domains (e.g. `stripe.com`, `Acme Corp`). |
| `decisionMakerTitles` | array of strings | Yes | Job titles to find. Defaults include Head of HR, Chief People Officer, VP People, Head of Engineering, VP Engineering, CTO, Head of L&D, Director of People & Culture, Head of Employee Experience. |
| `regions` | array of strings | No | Restrict to these countries/regions (e.g. `United States`, `United Kingdom`). Empty = global. |
| `maxResultsPerCompany` | integer | No | Cap on number of decision makers per company (default 10). |

## Output (dataset)

Each record contains:

- `name` – Full name
- `email` – Email address (estimated by the called Actor when possible)
- `jobTitle` – Job title
- `company` – Company name
- `companyDomain` – Company domain (if available)
- `region` – Location/region (if available)
- `sourceUrl` – e.g. LinkedIn profile URL
- `source` – e.g. `company_decision_maker_finder`

## Notes

- **Costs:** This Actor calls another Store Actor ([Company Decision Maker Finder](https://apify.com/consummate_mandala/company-decision-maker-finder)). You pay for both this run and the child Actor’s usage. Use `maxResultsPerCompany` and small company lists when testing.
- **LinkedIn:** The child Actor may use LinkedIn-style data. Use it in line with Apify’s and the Actor’s terms and compliance.
- **Emails:** Emails are often estimated from common patterns; verify before using for outreach.

## License

Private. All rights reserved.
