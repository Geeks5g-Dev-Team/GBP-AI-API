export type dataTemplate = {
  [key: string]: any;
};

export const buildPromptFromTemplate = (data: dataTemplate): string => {
  const { businessType, mainService, keyword, country } = data;

  return `
    A professional, high-quality image representing a ${businessType} in ${country}, visually focused on ${mainService} or ${keyword}. Show a clean, modern setting with realistic people or tools, reflecting the actual work environment (e.g., office, workshop, storefront, or field). Include subtle branding elements if applicable, but avoid any visible text or logos in the image. The mood should be trustworthy, friendly, and service-focused — ideal for use on a Google Business Profile.
  `.trim();
};
