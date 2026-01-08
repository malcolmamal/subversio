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

export interface SubtitleSegment {
  index: number;
  startTime: number;
  endTime: number;
  originalText: string;
  translatedText?: string;
}

export interface SubtitleCompareResponse {
  subtitle: Subtitle;
  segments: SubtitleSegment[];
}
