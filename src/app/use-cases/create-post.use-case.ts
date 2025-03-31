import { Injectable } from '@nestjs/common';
import { CreatePostDto } from '../dtos/create-post.dto';
import { Post } from 'src/domain/entities/post.entity';
import { FacebookService } from 'src/infrastructure/externals/FacebookApiService';
import { InstagramService } from 'src/infrastructure/externals/InstagramApiService';
import { GrokService } from 'src/infrastructure/externals/GrokApiService';
import { GoogleStorageService } from 'src/infrastructure/externals/GoogleStorageService';
import { SIZE_OPTIONS } from 'src/domain/interfaces/IAGenerator.repository';
import { GenerateImageOfServiceUseCase } from './generate-image-of-service.use-case';

@Injectable()
export class CreatePostUseCase {
  constructor(
    private readonly facebookService: FacebookService,
    private readonly instagramService: InstagramService,
    private readonly generatorService: GenerateImageOfServiceUseCase,
    private readonly storageService: GoogleStorageService,
  ) {}

  async execute(createPostDto: CreatePostDto): Promise<Post> {
    const [existImage, images] = await this.existImages(createPostDto.companyName, createPostDto.serviceName);
    if ((!existImage || createPostDto.generateNewImage) && createPostDto.generateImageOfServiceDto) {
      const [, remotePath] = await this.generatorService.execute(createPostDto.generateImageOfServiceDto);
      // clear images array
      images.length = 0;
      // push new image to images array
      images.push(remotePath);
    }
    const post = new Post({
      content: createPostDto.content,
      imagesUrls: images,
      accessToken: createPostDto.accessToken,
      pageId: createPostDto.pageId,
      publishToFacebook: createPostDto.publishToFacebook,
      publishToInstagram: createPostDto.publishToInstagram,
    });
    return post;
  }

  async existImages(companyName: string, serviceName: string): Promise<[boolean, string[]]> {
    const images = await this.storageService.getImages({
      prefix: `${companyName}/${serviceName}/`,
    });
    return [images.length > 0, images];
  }
}
