"""
Hunter.io API: Domain Search (company -> domain) and Email Finder (name + domain -> email).
Uses HUNTER_API_KEY from environment (.env loaded at first use if needed). If missing, domain/email steps are skipped.
"""
import json
import os
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

BASE = "https://api.hunter.io/v2"


def _get_api_key():
    key = os.environ.get("HUNTER_API_KEY") or os.environ.get("HUNTER_IO_API_KEY")
    if key:
        return key
    try:
        from dotenv import load_dotenv
        env_path = Path(__file__).resolve().parent.parent / ".env"
        load_dotenv(env_path)
        return os.environ.get("HUNTER_API_KEY") or os.environ.get("HUNTER_IO_API_KEY")
    except Exception:
        return None


def _request(path, params):
    """Returns JSON dict on success, or {"error": "message"} on failure."""
    key = _get_api_key()
    if not key:
        return {"error": "Hunter API key missing (add HUNTER_API_KEY to .env)"}
    params = dict(params)
    params["api_key"] = key
    url = "{}?{}".format(BASE + path, urllib.parse.urlencode(params))
    try:
        req = urllib.request.Request(url)
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = json.loads(resp.read().decode())
            if data.get("errors"):
                err = data["errors"]
                if isinstance(err, list) and err:
                    return {"error": "Hunter: " + str(err[0])}
                return {"error": "Hunter: " + str(err)}
            return data
    except urllib.error.HTTPError as e:
        body = ""
        try:
            body = e.read().decode()
            obj = json.loads(body)
            if isinstance(obj, dict) and obj.get("errors"):
                return {"error": "Hunter: " + str(obj["errors"])}
        except Exception:
            pass
        if e.code == 403:
            return {"error": "Hunter rate limit or access denied (403). Wait a few minutes or check your Hunter.io plan and API key."}
        if e.code == 429:
            return {"error": "Hunter usage limit exceeded (429). Check your plan or try again later."}
        return {"error": "Hunter: HTTP {} {}".format(e.code, body[:200] or e.reason)}
    except Exception as e:
        return {"error": "Hunter: " + str(e)}


def _slug_domain(company_name: str) -> str:
    """Fallback: rough company name -> domain guess (e.g. Acme Corp -> acmecorp.com)."""
    s = "".join(c for c in (company_name or "").lower() if c.isalnum() or c in " -")
    s = s.replace(" ", "").replace("-", "")[:30]
    return "{}.com".format(s) if s else ""


def company_to_domain(company_name):
    """
    Use Hunter Domain Search with company name to get a domain.
    Returns (domain, error_message). domain is None on failure; error_message is set when API fails.
    Falls back to slugified name + .com if API doesn't return one.
    """
    if not company_name:
        return (None, None)
    key = _get_api_key()
    if key:
        data = _request("/domain-search", {"company": company_name})
        if data.get("error"):
            return (None, data["error"])
        if data and "data" in data:
            d = data["data"]
            if isinstance(d, dict) and d.get("domain"):
                return (d.get("domain"), None)
            if isinstance(d, list) and len(d) > 0 and isinstance(d[0], dict):
                return (d[0].get("domain"), None)
    domain = _slug_domain(company_name) or None
    return (domain, None)


def find_email(domain, first_name, last_name):
    """
    Hunter Email Finder: domain + first_name + last_name -> email.
    Returns (email, error_message). email is None on failure; error_message set when API fails.
    Throttle: 1 req/sec to respect free tier.
    """
    if not domain or not (first_name or last_name):
        return (None, None)
    if not _get_api_key():
        return (None, "Hunter API key missing (add HUNTER_API_KEY to .env)")
    time.sleep(1.0)
    parts = (first_name or "").strip().split() + (last_name or "").strip().split()
    if len(parts) >= 2:
        first_name, last_name = parts[0], " ".join(parts[1:])
    elif len(parts) == 1:
        first_name, last_name = parts[0], ""
    else:
        return (None, None)
    data = _request("/email-finder", {
        "domain": domain.replace(" ", ""),
        "first_name": first_name,
        "last_name": last_name,
    })
    if data.get("error"):
        return (None, data["error"])
    if not data or "data" not in data:
        return (None, None)
    email = data.get("data", {}).get("email")
    if isinstance(email, str) and "@" in email:
        return (email, None)
    return (None, None)
