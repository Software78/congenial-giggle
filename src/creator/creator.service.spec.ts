import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreatorService } from './creator.service';
import { Creator } from './entities/creator.entity';
import { CreateCreatorDto } from './dto/create-creator.dto';

describe('CreatorService', () => {
  let service: CreatorService;
  let repository: jest.Mocked<Repository<Creator>>;

  const mockCreator: Creator = {
    id: 1,
    name: 'Alice',
    email: 'alice@example.com',
    createdAt: new Date(),
    contents: [],
  };

  beforeEach(async () => {
    const mockRepository = {
      create: jest.fn().mockReturnValue(mockCreator),
      save: jest.fn().mockResolvedValue(mockCreator),
      findOne: jest.fn().mockResolvedValue(mockCreator),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CreatorService,
        {
          provide: getRepositoryToken(Creator),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<CreatorService>(CreatorService);
    repository = module.get(getRepositoryToken(Creator));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('should create and return a creator', async () => {
      const dto: CreateCreatorDto = {
        name: 'Alice',
        email: 'alice@example.com',
      };

      const result = await service.create(dto);

      expect(repository.create).toHaveBeenCalledWith(dto);
      expect(repository.save).toHaveBeenCalledWith(mockCreator);
      expect(result).toEqual(mockCreator);
      expect(result.name).toBe('Alice');
      expect(result.email).toBe('alice@example.com');
    });
  });

  describe('findById', () => {
    it('should return a creator when found', async () => {
      const result = await service.findById(1);

      expect(repository.findOne).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(result).toEqual(mockCreator);
    });

    it('should return null when creator not found', async () => {
      (repository.findOne as jest.Mock).mockResolvedValue(null);

      const result = await service.findById(999);

      expect(result).toBeNull();
    });
  });
});
