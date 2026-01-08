import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subtitle, SubtitleResponse } from '../models/subtitle.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SubtitleService {
  private http = inject(HttpClient);
  private apiUrl = 'http://localhost:4040/api';

  getSubtitles(page: number = 1, limit: number = 10): Observable<SubtitleResponse> {
    return this.http.get<SubtitleResponse>(`${this.apiUrl}/subtitles`, {
      params: { page, limit },
    });
  }

  getSubtitle(id: string): Observable<Subtitle> {
    return this.http.get<Subtitle>(`${this.apiUrl}/subtitles/${id}`);
  }

  uploadSubtitle(file: File, name?: string, sourceLanguage?: string): Observable<Subtitle> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (sourceLanguage) formData.append('sourceLanguage', sourceLanguage);

    return this.http.post<Subtitle>(`${this.apiUrl}/subtitles/upload`, formData);
  }

  translateSubtitle(id: string, targetLanguage: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/subtitles/${id}/translate`, {
      targetLanguage,
    });
  }

  deleteSubtitle(id: string): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/subtitles/${id}`);
  }

  renameSubtitle(id: string, name: string): Observable<Subtitle> {
    return this.http.patch<Subtitle>(`${this.apiUrl}/subtitles/${id}`, { name });
  }

  restartTranslation(id: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/subtitles/${id}/restart`, {});
  }

  getDownloadUrl(filePath: string): string {
    return `http://localhost:4040/uploads/${filePath}`;
  }
}
