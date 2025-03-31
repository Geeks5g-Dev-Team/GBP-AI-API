import { Module } from '@nestjs/common';
import { GeneratorModule } from './modules/generator.module';
import { PostsModule } from './modules/posts.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot(), PostsModule, GeneratorModule],
})
export class AppModule {}
