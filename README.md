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
CLIENT_URL=http://localhost:5173
ADMIN_URL=http://localhost:5174
ADMIN_API_SECRET=change-this-admin-secret
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
CLOUDINARY_AGREEMENT_FOLDER=orbitdesk/agreements
SMTP_HOST=
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=
SMTP_PASS=
SMTP_FROM=OrbitDesk <no-reply@orbitdesk.local>
```

### `admin_interface/.env`

```env
VITE_API_URL=http://localhost:5000
VITE_ADMIN_API_SECRET=change-this-admin-secret
```

## Notes

- The client uses React + Vite + Tailwind CSS.
- The server uses Fastify with a small, easy-to-follow folder structure.
- The client already includes a sample fetch to the Fastify API.
