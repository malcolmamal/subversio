import { computed, inject } from '@angular/core';
import { patchState, signalStore, withComputed, withHooks, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, tap, catchError, EMPTY } from 'rxjs';
import { SubtitleService } from '../services/subtitle.service';
import { ToastService } from '../services/toast.service';
import { Subtitle } from '../models/subtitle.model';
import { withCallState, setLoading, setLoaded, setError } from './with-call-state.feature';

interface SubtitlesState {
  subtitles: Subtitle[];
  total: number;
  page: number;
  limit: number;
  selectedId: string | null;
}

const initialState: SubtitlesState = {
  subtitles: [],
  total: 0,
  page: 1,
  limit: 10,
  selectedId: null,
};

export const SubtitlesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withCallState(),
  withComputed((store) => ({
    selectedSubtitle: computed(() => store.subtitles().find((s: Subtitle) => s.id === store.selectedId()) || null),
  })),
  withMethods((store, subtitleService = inject(SubtitleService), toastService = inject(ToastService)) => ({
    loadAll: rxMethod<{ page: number; limit: number }>(
      pipe(
        tap(() => patchState(store, setLoading())),
        switchMap(({ page, limit }) =>
          subtitleService.getSubtitles(page, limit).pipe(
            tap({
              next: (response) => {
                patchState(store, {
                  subtitles: response.subtitles,
                  total: response.total,
                  page: response.page,
                  limit: response.limit,
                });
                patchState(store, setLoaded());
              },
              error: (err) => {
                patchState(store, setError(err.message));
              },
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    ),

    listenToEvents: rxMethod<void>(
      pipe(
        switchMap(() =>
          subtitleService.getSubtitleEvents().pipe(
            tap((event: any) => {
              patchState(store, (state: any) => ({
                subtitles: state.subtitles.map((s: Subtitle) =>
                  s.id === event.subtitleId ? { ...s, progress: event.progress, status: event.status } : s,
                ),
              }));
              // If the subtitle just finished, we might want to reload it fully to get set path
              if (event.status === 'COMPLETED') {
                toastService.success(`Translation finished for ${event.subtitleId}`);
                subtitleService.getSubtitle(event.subtitleId).subscribe((updated) => {
                  patchState(store, (state: any) => ({
                    subtitles: state.subtitles.map((s: Subtitle) => (s.id === event.subtitleId ? updated : s)),
                  }));
                });
              }
              if (event.status === 'ERROR') {
                toastService.error(`Translation failed for ${event.subtitleId}`);
              }
            }),
            catchError((err) => {
              console.error('SSE Error:', err);
              return EMPTY;
            }),
          ),
        ),
      ),
    ),

    deleteSubtitle: rxMethod<string>(
      pipe(
        switchMap((id) =>
          subtitleService.deleteSubtitle(id).pipe(
            tap({
              next: () => {
                patchState(store, (state: any) => ({
                  subtitles: state.subtitles.filter((s: Subtitle) => s.id !== id),
                  total: Math.max(0, state.total - 1),
                  selectedId: state.selectedId === id ? null : state.selectedId,
                }));
                toastService.success('Subtitle deleted');
              },
              error: (err: any) => {
                patchState(store, setError(err.message));
                toastService.error(`Delete failed: ${err.message}`);
              },
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    ),

    renameSubtitle: rxMethod<{ id: string; name: string }>(
      pipe(
        switchMap(({ id, name }) =>
          subtitleService.renameSubtitle(id, name).pipe(
            tap({
              next: (updatedSubtitle: any) => {
                patchState(store, (state: any) => ({
                  subtitles: state.subtitles.map((s: Subtitle) => (s.id === id ? updatedSubtitle : s)),
                }));
                toastService.success('Subtitle renamed');
              },
              error: (err: any) => {
                patchState(store, setError(err.message));
                toastService.error(`Rename failed: ${err.message}`);
              },
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    ),

    upload: rxMethod<{ file: File; name?: string; sourceLanguage?: string }>(
      pipe(
        tap(() => patchState(store, setLoading())),
        switchMap(({ file, name, sourceLanguage }) =>
          subtitleService.uploadSubtitle(file, name, sourceLanguage).pipe(
            tap({
              next: (subtitle: any) => {
                patchState(store, (state: any) => ({
                  subtitles: [subtitle, ...state.subtitles],
                  total: state.total + 1,
                }));
                patchState(store, setLoaded());
                toastService.success('Subtitle uploaded successfully');
              },
              error: (err: any) => {
                patchState(store, setError(err.message));
                toastService.error(`Upload failed: ${err.message}`);
              },
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    ),

    translate: rxMethod<{ id: string; targetLanguage: string }>(
      pipe(
        switchMap(({ id, targetLanguage }) =>
          subtitleService.translateSubtitle(id, targetLanguage).pipe(
            tap({
              next: () => {
                patchState(store, (state: any) => ({
                  subtitles: state.subtitles.map((s: Subtitle) =>
                    s.id === id ? { ...s, status: 'TRANSLATING' as any, progress: 0, targetLanguage } : s,
                  ),
                }));
                toastService.info('Translation started');
              },
              error: (err: any) => {
                patchState(store, setError(err.message));
                toastService.error(`Translation failed: ${err.message}`);
              },
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    ),

    restartTranslation: rxMethod<string>(
      pipe(
        switchMap((id) =>
          subtitleService.restartTranslation(id).pipe(
            tap({
              next: () => {
                patchState(store, (state: any) => ({
                  subtitles: state.subtitles.map((s: Subtitle) =>
                    s.id === id ? { ...s, status: 'TRANSLATING' as any, progress: 0 } : s,
                  ),
                }));
              },
              error: (err: any) => patchState(store, setError(err.message)),
            }),
            catchError(() => EMPTY),
          ),
        ),
      ),
    ),

    selectSubtitle: (id: string | null) => {
      patchState(store, { selectedId: id });
    },
  })),
  withHooks({
    onInit(store) {
      store.listenToEvents();
    },
  }),
);
