import { Injectable } from '@nestjs/common';
import { Post } from 'src/domain/entities/post.entity';
import { ISocialMediaRepository, SocialMediaStats } from 'src/domain/interfaces/socialMedia.repository';
import axios from 'axios';

@Injectable()
export class FacebookService implements ISocialMediaRepository {
  // META_URL = 'https://graph.facebook.com/v22.0/page_id/feed';
  getMetaUrl(pageId: string): string {
    return `https://graph.facebook.com/v22.0/${pageId}/feed`;
  }
  async createPost(post: Post): Promise<Post> {
    const newPost = new Post(post);
    const response = await axios.post(this.getMetaUrl(post.pageId), {
      message: post.content,
      published: 'false',
      scheduled_publish_time: 'unix_time_stamp_of_a_future_date',
    });
    const body = JSON.stringify(response.data);
    return new Promise<Post>((resolve, reject) => {
      setTimeout(() => {
        newPost.facebookPostId = 'fb_post_id';
        resolve(newPost);
      }, 1000);
    });
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
