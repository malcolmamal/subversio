import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'sv-pagination',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <div class="flex items-center justify-center space-x-2 py-4">
      <button 
        [disabled]="page === 1"
        (click)="changePage.emit(page - 1)"
        class="p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
      >
        <lucide-icon name="chevron-left" class="w-4 h-4"></lucide-icon>
      </button>
      
      <span class="text-sm font-medium">Page {{ page }} of {{ totalPages }}</span>
      
      <button 
        [disabled]="page >= totalPages"
        (click)="changePage.emit(page + 1)"
        class="p-2 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 disabled:opacity-50"
      >
        <lucide-icon name="chevron-right" class="w-4 h-4"></lucide-icon>
      </button>
    </div>
  `
})
export class PaginationComponent {
  @Input() page = 1;
  @Input() total = 0;
  @Input() limit = 10;
  @Output() changePage = new EventEmitter<number>();

  get totalPages() {
    return Math.ceil(this.total / this.limit) || 1;
  }
}
