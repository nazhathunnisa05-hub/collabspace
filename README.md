# CollabSpace – Real-Time Collaborative Workspace

CollabSpace is a full-stack collaborative workspace where users can create workspaces, manage members, edit documents, collaborate in real time, leave comments, and restore previous document versions.

## Features

- User registration and login with JWT authentication.
- Workspace creation and management.
- Member invitations by registered email.
- Role-based access control: Owner, Admin, Editor, Commenter, and Viewer.
- Document creation and rich-text editing with TipTap.
- Real-time collaborative editing using Yjs and Hocuspocus.
- Live synchronization using WebSockets.
- Redis support for cross-instance collaboration.
- Comments on documents.
- Document version history and restoration.
- PostgreSQL database with Prisma ORM.

## Tech Stack

| Category | Technologies |
|---|---|
| Frontend | Next.js, React, TypeScript, Tailwind CSS |
| Backend | Next.js API Routes, Node.js |
| Database | PostgreSQL, Prisma ORM |
| Authentication | JWT, bcrypt |
| Rich Text Editor | TipTap |
| Collaboration | Yjs, Hocuspocus, WebSockets |
| Cache / Pub-Sub | Redis |
| Icons | Lucide React |

## Getting Started

### 1. Clone the repository

```bash
git clone https://github.com/nazhathunnisa05-hub/collabspace.git
cd collabspace
```

### 2. Install dependencies

```bash
npm install
```

### 3. Configure environment variables

Create a `.env` file in the project root. Configure the PostgreSQL connection, authentication secret, and any other environment variables required by the application.

Do not commit your `.env` file or share your secrets publicly.

### 4. Set up the database

Configure PostgreSQL and run:

```bash
npx prisma migrate deploy
npx prisma generate
```

For a fresh development database where migrations need to be created, use the project's development migration workflow instead.

### 5. Start Redis

Make sure Redis is running on the address configured by the collaboration server.

For local Docker development:

```bash
docker run -d --name collabspace-redis -p 6379:6379 redis:7-alpine
```

### 6. Start the application

Start the Next.js application:

```bash
npm run dev
```

In a second terminal, start the collaboration server:

```bash
npm run collab
```

Open http://localhost:3000 in your browser.

## Available Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start Next.js development server |
| `npm run build` | Build the production application |
| `npm run start` | Start the production application |
| `npm run lint` | Run ESLint |
| `npm run collab` | Start the Hocuspocus collaboration server |

## Project Structure

```text
collabspace/
├── app/
│   ├── api/
│   ├── dashboard/
│   ├── login/
│   ├── register/
│   ├── pages/
│   └── workspaces/
├── collaboration/
│   └── server.ts
├── prisma/
│   └── schema.prisma
├── src/
│   └── components/
├── package.json
└── README.md
```

## Security

- Environment secrets are excluded from version control.
- Passwords are hashed before storage.
- Protected API routes use authentication.
- Workspace permissions are enforced through member roles.

## Author

**Nazhath Unnisa**

- GitHub: [nazhathunnisa05-hub](https://github.com/nazhathunnisa05-hub)
- LinkedIn: [Nazhath Unnisa](https://www.linkedin.com/in/nazhath-unnisa-8536b3398/)

---

Developed as a full-stack real-time collaborative workspace project.