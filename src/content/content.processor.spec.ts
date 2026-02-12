import { Test, TestingModule } from '@nestjs/testing';
import { ContentProcessor, ProcessContentJob } from './content.processor';
import { ContentService } from './content.service';
import { ContentStatus } from './entities/content.entity';

describe('ContentProcessor', () => {
  let processor: ContentProcessor;
  let contentService: jest.Mocked<ContentService>;

  const mockJob = {
    data: { contentId: 'content-uuid-1' } as ProcessContentJob,
    id: 'job-1',
  };

  beforeEach(async () => {
    const mockContentService = {
      updateStatus: jest.fn().mockResolvedValue({}),
      invalidateFeedCache: jest.fn().mockResolvedValue(undefined),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ContentProcessor,
        {
          provide: ContentService,
          useValue: mockContentService,
        },
      ],
    }).compile();

    processor = module.get<ContentProcessor>(ContentProcessor);
    contentService = module.get(ContentService);
  });

  it('should be defined', () => {
    expect(processor).toBeDefined();
  });

  describe('handleProcessContent', () => {
    it('should update content status to published and invalidate feed cache', async () => {
      await processor.handleProcessContent(mockJob as never);

      expect(contentService.updateStatus).toHaveBeenCalledWith(
        'content-uuid-1',
        ContentStatus.PUBLISHED,
      );
      expect(contentService.invalidateFeedCache).toHaveBeenCalled();
    });
  });
});
