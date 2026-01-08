# Testing & Quality Assurance

SubVersio maintains high code quality through automated testing, linting, and formatting.

## Quality Pipeline

You can run the full quality check (Build, Test, Format, Lint) locally:

**Windows:**

```powershell
./quality-check.bat
```

**Linux/Mac:**

```bash
./quality-check.sh
```

## Individual Commands

All commands are executed from the **root directory**.

### 🧪 Unit Testing (Jest)

We use Jest for both frontend and backend testing.

- **Run all tests**: `npm test`
- **Backend only**: `npm run test:backend`
- **Frontend only**: `npm run test:frontend`

### ✨ Linting (ESLint)

We use ESLint 9 with the Flat Config system.

- **Check linting**: `npm run lint`

### 🎨 Formatting (Prettier)

- **Fix formatting**: `npm run format`

## CI/CD integration

The project includes GitHub Actions workflows in `.github/workflows/` that automatically run these checks on every Pull Request and Push to `main`.
