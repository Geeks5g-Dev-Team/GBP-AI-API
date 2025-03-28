import { Injectable } from '@nestjs/common';
import { CreatePostDto } from '../dtos/create-post.dto';
import { Post } from 'src/domain/entities/post.entity';
import { FacebookService } from 'src/infrastructure/externals/FacebookApiService';
import { InstagramService } from 'src/infrastructure/externals/InstagramApiService';

@Injectable()
export class CreatePostUseCase {
  constructor(
    private readonly facebookService: FacebookService,
    private readonly instagramService: InstagramService,
  ) {}

  async execute(createPostDto: CreatePostDto): Promise<Post> {
    const post = new Post({
      content: createPostDto.content,
      imagesUrls: [],
      accessToken: createPostDto.accessToken,
      pageId: createPostDto.pageId,
      publishToFacebook: createPostDto.publishToFacebook,
      publishToInstagram: createPostDto.publishToInstagram,
    });

    if (createPostDto.publishToFacebook) {
      const { facebookPostId } = await this.facebookService.createPost(post);
      if (facebookPostId === undefined) {
        throw new Error('Error al publicar en Facebook');
      }
      post.facebookPostId = facebookPostId;
    }
    if (createPostDto.publishToInstagram) {
      const { instagramPostId } = await this.instagramService.createPost(post);
      if (instagramPostId === undefined) {
        throw new Error('Error al publicar en Instagram');
      }
      post.instagramPostId = instagramPostId;
    }
    return post;
  }
}
