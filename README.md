# Md. Hasan Emam — AI Researcher & Software Developer Portfolio

A responsive, research-oriented portfolio evolving the original HTML/CSS site. The current repository is a static HTML/CSS/JavaScript website with a small PHP contact endpoint; it has no database or application framework. Existing CV and image assets are retained.

## Included

- Responsive academic portfolio design with accessible navigation, light/dark themes, reduced-motion support, SEO metadata, Open Graph tags, and Person JSON-LD.
- Structured publication records in `data/publications.json` and a manual refresh button. The Google Scholar link is provided, but the site deliberately does not scrape Scholar or claim an unsupported integration.
- Public GitHub repositories fetched from the GitHub REST API for `mdhasanemam`, categorized from repository metadata, sorted to put AI/research matches first, and cached in the visitor's browser for six hours. No token is used or exposed.
- Existing CV, profile image, and Hotel Management System download link are preserved.
- Contact form validation, a honeypot, a session-based 30-second cooldown, and fixed safe mail headers in PHP.

## Publication accuracy and monitoring

The supplied information identifies the CUI/hypergraph medical image retrieval paper as published in IEEE Access. No author list, publication year, DOI, or direct paper URL was supplied, so those fields remain empty instead of being guessed. The retinal triage title is included with an explicit unverified status and is not labeled as published.

Google Scholar does not provide a public, officially supported API/feed for arbitrary profile synchronization. This version does not scrape Scholar, bypass access controls, or imply automatic Scholar monitoring. Use manually maintained verified JSON records or integrate an authorized publication API/feed before enabling scheduled updates. The refresh button reloads the records served by the site; it does not pretend to trigger a Scholar sync.

For an authorized feed/API-based scheduled sync, the PHP host can run a CLI cron job that validates incoming records, deduplicates on DOI/link/title, writes `data/publications.json` atomically, and records status. That backend workflow is not enabled in this static implementation: there is no configured approved data source, database, or writable runtime storage. Do not configure a Scholar scraping URL. Configure an official/authorized source and add its server-side credentials only through host environment variables if that provider requires them.

## Deployment

### Static hosting / GitHub Pages

Serve `index.html` from the repository root. HTML, CSS, JS, JSON, CV, and images work as static assets. GitHub API calls are public unauthenticated requests and may be limited by GitHub; the site shows an error state and links to the profile when unavailable. GitHub Pages does not execute PHP, so the contact form will not work there: use the displayed email link or deploy the PHP endpoint to a PHP-capable host and set the form action to that host.

Update the canonical URL in `index.html` if the final custom domain or deployment path differs. `sitemap.xml` uses the repository GitHub Pages URL as a placeholder and should also be updated to the deployed canonical URL.

### PHP-capable hosting

Deploy the full repository to a host with PHP 7.4+ and `mail()` configured. `index.php` handles POST requests, but is not the homepage; use `index.html` as the web root document. The contact form is routed to `index.php` and uses a PHP session, so HTTPS and a working session store are required. The server must allow outgoing mail for the existing email recipient to receive submissions.

## Profile links and content to complete

- GitHub: https://github.com/mdhasanemam
- Google Scholar: https://scholar.google.com/citations?user=UYvdcTkAAAAJ
- LinkedIn: https://www.linkedin.com/in/md-hasan-emam/
- CV: existing `Profile.pdf`
- ORCID and ResearchGate are omitted because verified profile URLs were not provided.
- Fill in verified publication authors, year, DOI, publisher/paper URL, and PDF links in `data/publications.json` when available.
- `FEATURED_REPOSITORIES` in `app.js` is intentionally empty until specific repositories are selected. Add verified `owner/repo` names to pin them ahead of other projects.

## Contact endpoint note

The form uses `index.php` and PHP's built-in `mail()`. Configure and test mail delivery on the deployment host before advertising it as a working form. The cooldown is session-level, not a substitute for a production WAF or CAPTCHA; add provider-side spam controls if abuse occurs. No credentials or API keys belong in client-side code or this repository.

## Validation

No build tool or test suite existed in the original repository. The website uses native browser APIs and no JavaScript dependencies. Before production, validate PHP syntax (`php -l index.php`), test the form only on the configured PHP host, verify the live URLs and profile data, and check the page on mobile and desktop. GitHub Pages deployment is static and cannot exercise the PHP endpoint.
