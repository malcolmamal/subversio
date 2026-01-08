import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideAngularModule } from 'lucide-angular';

@Component({
  selector: 'sv-navbar',
  standalone: true,
  imports: [LucideAngularModule],
  template: `
    <nav
      class="flex items-center justify-between p-4 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700"
    >
      <div class="flex items-center space-x-2">
        <lucide-icon name="languages" class="w-8 h-8 text-indigo-600 dark:text-indigo-400"></lucide-icon>
        <span class="text-xl font-bold tracking-tight">SubVersio</span>
      </div>

      <div class="flex items-center space-x-4">
        <button
          (click)="toggleTheme.emit()"
          class="p-2 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          [title]="isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'"
        >
          <lucide-icon [name]="isDarkMode ? 'sun' : 'moon'" class="w-5 h-5"></lucide-icon>
        </button>

        <div class="flex items-center space-x-2">
          <button
            (click)="setLang.emit('en')"
            class="px-2 py-1 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            [class.font-bold]="currentLang === 'en'"
          >
            EN
          </button>
          <button
            (click)="setLang.emit('pl')"
            class="px-2 py-1 text-xs rounded hover:bg-slate-100 dark:hover:bg-slate-700"
            [class.font-bold]="currentLang === 'pl'"
          >
            PL
          </button>
        </div>
      </div>
    </nav>
  `,
})
export class NavbarComponent {
  @Input() isDarkMode = false;
  @Input() currentLang = 'en';
  @Output() toggleTheme = new EventEmitter<void>();
  @Output() setLang = new EventEmitter<string>();
}
