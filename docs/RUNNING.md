# Running SubVersio

This document explains how to set up and run the SubVersio application locally.

## Prerequisites

- **Node.js**: v18 or higher recommended.
- **NPM**: v9 or higher (supports workspaces).
- **Gemini AI API Key**: Required for translating subtitles.

## Installation

1. Clone the repository.
2. Install dependencies from the root directory:
   ```bash
   npm install
   ```

## Environment Configuration

The backend application loads environment variables from `apps/backend/.env`.

### Backend Settings

Create a `.env` file in `apps/backend/.env` (see `.env.dist` for template):

```env
PORT=4040
DATABASE_URL="file:./dev.db"
GOOGLE_API_KEY=your_api_key_here
GEMINI_FLASH_MODEL=gemini-2.0-flash
```

## Development Commands

Run these from the **root directory**:

### Run Backend

```bash
npm run dev:backend
```

The backend will start on `http://localhost:4040`.

### Run Frontend

```bash
npm run dev:frontend
```

The frontend will start on `http://localhost:4200`.

### Run Both Simultaneously

You can open two terminals or use a tool like `concurrently` (if installed):

```bash
# Terminal 1
npm run dev:backend
# Terminal 2
npm run dev:frontend
```

## Production Build

To build both applications for production:

```bash
npm run build
```

Outputs will be in:

- Backend: `apps/backend/dist`
- Frontend: `apps/frontend/dist/frontend`
