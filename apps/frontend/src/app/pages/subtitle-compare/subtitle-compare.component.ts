import { Component, inject, input, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SubtitleService } from '../../services/subtitle.service';
import { SubtitleCompareResponse } from '../../models/subtitle.model';
import { RouterLink } from '@angular/router';
import { LucideAngularModule, ArrowLeft } from 'lucide-angular';

@Component({
  selector: 'app-subtitle-compare',
  standalone: true,
  imports: [CommonModule, RouterLink, LucideAngularModule],
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

      <div class="space-y-4 pt-4">
        @for (segment of data()?.segments; track segment.index) {
          <div class="card bg-base-200 border border-base-300 shadow-sm overflow-hidden">
            <div class="card-body p-0">
              <div class="bg-base-300 px-4 py-1 text-[10px] font-mono flex justify-between opacity-70">
                <span>SEGMENT #{{ segment.index }}</span>
                <span>{{ formatTime(segment.startTime) }} &rarr; {{ formatTime(segment.endTime) }}</span>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-base-300">
                <div class="p-6 bg-base-100">
                  <p class="whitespace-pre-wrap leading-relaxed">{{ segment.originalText }}</p>
                </div>
                <div class="p-6 bg-primary/5">
                  <p class="whitespace-pre-wrap font-medium leading-relaxed">
                    {{ segment.translatedText || '...' }}
                  </p>
                </div>
              </div>
            </div>
          </div>
        } @empty {
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

  ngOnInit() {
    this.subtitleService.getCompare(this.id()).subscribe((res) => {
      this.data.set(res);
    });
  }

  formatTime(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    const mm = ms % 1000;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${mm.toString().padStart(3, '0')}`;
  }
}
