import OpenAI from 'openai';
import { IIAGeneratorRepository, SIZE_OPTIONS } from 'src/domain/interfaces/IAGenerator.repository';

export class OpenAiService implements IIAGeneratorRepository {
  model: string;
  constructor(private readonly openAi: OpenAI) {
    this.model = 'dall-e-3';
  }
  async generateImage(prompt: string, number_images: number, size: SIZE_OPTIONS): Promise<[string, string]> {
    try {
      const response = await this.openAi.images.generate({
        prompt,
        n: number_images,
        size,
        model: this.model,
        quality: 'hd',
      });
      const { data } = response;
      return ['', data[0].url || 'no image'];
    } catch (error) {
      if (error.response) {
        const { data, status } = error.response;
        console.error('Error response:', data);
        console.error('Error status:', status);
      }
      throw new Error('Error:', error);
    }
  }
}
