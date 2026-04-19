# Security Policy

## Supported Versions

Only the `main` branch is supported. Security fixes are applied there and deployed through the normal workflow.

## Reporting a Vulnerability

If you discover a security issue, please report it privately via **GitHub Security Advisories** on this repository rather than opening a public issue or pull request. We will acknowledge receipt within a few days.

## Scope

This project is a static frontend plus an optional serverless proxy. In-scope concerns include:

- Leaked API keys in committed files. `TWELVE_DATA_API_KEY` must never be committed to any file in the repository. `.env.development` and `.env.production` are tracked by git for convenience, so **only public URLs belong in those files** — treat any other value as a secret and put it in `.env` (which is git-ignored).
- CORS or symbol-allowlist bypass in `proxy.cjs`.
- XSS or injection through persisted state (for example, the theme value in `localStorage`).
- Supply-chain issues in npm dependencies. Dependabot is configured to open weekly update pull requests.

## Out of Scope

Please report issues with upstream services (Twelve Data, CoinGecko, Vercel, GitHub Pages) directly to those providers rather than here.
