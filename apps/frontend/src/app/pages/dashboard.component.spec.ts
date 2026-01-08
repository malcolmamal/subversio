import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DashboardComponent } from './dashboard.component';
import { SubtitlesStore } from '../store/subtitles.store';
import { SubtitleService } from '../services/subtitle.service';
import { TranslateModule } from '@ngx-translate/core';
import { signal, NO_ERRORS_SCHEMA } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';

describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  let mockStore: any;
  let mockSubtitleService: any;
  let mockRouter: any;

  beforeEach(async () => {
    mockStore = {
      subtitles: signal([]),
      loading: signal(false),
      page: signal(1),
      total: signal(0),
      limit: signal(10),
      loadAll: jest.fn(),
      deleteSubtitle: jest.fn(),
      renameSubtitle: jest.fn(),
      setPage: jest.fn(),
      upload: jest.fn(),
      translate: jest.fn(),
      restartTranslation: jest.fn(),
    };

    mockSubtitleService = {
      downloadSubtitle: jest.fn(),
    };

    mockRouter = {
      navigate: jest.fn(),
    };

    // Mock confirm
    window.confirm = jest.fn().mockReturnValue(true);

    await TestBed.configureTestingModule({
      imports: [TranslateModule.forRoot()],
      providers: [
        { provide: SubtitlesStore, useValue: mockStore },
        { provide: SubtitleService, useValue: mockSubtitleService },
        { provide: Router, useValue: mockRouter },
      ],
    })
      .overrideComponent(DashboardComponent, {
        set: {
          imports: [CommonModule, TranslateModule],
          schemas: [NO_ERRORS_SCHEMA],
        },
      })
      .compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(mockStore.loadAll).toHaveBeenCalled();
  });

  it('should handle file upload', () => {
    const file = new File([''], 'test.srt');
    component.onFileUploaded({ file, detectedLang: 'en' });
    expect(mockStore.upload).toHaveBeenCalledWith({ file, sourceLanguage: 'en' });
  });

  it('should navigate to compare page', () => {
    const subtitle = { id: '1', name: 'test.srt' };
    component.onCompare(subtitle as any);
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/subtitles', '1', 'compare']);
  });

  it('should open translate modal', () => {
    const subtitle = { id: '1', name: 'test.srt' };
    component.openTranslateDialog(subtitle as any);
    expect(component.showTranslateModal()).toBe(true);
    expect(component.subtitleToTranslate?.id).toBe('1');
  });

  it('should call delete on store', () => {
    component.onDelete('1');
    expect(mockStore.deleteSubtitle).toHaveBeenCalledWith('1');
  });
});
