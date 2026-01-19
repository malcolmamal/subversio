import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { LucideAngularModule } from 'lucide-angular';
import { SubtitleSegment } from '../../models/subtitle.model';

export interface SegmentSaveEvent {
  index: number;
  payload: { originalText?: string; translatedText?: string };
  draft: { originalText: string; translatedText: string };
}

@Component({
  selector: 'app-subtitle-compare-row',
  standalone: true,
  imports: [CommonModule, LucideAngularModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="card bg-base-200 border border-base-300 shadow-sm overflow-hidden">
      <div class="card-body p-0">
        <div class="bg-base-300 px-4 py-1 text-[10px] font-mono opacity-70">
          <div class="flex justify-between items-center">
            <span>SEGMENT #{{ segment.index }}</span>
            <span>{{ formatTime(segment.startTime) }} &rarr; {{ formatTime(segment.endTime) }}</span>
          </div>
        </div>
        <div class="px-4 py-2 flex flex-wrap gap-2 bg-base-200 border-b border-base-300">
          @if (!isEditing()) {
            <button type="button" class="btn btn-sm btn-ghost" title="Edit" aria-label="Edit" (click)="startEdit()">
              <lucide-icon name="edit-2" class="w-4 h-4"></lucide-icon>
            </button>
          } @else {
            <button
              type="button"
              class="btn btn-sm btn-ghost"
              title="Save"
              aria-label="Save"
              [disabled]="actionInProgress || pendingSave()"
              (click)="save()"
            >
              <lucide-icon name="save" class="w-4 h-4"></lucide-icon>
            </button>
            <button
              type="button"
              class="btn btn-sm btn-ghost"
              title="Cancel"
              aria-label="Cancel"
              [disabled]="pendingSave()"
              (click)="cancelEdit()"
            >
              <lucide-icon name="x" class="w-4 h-4"></lucide-icon>
            </button>
          }
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            title="Force translate"
            aria-label="Force translate"
            [disabled]="actionInProgress"
            (click)="forceTranslate.emit(segment.index)"
          >
            <lucide-icon name="sparkles" class="w-4 h-4"></lucide-icon>
          </button>
          <button
            type="button"
            class="btn btn-sm btn-ghost"
            title="Insert below"
            aria-label="Insert below"
            [disabled]="actionInProgress"
            (click)="insertBelow.emit(segment.index)"
          >
            <lucide-icon name="plus" class="w-4 h-4"></lucide-icon>
          </button>
          <button
            type="button"
            class="btn btn-sm btn-ghost text-error"
            title="Delete"
            aria-label="Delete"
            [disabled]="actionInProgress"
            (click)="delete.emit(segment.index)"
          >
            <lucide-icon name="trash-2" class="w-4 h-4"></lucide-icon>
          </button>
        </div>
        <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-base-300">
          <div class="p-6 bg-base-100">
            @if (isEditing()) {
              <textarea
                class="textarea textarea-bordered w-full min-h-[120px] text-sm leading-relaxed"
                [value]="draft()?.originalText ?? segment.originalText"
                [disabled]="pendingSave()"
                (input)="onEditChange('originalText', $event)"
              ></textarea>
            } @else {
              <p class="whitespace-pre-wrap leading-relaxed">{{ segment.originalText }}</p>
            }
          </div>
          <div class="p-6 bg-primary/5">
            @if (isEditing()) {
              <textarea
                class="textarea textarea-bordered w-full min-h-[120px] text-sm font-medium leading-relaxed"
                [value]="draft()?.translatedText ?? (segment.translatedText || '')"
                [disabled]="pendingSave()"
                (input)="onEditChange('translatedText', $event)"
              ></textarea>
            } @else {
              <p class="whitespace-pre-wrap font-medium leading-relaxed">
                {{ segment.translatedText || '...' }}
              </p>
            }
          </div>
        </div>
      </div>
    </div>
  `,
})
export class SubtitleCompareRowComponent {
  @Input({ required: true }) segment!: SubtitleSegment;
  @Input() actionInProgress = false;

  @Output() saveSegment = new EventEmitter<SegmentSaveEvent>();
  @Output() forceTranslate = new EventEmitter<number>();
  @Output() insertBelow = new EventEmitter<number>();
  @Output() delete = new EventEmitter<number>();

  isEditing = signal(false);
  draft = signal<{ originalText: string; translatedText: string } | null>(null);
  pendingSave = signal(false);

  ngOnChanges() {
    if (!this.pendingSave()) return;
    const draft = this.draft();
    if (!draft) return;
    const translated = this.segment.translatedText || '';
    if (draft.originalText === this.segment.originalText && draft.translatedText === translated) {
      this.pendingSave.set(false);
      this.isEditing.set(false);
      this.draft.set(null);
    }
  }

  startEdit() {
    this.isEditing.set(true);
    this.draft.set({
      originalText: this.segment.originalText,
      translatedText: this.segment.translatedText || '',
    });
  }

  cancelEdit() {
    this.isEditing.set(false);
    this.pendingSave.set(false);
    this.draft.set(null);
  }

  onEditChange(field: 'originalText' | 'translatedText', event: Event) {
    const value = (event.target as HTMLTextAreaElement).value;
    const current = this.draft() || {
      originalText: this.segment.originalText,
      translatedText: this.segment.translatedText || '',
    };
    this.draft.set({
      ...current,
      [field]: value,
    });
  }

  save() {
    const draft = this.draft();
    if (!draft) return;
    const payload: { originalText?: string; translatedText?: string } = {};
    if (draft.originalText !== this.segment.originalText) payload.originalText = draft.originalText;
    if (draft.translatedText !== (this.segment.translatedText || '')) payload.translatedText = draft.translatedText;

    if (Object.keys(payload).length === 0) {
      this.isEditing.set(false);
      this.draft.set(null);
      return;
    }

    this.pendingSave.set(true);
    this.saveSegment.emit({ index: this.segment.index, payload, draft });
  }

  formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const mm = ms % 1000;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${mm.toString().padStart(3, '0')}`;
  }
}
