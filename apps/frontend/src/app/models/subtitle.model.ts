export interface Subtitle {
  id: string;
  name: string;
  originalFileName: string;
  originalFilePath: string;
  translatedFilePath?: string;
  sourceLanguage?: string;
  targetLanguage?: string;
  status: 'UPLOADED' | 'TRANSLATING' | 'COMPLETED' | 'ERROR';
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface SubtitleResponse {
  subtitles: Subtitle[];
  total: number;
  page: number;
  limit: number;
}
