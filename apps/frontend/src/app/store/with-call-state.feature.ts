import { computed } from '@angular/core';
import { signalStoreFeature, withComputed, withState } from '@ngrx/signals';

export type CallState = 'init' | 'loaded' | 'loading' | { error: string };

export interface CallStateSlice {
  callState: CallState;
}

export function withCallState() {
  return signalStoreFeature(
    withState<CallStateSlice>({ callState: 'init' }),
    withComputed(({ callState }) => ({
      loading: computed(() => callState() === 'loading'),
      loaded: computed(() => callState() === 'loaded'),
      error: computed(() => {
        const state = callState();
        return typeof state === 'object' ? state.error : null;
      }),
    })),
  );
}

export function setLoading(): CallStateSlice {
  return { callState: 'loading' };
}

export function setLoaded(): CallStateSlice {
  return { callState: 'loaded' };
}

export function setError(error: string): CallStateSlice {
  return { callState: { error } };
}
