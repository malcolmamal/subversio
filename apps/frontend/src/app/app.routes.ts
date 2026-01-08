import { Routes } from '@angular/router';
import { DashboardComponent } from './pages/dashboard.component';
import { SubtitleCompareComponent } from './pages/subtitle-compare/subtitle-compare.component';

export const routes: Routes = [
  { path: '', component: DashboardComponent },
  { path: 'subtitles/:id/compare', component: SubtitleCompareComponent },
  { path: '**', redirectTo: '' },
];
