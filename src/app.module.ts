import { Module } from '@nestjs/common';
import { CreatePostUseCase } from './app/use-cases/create-post.use-case';
import { InstagramService } from './infrastructure/externals/InstagramApiService';
import { FacebookService } from './infrastructure/externals/FacebookApiService';
import { PostsController } from './presentation/controllers/posts.controller';
import { GeneratorModule } from './modules/generator.module';
import { PostsModule } from './modules/posts.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot(), GeneratorModule, PostsModule],
  controllers: [PostsController],
  providers: [FacebookService, InstagramService, CreatePostUseCase],
})
export class AppModule {}
