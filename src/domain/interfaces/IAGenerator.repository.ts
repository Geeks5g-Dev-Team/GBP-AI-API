export interface IIAGeneratorRepository {
  model: string;
  generateImage(prompt: string, number_images: number, size: SIZE_OPTIONS): Promise<[string, string]>;
}
export enum SIZE_OPTIONS {
  SMALL = '1024x1024',
  MEDIUM = '1792x1024',
  LARGE = '1024x1792',
}
