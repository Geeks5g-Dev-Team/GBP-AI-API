export type dataTemplate = {
  [key: string]: any;
};

export const buildPromptFromTemplate = (data: dataTemplate): string => {
  const { businessType, mainService, additional_context, country } = data;

  return `
  Create a highly realistic and professional photograph for marketing purposes that represents:
  - Business Type: ${businessType}
  - Primary Service: ${mainService}
  - Country: ${country}
  Image Characteristics:
  - Style: Technical and Professional
  - Mood: 'Trustworthy, Reliable, Competent'
Preferred Aesthetic:
- Lighting: Bright worksite Lighting
- Perspective: Wide shot showing team at work
- Keywords: ${additional_context}
ultra-photorealistic, cinematic lighting, high detail, natural textures, no distortions, no brand, no artifacts, no text, no logo,no names, no letters
`;
};
