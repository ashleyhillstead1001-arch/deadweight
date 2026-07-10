# Deadweight

Deadweight is a student move-out storage service that lets students request pickup and storage, staff manage the workflow, and owners oversee the platform. The app is built with Node.js, Express, PostgreSQL, EJS, and WebSockets.

## What the app does

- Students can create storage requests, track status, and leave reviews.
- Staff can review and manage requests and contact submissions.
- Owners can access the admin dashboard to manage users, roles, content, and moderation.
- The app includes server-side validation, sanitization, rate limiting, and non-leaky auth errors.

## Core user flows

1. Browse the public site and request storage.
2. Sign in as a customer, staff member, or owner.
3. Track request lifecycles from requested through returned.
4. Review service experience and contact support.
5. Use the admin dashboard for staff/owner operations.

## Local setup

Requirements:

- Node.js 18+
- PostgreSQL
- pnpm

Install dependencies:

```bash
pnpm install
```

Create a local environment file from the example:

```bash
cp env.example .env
```

Update the database connection settings in `.env`, then load the environment and start the app:

```bash
set -a && . ./.env && set +a && pnpm start
```

The app will run at http://127.0.0.1:3000.

## Demo accounts

Seed data includes these accounts for pre-trip demos:

- Owner: owner@deadweight.example / P@$$w0rd!
- Staff: staff@deadweight.example / P@$$w0rd!
- Customer: customer@deadweight.example / P@$$w0rd!

## Practice walkthrough

A clean end-to-end demo should cover:

1. Open the home page and request storage.
2. Sign in as a customer and review dashboard/request history.
3. Sign in as staff and confirm access to request management and contact responses.
4. Sign in as the owner and verify the admin dashboard, user role management, and moderation tools.
5. Confirm the app returns to the home page after logout.

## Database and ERD

The schema and seed data live in [src/models/sql/seed.sql](src/models/sql/seed.sql). A Mermaid ERD draft is available in [docs/erd.md](docs/erd.md).

## Deployment notes

Before deployment, confirm:

- the database is reachable from the host environment
- environment variables are set correctly
- the app starts without runtime errors
- the demo accounts work in the deployed environment

## Repository status

This project is ready for a pre-trip demo when the local app starts successfully and the key flows above work end to end.
