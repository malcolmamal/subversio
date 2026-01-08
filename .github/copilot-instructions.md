# SubVersio Project Rules & Standards

## Development Principles

### General Standards

- **Clean Code**: Follow typical TypeScript/Angular best practices.
- **Self-Documenting Code**: Code should be readable and explain "What" it does through naming.
- **Comments**: Only add comments to explain "Why" a specific logic exists, especially if it's non-obvious or a workaround.
- **No Trivial Comments**: Avoid comments like `// Get the user` or `// Set loading to true`.

### Component Architecture (Frontend)

- **Separation of Concerns**: Strictly separate presentational (dumb) components from container (smart) components.
- **Dumb Components**: Located in `components/`. They receive data via `input()` and emit via `output()`. No service injections.
- **Smart Components**: Handle state, stores, and services. Usually located in `pages/` or the root of a feature.

### Angular Modern Patterns

- **Signals**: Use `input()`, `output()`, and `model()` signals.
- **Control Flow**: Use new control flow (`@if`, `@for`, `@switch`).
- **Dependency Injection**: Use `inject()` function instead of constructor injection.
- **Standalone**: All components should be standalone.
- **OnPush**: Change detection should be `ChangeDetectionStrategy.OnPush`.

### Naming Conventions

- **Files**: `kebab-case`.
- **Classes**: `PascalCase`.
- **Methods**: `camelCase`.
- **Constants**: `UPPER_SNAKE_CASE`.

## Automated Workspace Tasks

### Restricted Actions

- **DO NOT START APPS**: You are allowed to build, lint, and test the application, but **never start the dev servers** (e.g., `npm run dev:frontend`, `ng serve`, `npm run start`). The developer is responsible for starting and stopping the applications.

### Quality Pipeline

Always run these checks after modifying source code:

1. **Linting**: `npm run lint` - Ensure no new warnings or errors are introduced.
2. **Testing**: `npm test` - Ensure all backend and frontend tests pass.
3. **Building**: `npm run build` - Verify the project compiles correctly.
4. **Formatting**: `npm run format` - Keep the codebase consistent with Prettier.

## Workspace Management

- **Monorepo**: This is an NPM Workspaces project. All commands should be run from the root directory unless explicitly requested otherwise.
- **Environment Variables**: Managed local to each app via `.env` files. Ensure `.env.dist` is updated if new variables are added.
