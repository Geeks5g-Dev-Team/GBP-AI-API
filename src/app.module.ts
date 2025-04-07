import { Module } from '@nestjs/common';
import { GeneratorModule } from './modules/generator.module';
import { ConfigModule } from '@nestjs/config';

@Module({
  imports: [ConfigModule.forRoot(), GeneratorModule],
})
export class AppModule {}
