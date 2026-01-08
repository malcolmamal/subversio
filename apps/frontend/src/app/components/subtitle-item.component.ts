import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Subtitle } from '../models/subtitle.model';
import { LucideAngularModule } from 'lucide-angular';
import { CommonModule } from '@angular/common';
import { TranslateModule } from '@ngx-translate/core';

@Component({
  selector: 'sv-subtitle-item',
  standalone: true,
  imports: [LucideAngularModule, CommonModule, TranslateModule],
  template: `
    <div
      class="flex items-center justify-between p-4 bg-white dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-slate-700 hover:shadow-md transition-shadow"
    >
      <div class="flex items-center space-x-4 shrink-0 overflow-hidden">
        <div class="p-2 bg-slate-100 dark:bg-slate-700 rounded text-slate-500">
          <lucide-icon name="file-text" class="w-6 h-6"></lucide-icon>
        </div>
        <div class="min-w-0">
          <div class="flex items-center space-x-2">
            <h3 class="font-semibold text-slate-900 dark:text-slate-100 truncate" [title]="subtitle.name">
              {{ subtitle.name }}
            </h3>
            <button (click)="rename.emit(subtitle)" class="text-slate-400 hover:text-indigo-600 transition-colors">
              <lucide-icon name="edit-2" class="w-3.5 h-3.5"></lucide-icon>
            </button>
          </div>
          <div class="flex items-center space-x-2 text-xs text-slate-500">
            <span>{{ subtitle.sourceLanguage || '??' }}</span>
            <lucide-icon name="chevron-right" class="w-3 h-3"></lucide-icon>
            <span>{{ subtitle.targetLanguage || '??' }}</span>
          </div>
        </div>
      </div>

      <div class="flex items-center space-x-3 ml-4">
        @if (subtitle.status === 'TRANSLATING') {
          <div class="flex flex-col items-end w-32 shrink-0">
            <div class="w-full bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
              <div class="bg-indigo-600 h-full transition-all duration-300" [style.width.%]="subtitle.progress"></div>
            </div>
            <span class="text-[10px] mt-1 text-slate-500 font-mono">{{ subtitle.progress }}%</span>
          </div>
        } @else if (subtitle.status === 'UPLOADED') {
          <button
            (click)="translate.emit(subtitle)"
            class="px-3 py-1.5 bg-indigo-600 text-white text-sm font-medium rounded-md hover:bg-indigo-700 flex items-center space-x-2 shrink-0"
          >
            <lucide-icon name="play" class="w-4 h-4"></lucide-icon>
            <span>{{ 'LIST.TRANSLATE' | translate }}</span>
          </button>
        } @else if (subtitle.status === 'COMPLETED') {
          <div class="flex items-center space-x-2">
            <button
              (click)="restart.emit(subtitle.id)"
              class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-md transition-all"
              title="{{ 'LIST.RESTART' | translate }}"
            >
              <lucide-icon name="rotate-cw" class="w-4 h-4"></lucide-icon>
            </button>
            <button
              (click)="download.emit(subtitle)"
              class="px-3 py-1.5 bg-emerald-600 text-white text-sm font-medium rounded-md hover:bg-emerald-700 flex items-center space-x-2 shrink-0"
            >
              <lucide-icon name="download" class="w-4 h-4"></lucide-icon>
              <span>{{ 'LIST.DOWNLOAD' | translate }}</span>
            </button>
          </div>
        } @else if (subtitle.status === 'ERROR') {
          <div class="flex items-center space-x-2">
            <button
              (click)="restart.emit(subtitle.id)"
              class="px-3 py-1.5 bg-amber-500 text-white text-sm font-medium rounded-md hover:bg-amber-600 flex items-center space-x-2 shrink-0"
            >
              <lucide-icon name="rotate-cw" class="w-4 h-4"></lucide-icon>
              <span>{{ 'LIST.RETRY' | translate }}</span>
            </button>
            <div class="text-rose-500 flex items-center space-x-1 shrink-0">
              <lucide-icon name="alert-circle" class="w-5 h-5"></lucide-icon>
            </div>
          </div>
        }

        <button
          (click)="delete.emit(subtitle.id)"
          class="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-md transition-all ml-1"
          title="{{ 'LIST.DELETE' | translate }}"
        >
          <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
        </button>
      </div>
    </div>
  `,
})
export class SubtitleItemComponent {
  @Input({ required: true }) subtitle!: Subtitle;
  @Output() translate = new EventEmitter<Subtitle>();
  @Output() download = new EventEmitter<Subtitle>();
  @Output() delete = new EventEmitter<string>();
  @Output() restart = new EventEmitter<string>();
  @Output() rename = new EventEmitter<Subtitle>();
}
