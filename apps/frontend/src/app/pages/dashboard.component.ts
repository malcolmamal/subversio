import { Component, effect, inject, signal } from '@angular/core';
import { SubtitlesStore } from '../store/subtitles.store';
import { NavbarComponent } from '../components/navbar.component';
import { DropZoneComponent } from '../components/drop-zone.component';
import { SubtitleItemComponent } from '../components/subtitle-item.component';
import { PaginationComponent } from '../components/pagination.component';
import { SubtitleService } from '../services/subtitle.service';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { Subtitle } from '../models/subtitle.model';

@Component({
  selector: 'sv-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    TranslateModule, 
    LucideAngularModule, 
    NavbarComponent, 
    DropZoneComponent, 
    SubtitleItemComponent, 
    PaginationComponent
  ],
  template: `
    <div [class.dark]="isDarkMode()" class="min-h-screen">
      <div class="bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-slate-100 min-h-screen flex flex-col">
        <sv-navbar [isDarkMode]="isDarkMode()" [currentLang]="currentLang()" (toggleTheme)="toggleTheme()" (setLang)="setLanguage($event)"></sv-navbar>
        
        <main class="flex-grow container mx-auto px-4 py-8 max-w-4xl">
          <section class="mb-8">
            <h1 class="text-3xl font-extrabold mb-2 tracking-tight">{{ 'DASHBOARD.TITLE' | translate }}</h1>
            <p class="text-slate-500 mb-6">{{ 'DASHBOARD.SUBTITLE' | translate }}</p>
            
            <sv-drop-zone (fileUploaded)="onFileUploaded($event)"></sv-drop-zone>
          </section>

          <section>
            <div class="flex items-center justify-between mb-4">
              <h2 class="text-xl font-bold italic">{{ 'DASHBOARD.LIBRARY' | translate }}</h2>
              @if (store.loading()) {
                <lucide-icon name="loader-2" class="w-5 h-5 animate-spin text-indigo-600"></lucide-icon>
              }
            </div>

            <div class="space-y-3 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
              @for (subtitle of store.subtitles(); track subtitle.id) {
                <sv-subtitle-item 
                  [subtitle]="subtitle"
                  (translate)="openTranslateDialog($event)"
                  (download)="downloadSubtitle($event)"
                ></sv-subtitle-item>
              } @empty {
                @if (!store.loading()) {
                  <div class="text-center py-12 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700">
                    <lucide-icon name="file-text" class="w-12 h-12 mx-auto mb-3 text-slate-300"></lucide-icon>
                    <p class="text-slate-500">{{ 'DASHBOARD.EMPTY' | translate }}</p>
                  </div>
                }
              }
            </div>

            <sv-pagination 
              [page]="store.page()" 
              [total]="store.total()" 
              [limit]="store.limit()"
              (changePage)="onPageChange($event)"
            ></sv-pagination>
          </section>
        </main>

        @if (showTranslateModal()) {
          <div class="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div class="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-sm border border-slate-200 dark:border-slate-700">
              <h3 class="text-lg font-bold mb-4">{{ 'MODAL.CHOOSE_LANG' | translate }}</h3>
              <div class="grid grid-cols-2 gap-3 mb-6">
                @for (lang of targetLanguages; track lang.code) {
                  <button (click)="selectedTargetLang = lang.code" 
                    class="flex items-center space-x-3 p-3 rounded-lg border transition-all" 
                    [class.border-indigo-600]="selectedTargetLang === lang.code" 
                    [class.bg-indigo-50]="selectedTargetLang === lang.code" 
                    [class.dark:bg-indigo-900]="selectedTargetLang === lang.code" 
                    [class.border-slate-200]="selectedTargetLang !== lang.code" 
                    [class.dark:border-slate-700]="selectedTargetLang !== lang.code">
                    <span class="text-2xl">{{ lang.flag }}</span>
                    <span class="text-sm font-medium">{{ lang.name }}</span>
                  </button>
                }
              </div>
              <div class="flex space-x-3">
                <button (click)="showTranslateModal.set(false)" class="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700">
                  {{ 'MODAL.CANCEL' | translate }}
                </button>
                <button (click)="confirmTranslation()" [disabled]="!selectedTargetLang" class="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50">
                  {{ 'MODAL.START' | translate }}
                </button>
              </div>
            </div>
          </div>
        }
      </div>
    </div>
  `
})
export class DashboardComponent {
  readonly store = inject(SubtitlesStore);
  private subtitleService = inject(SubtitleService);
  private translateService = inject(TranslateService);

  isDarkMode = signal(false);
  currentLang = signal('en');
  showTranslateModal = signal(false);
  subtitleToTranslate: Subtitle | null = null;
  selectedTargetLang: string | null = null;

  targetLanguages = [
    { code: 'polish', name: 'Polish', flag: '🇵🇱' },
    { code: 'english', name: 'English', flag: '🇺🇸' },
    { code: 'spanish', name: 'Spanish', flag: '🇪🇸' },
    { code: 'german', name: 'German', flag: '🇩🇪' },
    { code: 'french', name: 'French', flag: '🇫🇷' },
    { code: 'italian', name: 'Italian', flag: '🇮🇹' }
  ];

  constructor() {
    this.store.loadAll({ page: 1, limit: 10 });
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'dark') this.isDarkMode.set(true);
  }

  toggleTheme() {
    this.isDarkMode.update(v => !v);
    localStorage.setItem('theme', this.isDarkMode() ? 'dark' : 'light');
  }

  setLanguage(lang: string) {
    this.currentLang.set(lang);
    this.translateService.use(lang);
  }

  onFileUploaded(event: { file: File, detectedLang: string }) {
    this.store.upload({ file: event.file, sourceLanguage: event.detectedLang });
  }

  onPageChange(page: number) {
    this.store.loadAll({ page, limit: this.store.limit() });
  }

  openTranslateDialog(subtitle: Subtitle) {
    this.subtitleToTranslate = subtitle;
    this.showTranslateModal.set(true);
  }

  confirmTranslation() {
    if (this.subtitleToTranslate && this.selectedTargetLang) {
      this.store.translate({ 
        id: this.subtitleToTranslate.id, 
        targetLanguage: this.selectedTargetLang 
      });
      this.showTranslateModal.set(false);
      this.selectedTargetLang = null;
      this.subtitleToTranslate = null;
    }
  }

  downloadSubtitle(subtitle: Subtitle) {
    if (subtitle.translatedFilePath) {
      const url = this.subtitleService.getDownloadUrl(subtitle.translatedFilePath);
      window.open(url, '_blank');
    }
  }
}

