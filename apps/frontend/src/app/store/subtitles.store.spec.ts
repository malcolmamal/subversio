import { TestBed } from '@angular/core/testing';
import { SubtitlesStore } from './subtitles.store';
import { SubtitleService } from '../services/subtitle.service';
import { of, throwError } from 'rxjs';
import { Subtitle } from '../models/subtitle.model';

import { patchState } from '@ngrx/signals';

describe('SubtitlesStore', () => {
  let store: any;
  let subtitleServiceMock: jest.Mocked<SubtitleService>;

  beforeEach(() => {
    subtitleServiceMock = {
      getSubtitles: jest.fn(),
      uploadSubtitle: jest.fn(),
      translateSubtitle: jest.fn(),
      getSubtitle: jest.fn(),
      getSubtitleEvents: jest.fn().mockReturnValue(of()),
      renameSubtitle: jest.fn(),
      deleteSubtitle: jest.fn(),
      restartTranslation: jest.fn(),
    } as any;

    TestBed.configureTestingModule({
      providers: [{ provide: SubtitleService, useValue: subtitleServiceMock }, SubtitlesStore],
    });

    store = TestBed.inject(SubtitlesStore);
  });

  it('should have initial state', () => {
    expect(store.subtitles()).toEqual([]);
    expect(store.total()).toBe(0);
    expect(store.page()).toBe(1);
    expect(store.loading()).toBe(false);
  });

  it('should load subtitles successfully', () => {
    const mockResponse = {
      subtitles: [{ id: '1', name: 'test.srt' } as Subtitle],
      total: 1,
      page: 1,
      limit: 10,
    };
    subtitleServiceMock.getSubtitles.mockReturnValue(of(mockResponse));

    store.loadAll({ page: 1, limit: 10 });

    expect(store.subtitles()).toEqual(mockResponse.subtitles);
    expect(store.total()).toBe(1);
    expect(store.loading()).toBe(false);
  });

  it('should handle error when loading subtitles', () => {
    subtitleServiceMock.getSubtitles.mockReturnValue(throwError(() => new Error('Server error')));

    store.loadAll({ page: 1, limit: 10 });

    expect(store.error()).toBe('Server error');
    expect(store.loading()).toBe(false);
  });

  it('should update status when translation starts', () => {
    const initialSubtitle = { id: '1', name: 'test.srt', status: 'UPLOADED' } as Subtitle;
    // Set initial state
    patchState(store, { subtitles: [initialSubtitle] });

    subtitleServiceMock.translateSubtitle.mockReturnValue(of({ message: 'Started' }));

    store.translate({ id: '1', targetLanguage: 'Spanish' });

    const updated = store.subtitles().find((s: Subtitle) => s.id === '1');
    expect(updated?.status).toBe('TRANSLATING');
    expect(updated?.targetLanguage).toBe('Spanish');
  });

  it('should rename subtitle and update store', () => {
    const initialSubtitle = { id: '1', name: 'Old Name' } as Subtitle;
    patchState(store, { subtitles: [initialSubtitle] });

    const updatedSubtitle = { id: '1', name: 'New Name' } as Subtitle;
    subtitleServiceMock.renameSubtitle.mockReturnValue(of(updatedSubtitle));

    store.renameSubtitle({ id: '1', name: 'New Name' });

    expect(store.subtitles()[0].name).toBe('New Name');
  });
});
