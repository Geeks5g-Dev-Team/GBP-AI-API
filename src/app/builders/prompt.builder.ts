type dataTemplate = {
  businessType: string;
  mainService: string;
  styleImage: string;
  mood?: string;
  key_elements: string;
  aesthetic_lighting: string;
  aesthetic_perspective: string;
  aesthetic_color_palette?: string;
  aesthetic_texture_details?: string;
  additional_context: string;
  country: string;
  [key: string]: any;
};

export const buildPromptFromTemplate = (data: dataTemplate): string => {
  const { businessType, mainService, styleImage, mood, key_elements, aesthetic_lighting, aesthetic_perspective, aesthetic_color_palette, aesthetic_texture_details, additional_context, country } =
    data;

  return `
  Create a highly realistic and professional photograph for marketing purposes that represents:
  - Business Type: ${businessType}
  - Primary Service: ${mainService}
  - Country: ${country}

  Image Characteristics:
  - Style: ${styleImage}
  - Mood: ${mood ?? 'Trustworthy, Reliable, Competent'}
  - Key Elements: ${key_elements}

Preferred Aesthetic:
- Lighting: ${aesthetic_lighting}
- Perspective: ${aesthetic_perspective}
- Additional Context: ${additional_context}
ultra-photorealistic, cinematic lighting, high detail, natural textures, no distortions, no brand, no artifacts, no text, no logo,no names, no letters
`;
};
