import { Component, EventEmitter, Output, signal } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';
import { TranslateModule } from '@ngx-translate/core';
import LanguageDetect from 'languagedetect';

@Component({
  selector: 'sv-drop-zone',
  standalone: true,
  imports: [LucideAngularModule, TranslateModule],
  template: `
    <div
      class="relative flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-xl transition-all cursor-pointer"
      [class.border-indigo-500]="isDragging()"
      [class.bg-indigo-50]="isDragging()"
      [class.dark:bg-indigo-900]="isDragging()"
      [class.border-slate-300]="!isDragging()"
      (dragover)="onDragOver($event)"
      (dragleave)="onDragLeave()"
      (drop)="onDrop($event)"
      (click)="fileInput.click()"
    >
      <input #fileInput type="file" class="hidden" (change)="onFileSelected($event)" accept=".srt,.vtt,.txt" />
      <lucide-icon name="upload" class="w-12 h-12 mb-4 text-slate-400"></lucide-icon>
      <p class="mb-2 text-lg font-medium">{{ 'UPLOAD.DRAG_DROP' | translate }}</p>
      <p class="text-sm text-slate-500">{{ 'UPLOAD.SUPPORTED_FORMATS' | translate }}</p>
      @if (detectedLang()) {
        <div
          class="mt-4 px-3 py-1 bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 text-xs rounded-full font-semibold"
        >
          {{ 'UPLOAD.DETECTED' | translate }}: {{ detectedLang() }}
        </div>
      }
    </div>
  `,
})
export class DropZoneComponent {
  @Output() fileUploaded = new EventEmitter<{ file: File; detectedLang: string }>();

  isDragging = signal(false);
  detectedLang = signal<string | null>(null);
  private detector = new LanguageDetect();

  onDragOver(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(true);
  }

  onDragLeave() {
    this.isDragging.set(false);
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    this.isDragging.set(false);
    const files = event.dataTransfer?.files;
    if (files?.length) {
      this.processFile(files[0]);
    }
  }

  onFileSelected(event: any) {
    const files = event.target.files;
    if (files?.length) {
      this.processFile(files[0]);
    }
  }

  private processFile(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result as string;
      // Take first 1000 chars for detection
      const sample = content.substring(0, 1000);
      const detection = this.detector.detect(sample, 1);
      const lang = detection.length ? detection[0][0] : 'english'; // Default or unknown
      this.detectedLang.set(lang);
      this.fileUploaded.emit({ file, detectedLang: lang });
    };
    reader.readAsText(file);
  }
}
