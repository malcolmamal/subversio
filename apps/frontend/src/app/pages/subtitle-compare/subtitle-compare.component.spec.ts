import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SubtitleCompareComponent } from './subtitle-compare.component';
import { SubtitleService } from '../../services/subtitle.service';
import { of } from 'rxjs';
import { provideRouter } from '@angular/router';

describe('SubtitleCompareComponent', () => {
  let component: SubtitleCompareComponent;
  let fixture: ComponentFixture<SubtitleCompareComponent>;
  let mockSubtitleService: any;

  beforeEach(async () => {
    mockSubtitleService = {
      getCompare: jest.fn().mockReturnValue(
        of({
          subtitle: { name: 'Test Sub' },
          segments: [{ index: 1, originalText: 'Hello', translatedText: 'Hola' }],
        }),
      ),
    };

    await TestBed.configureTestingModule({
      imports: [SubtitleCompareComponent],
      providers: [{ provide: SubtitleService, useValue: mockSubtitleService }, provideRouter([])],
    }).compileComponents();

    fixture = TestBed.createComponent(SubtitleCompareComponent);
    component = fixture.componentInstance;
    // Set required input
    fixture.componentRef.setInput('id', '123');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should load comparison data on init', () => {
    expect(mockSubtitleService.getCompare).toHaveBeenCalledWith('123');
    expect(component.data()?.subtitle.name).toBe('Test Sub');
  });

  it('should format time correctly', () => {
    expect(component.formatTime(1234)).toBe('00:01.234');
    expect(component.formatTime(61000)).toBe('01:01.000');
  });
});
