# Refactoring Plan - SubVersio

This document outlines 5 key refactoring phases to improve the quality, scalability, and maintainability of the SubVersio application.

## Phase 1: Modular Architecture & Dependency Injection [DONE]

**Goal**: Transform the backend from a monolithic `index.ts` into a structured layered architecture.

- [x] Split `index.ts` into dedicated `routes/` and `controllers/`.
- [x] Implement a proper Repository pattern for Prisma access to decouple database logic from services.
- [x] Leverage Dependency Injection (DI) consistently across all services.
- [x] Establish a global Error Handling middleware to remove `try/catch` boilerplate from routes.

## Phase 2: From Polling to Real-Time (SSE) [DONE]

**Goal**: Replace the inefficient HTTP polling with Server-Sent Events (SSE) for real-time progress updates.

- [x] Implement an SSE endpoint in the backend (`/api/subtitles/events`) that streams progress updates.
- [x] Update `TranslationService` to emit events via an `EventEmitter` that the SSE controller listens to.
- [x] Refactor `SubtitlesStore` on the frontend to subscribe to the SSE stream instead of using polling.

## Phase 3: Robust Subtitle Processing [DONE]

**Goal**: Improve the reliability of subtitle parsing and splitting.

- [x] Replace manual string splitting with a robust parser library (`subtitle`).
- [x] Implement support for more formats (SRT, VTT, TXT).
- [x] Add advanced chunking logic that respects cue boundaries.
- [ ] Implement "Dry Run" mode to estimate translation cost/time.

## Phase 4: Cloud Readiness & Global State [DONE]

**Goal**: Prepare the application for deployment beyond a single local machine.

- [x] Abstract the File Storage layer to support Azure Blob Storage or AWS S3 instead of the local `uploads/` folder.
- [ ] Externalize the Mutex lock into a Redis-based distributed lock if multiple backend instances are needed.
- [x] Implement a "Process Registry" to track active translations across restarts.

## Phase 5: UX Polish & Observability [DONE]

**Goal**: Improve the user experience and developer troubleshooting.

- [x] **Frontend**: Add a notification system (Toasts) for Success/Error events.
- [x] **Frontend**: Implement a "Diff" view to compare original vs. translated segments.
- [ ] **Backend**: Integrate OpenTelemetry or Azure Application Insights for better tracing of AI requests.
- [ ] **Quality**: Increase E2E test coverage using Playwright or Cypress.
