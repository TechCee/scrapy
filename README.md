# Decision Maker Finder (local app)

Runs **locally** (no Apify). Search by job title only → find names and companies from the web → get emails via Hunter.io → store in SQLite and view/export in a web UI.

## Quick start

1. **Install dependencies**

   ```bash
   pip3 install -r requirements.txt
   ```
   (If `pip3` is not found, try `python3 -m pip install -r requirements.txt`.)

2. **Optional: Hunter.io for emails**

   Sign up at [hunter.io](https://hunter.io), get a free API key from the dashboard, then:

   ```bash
   cp .env.example .env
   # Edit .env and set HUNTER_API_KEY=your_key
   ```

   If you skip this, the app still runs and stores name, job title, company, and source URL; only the email step is skipped.

3. **Run the app**

   ```bash
   python server.py
   ```

   Open [http://localhost:5000](http://localhost:5000).

4. **Use the UI**

   - **Run search:** Enter job titles (one per line) or leave the default list, check "Use Hunter.io" if you have a key, click **Run search**. Results are saved to the local SQLite DB.
   - **Contacts:** View the table; use filters (job title, company, has email) and click **Apply**.
   - **Export CSV:** Click **Export CSV** to download the current (filtered) list.

## How it works

1. **Search:** DuckDuckGo (via `ddgs`) is queried for each job title; results are titles/snippets/URLs.
2. **Parse:** Heuristics extract person name and company from each result (e.g. "Jane Doe - Head of HR at Acme Corp").
3. **Domain:** Company name is turned into a domain (Hunter Domain Search when possible, or a simple guess).
4. **Email:** Hunter Email Finder is called with first name, last name, and domain (if you set `HUNTER_API_KEY`).
5. **Store:** All contacts are upserted into `data/contacts.db` (SQLite).

## Data

- DB file: `data/contacts.db` (created on first run). Not committed to git.
- Export: CSV from the UI uses the same filters as the table.

## Requirements

- Python 3.10+
- `flask`, `ddgs`, `python-dotenv` (see `requirements.txt`)
