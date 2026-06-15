# orbitDesk Starter

A beginner-friendly full-stack starter with:

- `client/` for the React frontend
- `admin_interface/` for the React admin frontend
- `server/` for the Fastify backend

Each app has its own:

- `.env`
- `.gitignore`
- `package.json`

## Project Structure

```text
orbitDesk/
├── README.md
├── client/
│   ├── .env
│   ├── .gitignore
│   ├── index.html
│   ├── package.json
│   ├── postcss.config.js
│   ├── tailwind.config.js
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── index.css
│       ├── main.jsx
│       ├── assets/
│       ├── components/
│       │   ├── Hero.jsx
│       │   └── SectionCard.jsx
│       └── pages/
│           └── Home.jsx
├── admin_interface/
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── App.jsx
│       ├── api/
│       │   └── admin.js
│       └── pages/
│           ├── AdminDashboard.jsx
│           └── SetPassword.jsx
└── server/
    ├── .env
    ├── .gitignore
    ├── package.json
    └── src/
        ├── app.js
        ├── server.js
        ├── config/
        │   └── env.js
        ├── plugins/
        │   └── sensible.js
        ├── models/
        │   ├── Client.js
        │   └── Member.js
        ├── modules/
        │   ├── admin/
        │   ├── auth/
        │   └── mail/
        └── routes/
            ├── health.js
            └── root.js
```

## 1. Install Dependencies

Open two terminals.

### Client

```bash
cd client
npm install
```

### Server

```bash
cd server
npm install
```

### Admin interface

```bash
cd admin_interface
npm install
```

## 2. Run The Apps

### Start the server

```bash
cd server
npm run dev
```

The API will run on `http://localhost:5000`.

### Start the client

```bash
cd client
npm run dev
```

The frontend will run on `http://localhost:5173`.

### Start the admin interface

```bash
cd admin_interface
npm run dev
```

The admin frontend will run on `http://localhost:5174`.

## Auth Flow

- Client login uses `POST /auth/client/request-otp`, then `POST /auth/client/login` with email, password, and OTP.
- Member login uses `POST /auth/member/login` with email and password only.
- Admin member invites use `POST /admin/members` with the `x-admin-secret` header.
- Admin client onboarding uses `POST /admin/clients` with multipart form data, uploads the signed agreement document to Cloudinary, creates a client without password, and sends a client set-password email.
- Admin projects use `POST /admin/projects` and `GET /admin/projects`.
- Admin can open a project with `GET /admin/projects/:projectId` and assign active members with `PUT /admin/projects/:projectId/members`.
- Members can list assigned projects with `GET /member/projects`, open one with `GET /member/projects/:projectId`, and raise tickets with `POST /member/projects/:projectId/tickets`.
- Invited members receive a set-password link for `/set-password?token=...` in `admin_interface`.
- Invited clients receive a set-password link for `/set-password?role=client&token=...` in `admin_interface`.
- Client data is stored in the `Client` schema. Member data is stored in the `Member` schema.

## 3. Environment Files

### `client/.env`

```env
VITE_API_URL=http://localhost:5000
```

### `server/.env`

```env
PORT=5000
HOST=0.0.0.0
NODE_ENV=development
MONGO_URI=mongodb://127.0.0.1:27017/orbitdesk
JWT_SECRET=change-this-secret
CRON_SECRET=change-this-cron-secret
CLIENT_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:5174
ADMIN_API_SECRET=change-this-admin-secret
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_AGREEMENT_FOLDER=orbitdesk/agreements
RESEND_API_KEY=
RESEND_FROM=OrbitDesk <onboarding@resend.dev>
```

### `admin_interface/.env`

```env
VITE_API_URL=http://localhost:5000
VITE_ADMIN_API_SECRET=change-this-admin-secret
```

## 4. Deploy On Render

This repo now includes [render.yaml](./render.yaml) for a three-service Render deployment:

- `orbitdesk-server` for the Fastify API
- `orbitdesk-client` for the member/client login app
- `orbitdesk-admin` for the admin interface

Import the repo into Render and choose the Blueprint deployment flow. Before the first production deploy, set these secret env vars in Render:

- `MONGO_URI`
- `JWT_SECRET`
- `CRON_SECRET`
- `ADMIN_API_SECRET`
- `CLOUDINARY_CLOUD_NAME`
- `CLOUDINARY_API_KEY`
- `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`
- `VITE_ADMIN_API_SECRET`

Production notes:

- Update the default `onrender.com` URLs in `render.yaml` if you want different service names or custom domains.
- `ALLOWED_ORIGINS` must contain the final client and admin URLs so browser requests reach the API.
- Both static apps include SPA rewrites to `index.html`, which is required for paths like `/member/projects/:id` and `/set-password`.
- Schedule an hourly cron request to `POST https://orbitdesk-server.onrender.com/internal/jobs/ticket-due-reminders` with `Authorization: Bearer <CRON_SECRET>` to send one-time due-soon ticket reminders.
- In local non-production use, the reminder job can be called from `localhost` without `CRON_SECRET`. In production, `CRON_SECRET` is still required.

## 5. Deploy On Vercel

Do not deploy the repo root as one Vercel project. This repository contains three separate apps:

- `client/` for the member/client frontend
- `admin_interface/` for the admin frontend
- `server/` for the Fastify API

Recommended setup:

- Create one Vercel project with `Root Directory` set to `client`
- Create another Vercel project with `Root Directory` set to `admin_interface`
- Keep `server/` on a Node host such as Render, Railway, or VPS unless you explicitly refactor it for Vercel serverless deployment

Both frontend apps now include `vercel.json` with an SPA rewrite to `index.html`, which prevents `Not Found` on direct URLs such as:

- `/member/projects`
- `/client/dashboard`
- `/set-password`

Set these environment variables in Vercel:

### `client`

```env
VITE_API_URL=https://your-api-domain.example
```

### `admin_interface`

```env
VITE_API_URL=https://your-api-domain.example
VITE_ADMIN_API_SECRET=change-this-admin-secret
```

If you still see `Not Found` after that, check that the Vercel project is pointed at `client/` or `admin_interface/` instead of the repository root.

## Notes

- The client uses React + Vite + Tailwind CSS.
- The server uses Fastify with a small, easy-to-follow folder structure.
- The client already includes a sample fetch to the Fastify API.
