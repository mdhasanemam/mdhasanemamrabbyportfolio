#!/usr/bin/env python3
"""Sync publications from a Google Scholar profile (via SerpApi) into data/publications.json.

- The API key is read from the SERPAPI_KEY environment variable (a GitHub Actions secret). Never put it in a file.
- Existing entries are never deleted. Manual fields (doi, links, description, visible, status) are never overwritten.
- If the request fails or returns nothing, the file is left untouched.
Usage: python3 scripts/sync_scholar.py [--mock path/to/response.json]
"""
import json, os, re, sys, urllib.parse, urllib.request

AUTHOR_ID = os.environ.get("SCHOLAR_AUTHOR_ID", "UYvdcTkAAAAJ")
PATH = os.path.join(os.path.dirname(__file__), "..", "data", "publications.json")

def norm(title):
    return re.sub(r"[^a-z0-9]+", " ", title.lower()).strip()

def slug(title):
    return re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")[:70]

def fetch_articles():
    if "--mock" in sys.argv:
        data = json.load(open(sys.argv[sys.argv.index("--mock") + 1], encoding="utf-8"))
    else:
        key = os.environ.get("SERPAPI_KEY")
        if not key:
            sys.exit("SERPAPI_KEY is not set (add it as a GitHub Actions secret).")
        query = urllib.parse.urlencode({"engine": "google_scholar_author", "author_id": AUTHOR_ID,
                                        "hl": "en", "num": "100", "sort": "pubdate", "api_key": key})
        with urllib.request.urlopen("https://serpapi.com/search.json?" + query, timeout=60) as response:
            data = json.load(response)
    if data.get("error"):
        sys.exit("SerpApi error: " + str(data["error"]))
    articles = data.get("articles") or []
    if not articles:
        sys.exit("No articles returned; leaving publications.json unchanged.")
    return articles

def merge(data, articles):
    pubs = data.setdefault("publications", [])
    index = {norm(p.get("title", "")): p for p in pubs}
    changed = False
    for a in articles:
        title = (a.get("title") or "").strip()
        if not title:
            continue
        cited = (a.get("cited_by") or {}).get("value") or 0
        existing = index.get(norm(title))
        if existing:
            updates = {"citedBy": cited or existing.get("citedBy", 0), "scholarUrl": a.get("link", "")}
            for field, value in (("authors", a.get("authors", "")), ("year", str(a.get("year", "") or "")),
                                 ("venue", a.get("publication", ""))):
                if not existing.get(field) and value:
                    updates[field] = value
            for k, v in updates.items():
                if existing.get(k) != v:
                    existing[k] = v; changed = True
        else:
            entry = {"id": slug(title), "title": title, "authors": a.get("authors", ""),
                     "venue": a.get("publication", ""), "year": str(a.get("year", "") or ""),
                     "status": "Published", "description": "", "doi": "", "paperUrl": "", "publisherUrl": "",
                     "pdfUrl": "", "scholarUrl": a.get("link", ""), "citedBy": cited, "keywords": [], "visible": True}
            pubs.append(entry); index[norm(title)] = entry; changed = True
    pubs.sort(key=lambda p: int(p["year"]) if str(p.get("year", "")).isdigit() else 0, reverse=True)
    return changed

if __name__ == "__main__":
    articles = fetch_articles()
    data = json.load(open(PATH, encoding="utf-8"))
    if merge(data, articles):
        json.dump(data, open(PATH, "w", encoding="utf-8"), indent=2, ensure_ascii=False)
        open(PATH, "a").write("\n")
        print("publications.json updated.")
    else:
        print("No changes.")
