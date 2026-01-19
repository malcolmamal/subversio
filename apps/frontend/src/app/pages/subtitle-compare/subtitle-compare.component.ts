import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ScrollingModule } from '@angular/cdk/scrolling';
import { SubtitleService } from '../../services/subtitle.service';
import { SubtitleCompareResponse } from '../../models/subtitle.model';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';
import { SegmentSaveEvent, SubtitleCompareRowComponent } from './subtitle-compare-row.component';

@Component({
  selector: 'app-subtitle-compare',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule, SubtitleCompareRowComponent, ScrollingModule],
  template: `
    <div class="container mx-auto p-4 max-w-6xl">
      <div class="flex items-center gap-4 mb-6">
        <a routerLink="/" class="btn btn-ghost btn-sm">
          <lucide-icon [name]="ArrowLeftIcon" class="w-4 h-4"></lucide-icon>
          Back to Dashboard
        </a>
        <h1 class="text-2xl font-bold" *ngIf="data()">Comparison: {{ data()?.subtitle?.name }}</h1>
      </div>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 sticky top-0 bg-base-100 py-3 border-b z-20 hidden md:grid">
        <div class="font-bold text-center text-sm uppercase tracking-wider opacity-60">Original</div>
        <div class="font-bold text-center text-sm uppercase tracking-wider opacity-60">
          Translated ({{ data()?.subtitle?.targetLanguage }})
        </div>
      </div>

      <div class="pt-4">
        @if ((data()?.segments?.length ?? 0) > 0) {
          <cdk-virtual-scroll-viewport class="w-full" [itemSize]="itemSize" [style.height.px]="itemSize * visibleRows">
            <div class="space-y-4" *cdkVirtualFor="let segment of segments(); trackBy: trackByIndex">
              <app-subtitle-compare-row
                [segment]="segment"
                [actionInProgress]="actionInProgress()"
                (saveSegment)="onSaveSegment($event)"
                (forceTranslate)="forceTranslateSegment($event)"
                (insertBelow)="insertSegmentBelow($event)"
                (delete)="deleteSegmentByIndex($event)"
              ></app-subtitle-compare-row>
            </div>
          </cdk-virtual-scroll-viewport>
        } @else {
          <div class="text-center py-20 bg-base-200 rounded-box border-2 border-dashed border-base-300">
            <p class="opacity-50">Loading segments or no translation available yet...</p>
          </div>
        }
      </div>
    </div>
  `,
})
export class SubtitleCompareComponent implements OnInit {
  private subtitleService = inject(SubtitleService);
  id = input.required<string>();
  ArrowLeftIcon = ArrowLeft;

  data = signal<SubtitleCompareResponse | null>(null);
  actionInProgress = signal(false);
  itemSize = 260;
  visibleRows = 14;

  ngOnInit() {
    this.refresh();
  }

  refresh() {
    this.subtitleService.getCompare(this.id()).subscribe((res) => {
      this.data.set(res);
    });
  }

  segments() {
    return this.data()?.segments ?? [];
  }

  trackByIndex(_index: number, segment: { index: number }) {
    return segment.index;
  }

  onSaveSegment(event: SegmentSaveEvent) {
    if (Object.keys(event.payload).length === 0) return;
    this.actionInProgress.set(true);
    this.subtitleService.updateSegment(this.id(), event.index, event.payload).subscribe({
      next: (updated) => {
        this.updateSegmentInState(event.index, {
          originalText: updated.originalText ?? event.draft.originalText,
          translatedText: updated.translatedText ?? event.draft.translatedText,
        });
      },
      error: () => this.actionInProgress.set(false),
      complete: () => this.actionInProgress.set(false),
    });
  }

  forceTranslateSegment(index: number) {
    this.actionInProgress.set(true);
    this.subtitleService.forceTranslateSegment(this.id(), index).subscribe({
      next: (updated) => {
        this.updateSegmentInState(index, { translatedText: updated.translatedText });
      },
      error: () => this.actionInProgress.set(false),
      complete: () => this.actionInProgress.set(false),
    });
  }

  insertSegmentBelow(index: number) {
    this.actionInProgress.set(true);
    this.subtitleService.insertSegment(this.id(), { index: index + 1 }).subscribe({
      next: () => this.refresh(),
      error: () => this.actionInProgress.set(false),
      complete: () => this.actionInProgress.set(false),
    });
  }

  deleteSegmentByIndex(index: number) {
    if (!confirm(`Delete segment #${index}?`)) return;
    this.actionInProgress.set(true);
    this.subtitleService.deleteSegment(this.id(), index).subscribe({
      next: () => this.refresh(),
      error: () => this.actionInProgress.set(false),
      complete: () => this.actionInProgress.set(false),
    });
  }

  private updateSegmentInState(index: number, updates: { originalText?: string; translatedText?: string }) {
    const current = this.data();
    if (!current) return;
    const updatedSegments = current.segments.map((segment) =>
      segment.index === index
        ? {
            ...segment,
            originalText: updates.originalText ?? segment.originalText,
            translatedText: updates.translatedText ?? segment.translatedText,
          }
        : segment,
    );
    this.data.set({ ...current, segments: updatedSegments });
    this.actionInProgress.set(false);
  }
}
