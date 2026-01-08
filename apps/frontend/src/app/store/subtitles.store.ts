import { computed, inject } from '@angular/core';
import { tapResponse } from '@ngrx/operators';
import { patchState, signalStore, withComputed, withMethods, withState } from '@ngrx/signals';
import { rxMethod } from '@ngrx/signals/rxjs-interop';
import { pipe, switchMap, interval, takeWhile, tap, catchError, EMPTY } from 'rxjs';
import { SubtitleService } from '../services/subtitle.service';
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
  selectedId: null
};

export const SubtitlesStore = signalStore(
  { providedIn: 'root' },
  withState(initialState),
  withCallState(),
  withComputed((store) => ({
    selectedSubtitle: computed(() => 
      store.subtitles().find((s: Subtitle) => s.id === store.selectedId()) || null
    )
  })),
  withMethods((store, subtitleService = inject(SubtitleService)) => ({
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
                  limit: response.limit 
                });
                patchState(store, setLoaded());
              },
              error: (err) => {
                patchState(store, setError(err.message));
              }
            }),
            catchError(() => EMPTY)
          )
        )
      )
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
                  total: state.total + 1
                }));
                patchState(store, setLoaded());
              },
              error: (err: any) => patchState(store, setError(err.message))
            }),
            catchError(() => EMPTY)
          )
        )
      )
    ),

    translate: rxMethod<{ id: string; targetLanguage: string }>(
      pipe(
        switchMap(({ id, targetLanguage }) => 
          subtitleService.translateSubtitle(id, targetLanguage).pipe(
            tap({
              next: () => {
                patchState(store, (state: any) => ({
                  subtitles: state.subtitles.map((s: Subtitle) => 
                    s.id === id ? { ...s, status: 'TRANSLATING' as any, progress: 0, targetLanguage } : s
                  )
                }));
              },
              error: (err: any) => patchState(store, setError(err.message))
            }),
            catchError(() => EMPTY)
          )
        )
      )
    ),

    pollProgress: rxMethod<string>(
      pipe(
        switchMap((id) => 
          interval(2000).pipe(
            switchMap(() => subtitleService.getSubtitle(id)),
            tap((subtitle: any) => {
              patchState(store, (state: any) => ({
                subtitles: state.subtitles.map((s: Subtitle) => 
                  s.id === id ? subtitle : s
                )
              }));
            }),
            takeWhile((subtitle: any) => subtitle.status === 'TRANSLATING', true)
          )
        )
      )
    ),

    selectSubtitle: (id: string | null) => {
      patchState(store, { selectedId: id });
    }
  }))
);
