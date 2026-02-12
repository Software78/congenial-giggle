import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCreatorDto } from './dto/create-creator.dto';
import { Creator } from './entities/creator.entity';

@Injectable()
export class CreatorService {
  constructor(
    @InjectRepository(Creator)
    private readonly creatorRepository: Repository<Creator>,
  ) {}

  async create(createCreatorDto: CreateCreatorDto): Promise<Creator> {
    const creator = this.creatorRepository.create(createCreatorDto);
    return this.creatorRepository.save(creator);
  }

  async findById(id: number): Promise<Creator | null> {
    return this.creatorRepository.findOne({ where: { id } });
  }
}
