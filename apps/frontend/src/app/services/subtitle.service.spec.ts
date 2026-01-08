import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { SubtitleService } from './subtitle.service';

describe('SubtitleService', () => {
  let service: SubtitleService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [SubtitleService],
    });
    service = TestBed.inject(SubtitleService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should fetch subtitles list', () => {
    const dummyResponse = {
      subtitles: [],
      total: 0,
      page: 1,
      limit: 10,
    };

    service.getSubtitles(1, 10).subscribe((response) => {
      expect(response.subtitles.length).toBe(0);
      expect(response.total).toBe(0);
    });

    const req = httpMock.expectOne('http://localhost:4040/api/subtitles?page=1&limit=10');
    expect(req.request.method).toBe('GET');
    req.flush(dummyResponse);
  });

  it('should rename a subtitle', () => {
    const updatedSubtitle = { id: '1', name: 'New Name' };

    service.renameSubtitle('1', 'New Name').subscribe((subtitle) => {
      expect(subtitle.name).toBe('New Name');
    });

    const req = httpMock.expectOne('http://localhost:4040/api/subtitles/1');
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ name: 'New Name' });
    req.flush(updatedSubtitle);
  });
});
