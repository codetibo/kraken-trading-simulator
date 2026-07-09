# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 0.1.x   | :white_check_mark: |

## Reporting a Vulnerability

We take the security of the Kraken Trading Simulator seriously. If you discover a security vulnerability, please follow these steps:

1. **Do not** open a public issue for the vulnerability.
2. Send a detailed report to the maintainers via email at [codetibo@proton.me](mailto:codetibo@proton.me).
3. Include the following information in your report:
   - A description of the vulnerability
   - Steps to reproduce the issue
   - Potential impact of the vulnerability
   - Any suggested fixes or mitigations

## Response Process

- We will acknowledge receipt of your report within 3 business days.
- We will provide a more detailed response within 7 business days, outlining the next steps.
- We will work with you to understand and resolve the issue.
- Once the issue is resolved, we will publicly acknowledge your contribution (unless you prefer to remain anonymous).

## Security Best Practices for Contributors

When contributing to this project, please keep the following security considerations in mind:

- **Never commit secrets or credentials** — API keys, database passwords, tokens, etc. should be stored in environment variables and referenced via `.env` files (which are gitignored).
- **Validate all user input** — use the existing Zod schemas in `lib/validation/` to validate all incoming data.
- **Sanitize output** — ensure user-generated content is properly escaped before rendering.
- **Use parameterized queries** — all database access should go through Prisma to prevent SQL injection.
- **Keep dependencies updated** — regularly check for and apply security patches to dependencies.
- **Follow the principle of least privilege** — server actions and API routes should only expose the minimum necessary functionality.
- **Avoid exposing internal errors** — use the existing error handling patterns and do not leak stack traces or internal details to clients.

## Dependencies

We use `npm audit` to check for known vulnerabilities in our dependencies. Before submitting a PR, please run:

```bash
npm audit
```

If vulnerabilities are found, please update the affected packages and note the changes in your PR description.

## Authentication and Authorization

This project uses [Better Auth](https://better-auth.com/) for authentication. When working with auth-related code:

- Do not bypass authentication checks
- Ensure API routes properly validate sessions
- Follow the existing auth patterns in `app/api/auth/` and `server/actions/`

## Data Protection

- This is a **simulator** — no real financial data or real money is involved.
- All trading data is stored locally in the user's PostgreSQL database.
- Ensure that any new data collection respects user privacy and the simulator nature of the application.
