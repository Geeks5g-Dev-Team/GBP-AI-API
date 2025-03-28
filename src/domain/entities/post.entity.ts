export class Post {
  content: string;
  imagesUrls: string[] = [];
  pageId: string;
  accessToken: string;
  publishToFacebook: boolean;
  publishToInstagram: boolean;
  facebookPostId?: string;
  instagramPostId?: string;
  scheduled_publish_time?: string; //unix_time_stamp_of_a_future_date
  createdAt: Date;
  updatedAt: Date;

  constructor(params: { content: string; imagesUrls: string[]; pageId: string; accessToken: string; publishToFacebook: boolean; publishToInstagram: boolean; scheduled_publish_time?: string }) {
    this.content = params.content;
    this.imagesUrls = params.imagesUrls;
    this.pageId = params.pageId;
    this.accessToken = params.accessToken;
    this.publishToFacebook = params.publishToFacebook;
    this.publishToInstagram = params.publishToInstagram;
    this.scheduled_publish_time = params.scheduled_publish_time;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }
}
