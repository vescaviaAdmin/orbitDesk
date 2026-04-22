# orbitDesk Starter

A beginner-friendly full-stack starter with:

- `client/` for the React frontend
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
```

## Notes

- The client uses React + Vite + Tailwind CSS.
- The server uses Fastify with a small, easy-to-follow folder structure.
- The client already includes a sample fetch to the Fastify API.
