# Contributing

Thanks for your interest in improving Neon Charts.

## Quick Start

1. Fork the repository and clone your fork.
2. Install dependencies: `npm install`.
3. Create a feature branch: `git checkout -b feat/short-description`.
4. Make your changes. Before committing, run:
   ```bash
   npm run build
   npm test
   ```
5. Open a pull request against `main` describing what changed and why.

## Conventions

- **Commit messages** follow the [Conventional Commits](https://www.conventionalcommits.org/) style where practical (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:` ...).
- **Style** matches the existing code — ES modules, two-space indentation, descriptive variable names.
- **No secrets in commits.** `.env` is git-ignored. Use `.env.example` to document any new environment variables.
- **Keep the scope tight.** One logical change per pull request makes review faster.

## Reporting Issues

When opening an issue, please include:

- A clear description of the problem and the expected behaviour.
- Steps to reproduce, ideally with a screenshot or a minimal repro.
- Browser, OS, and Node.js versions if they seem relevant.

## Scope

This is primarily a personal portfolio project. Small fixes, accessibility improvements, documentation updates, new themes, and data-source improvements are all welcome. Large architectural rewrites may not be merged — please open an issue first to discuss.
