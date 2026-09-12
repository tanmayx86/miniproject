# Habit Arena

A responsive full-stack mini-project for turning personal habits into private, friendly competition. It includes solo habits, invite-ready rooms, live-style leaderboards, virtual point pots, and durable local persistence.

## Run locally

```bash
npm start
```

Open http://localhost:3000. Use `npm run dev` during development for Node's built-in file watcher.

## Stack

- Node.js HTTP server with JSON API routes
- Vanilla HTML, CSS, and JavaScript frontend
- `data.json` persistence for the demo environment

The core API is exposed at `GET /api/state`, `POST /api/check-in`, `POST /api/habits`, and `POST /api/rooms`.
