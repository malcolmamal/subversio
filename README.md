# SubVersio 🎬

SubVersio is an intelligent subtitle translation tool that leverages Gemini AI to accurately translate subtitles while preserving original timing and metadata.

## 🚀 Tech Stack

### Backend

- **Node.js & Express 5**: Modern server-side framework.
- **TypeScript**: Typed JavaScript for better developer experience.
- **Prisma**: Type-safe ORM for database management.
- **SQLite**: Lightweight, file-based database.
- **Google Gemini AI**: SOTA AI models for contextual translation.

### Frontend

- **Angular 18**: Latest version of the Angular framework.
- **NgRx Signal Store**: Reactive state management with Signals.
- **Tailwind CSS**: Utility-first CSS framework for rapid UI development.
- **Lucide Icons**: Clean and consistent icon set.

### Tooling & CI/CD

- **NPM Workspaces**: Monorepo management.
- **Jest**: Comprehensive unit testing.
- **ESLint 9**: Modern linting configuration (Flat Config).
- **GitHub Actions**: Automated quality pipelines.

## 📖 Documentation

- [Getting Started & Running](docs/RUNNING.md)
- [Testing & Quality Checks](docs/TESTING.md)
- [Database Management](docs/DATABASE.md)

## 🛠️ Quick Start

1. **Install Dependencies**:

   ```bash
   npm install
   ```

2. **Set up Backend Environment**:
   Create `apps/backend/.env` with:
   - `GOOGLE_API_KEY`
   - `DATABASE_URL="file:./prisma/dev.db"`

3. **Initialize Database**:

   ```bash
   npm run prisma:init
   ```

4. **Run Development Mode**:
   ```bash
   # Terminal 1
   npm run dev:backend
   # Terminal 2
   npm run dev:frontend
   ```

## Crash/Resume Behavior

- Subtitle files and metadata are persisted in SQLite (`apps/backend/prisma/dev.db`) and the uploads folder.
- If the backend crashes during translation, any in-progress jobs are marked as `ERROR` on restart.
- You can resume by clicking Retry/Restart in the UI; there is no pause/resume yet.

## ✅ Quality Pipeline

Before committing, ensure everything is correct:

```bash
./quality-check.bat (Windows)
# OR
./quality-check.sh (Linux/Mac)
```
