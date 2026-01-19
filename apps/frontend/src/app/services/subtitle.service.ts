import { Injectable, inject, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Subtitle, SubtitleResponse, SubtitleCompareResponse } from '../models/subtitle.model';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class SubtitleService {
  private http = inject(HttpClient);
  private ngZone = inject(NgZone);
  private apiUrl = 'http://localhost:4040/api';

  getSubtitles(page: number = 1, limit: number = 10): Observable<SubtitleResponse> {
    return this.http.get<SubtitleResponse>(`${this.apiUrl}/subtitles`, {
      params: { page, limit },
    });
  }

  getSubtitle(id: string): Observable<Subtitle> {
    return this.http.get<Subtitle>(`${this.apiUrl}/subtitles/${id}`);
  }

  getCompare(id: string): Observable<SubtitleCompareResponse> {
    return this.http.get<SubtitleCompareResponse>(`${this.apiUrl}/subtitles/${id}/compare`);
  }

  updateSegment(
    subtitleId: string,
    index: number,
    payload: { originalText?: string; translatedText?: string },
  ): Observable<{ index: number; originalText?: string; translatedText?: string }> {
    return this.http.patch<{ index: number; originalText?: string; translatedText?: string }>(
      `${this.apiUrl}/subtitles/${subtitleId}/segments/${index}`,
      payload,
    );
  }

  insertSegment(
    subtitleId: string,
    payload: { index: number; originalText?: string; translatedText?: string; startTime?: number; endTime?: number },
  ): Observable<{ index: number }> {
    return this.http.post<{ index: number }>(`${this.apiUrl}/subtitles/${subtitleId}/segments`, payload);
  }

  deleteSegment(subtitleId: string, index: number): Observable<{ index: number }> {
    return this.http.delete<{ index: number }>(`${this.apiUrl}/subtitles/${subtitleId}/segments/${index}`);
  }

  forceTranslateSegment(
    subtitleId: string,
    index: number,
    targetLanguage?: string,
  ): Observable<{ index: number; translatedText: string }> {
    return this.http.post<{ index: number; translatedText: string }>(
      `${this.apiUrl}/subtitles/${subtitleId}/segments/${index}/translate`,
      { targetLanguage },
    );
  }

  getSubtitleEvents(): Observable<any> {
    return new Observable((observer) => {
      const eventSource = new EventSource(`${this.apiUrl}/subtitles/events`);

      eventSource.onmessage = (event) => {
        this.ngZone.run(() => {
          observer.next(JSON.parse(event.data));
        });
      };

      eventSource.onerror = (error) => {
        this.ngZone.run(() => {
          observer.error(error);
        });
      };

      return () => {
        eventSource.close();
      };
    });
  }

  uploadSubtitle(file: File, name?: string, sourceLanguage?: string): Observable<Subtitle> {
    const formData = new FormData();
    formData.append('file', file);
    if (name) formData.append('name', name);
    if (sourceLanguage) formData.append('sourceLanguage', sourceLanguage);

    return this.http.post<Subtitle>(`${this.apiUrl}/subtitles/upload`, formData);
  }

  translateSubtitle(id: string, targetLanguage: string, chunkSize?: number): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/subtitles/${id}/translate`, {
      targetLanguage,
      chunkSize,
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
