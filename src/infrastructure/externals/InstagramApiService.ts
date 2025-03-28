import { Injectable } from '@nestjs/common';
import { Post } from 'src/domain/entities/post.entity';
import { ISocialMediaRepository, SocialMediaStats } from 'src/domain/interfaces/socialMedia.repository';

@Injectable()
export class InstagramService implements ISocialMediaRepository {
  createPost(post: Post): Promise<Post> {
    throw new Error('Method not implemented.');
  }
  getAllPosts(): Promise<Post[]> {
    throw new Error('Method not implemented.');
  }
  getPostById(id: string): Promise<Post | undefined> {
    throw new Error('Method not implemented.');
  }
  updatePost(post: Post): Promise<void> {
    throw new Error('Method not implemented.');
  }
  deletePost(id: string): Promise<void> {
    throw new Error('Method not implemented.');
  }
  getUserPosts(userId: string): Promise<Post[]> {
    throw new Error('Method not implemented.');
  }
  getStats(): Promise<SocialMediaStats> {
    throw new Error('Method not implemented.');
  }
}
