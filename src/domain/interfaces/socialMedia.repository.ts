import { Post } from '../entities/post.entity';

export interface ISocialMediaRepository {
  createPost(post: Post): Promise<Post>;
  getAllPosts(): Promise<Post[]>;
  getPostById(id: string): Promise<Post | undefined>;
  updatePost(post: Post): Promise<void>;
  deletePost(id: string): Promise<void>;
  getUserPosts(userId: string): Promise<Post[]>;
  getStats(): Promise<SocialMediaStats>;
}

export interface SocialMediaStats {
  totalLikes: number;
  totalComments: number;
}
