import { Body, Controller, Post, Request } from '@nestjs/common';
import { CreatePostDto } from 'src/app/dtos/create-post.dto';
import { CreatePostUseCase } from 'src/app/use-cases/create-post.use-case';
import { Post as PostEntity } from 'src/domain/entities/post.entity';

@Controller('posts')
export class PostsController {
  constructor(private readonly createPostUseCase: CreatePostUseCase) {}

  @Post()
  async create(@Body() createPostDto: CreatePostDto, @Request() req: any): Promise<PostEntity> {
    return await this.createPostUseCase.execute(createPostDto);
  }
}
