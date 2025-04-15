import OpenAI from 'openai';

export class OpenAiService {
  constructor(private readonly openAi: OpenAI) {}

  async generatePostAndImagePrompts(
    defaultPrompt: string,
    keyword: string,
    businessData: any,
  ): Promise<{
    postPrompt: string;
    imagePrompt: string;
  }> {
    const response = await this.openAi.chat.completions.create({
      model: 'gpt-4-0125-preview',
      temperature: 0.9,
      messages: [
        {
          role: 'system',
          content: `
            You are a content strategist for small businesses creating content for Google Business Profile (GBP).

            You will generate:
            1. A structured prompt (not the actual post) that can be used to later generate a 100–130 word GBP post.
            2. A Grok-compatible image prompt (based on a default image prompt and business context).

            Both outputs must:
            - Use the exact same keyword: "${keyword}"
            - Be trust-building, clean, professional, and action-oriented
            - Avoid emojis unless explicitly requested
            - Avoid phone numbers, web links, or logos
            - Use only one language (no mixing)

            The postPrompt should:
            - Be a clear instruction for generating a GBP post
            - Include tone, CTA guidance, keyword usage, and local SEO cues
            - Emphasize the business's services and trust-building elements

            The imagePrompt must:
            - Be a finalized AI prompt for a photorealistic image
            - Describe a realistic, human-centered scene related to "${keyword}" (Max 2 people)
            - Be Grok-compatible (no text or logos)
            - Use the provided businessData to ground the scene in the correct type of business, location, and environment
            - Include contextual visual elements like tools, settings, lighting, or client interaction

            Return ONLY this format:
            {
              "postPrompt": "...",
              "imagePrompt": "..."
            }
          `.trim(),
        },
        {
          role: 'user',
          content: `
            Default Image Prompt:
            "${defaultPrompt}"
            
            Business Data (JSON):
            \`\`\`json
            ${JSON.stringify(businessData, null, 2)}
            \`\`\`
          `.trim(),
        },
      ],
      response_format: { type: 'json_object' },
    });

    const result = response.choices[0]?.message?.content?.trim();
    if (!result) throw new Error('No response from OpenAI.');

    return JSON.parse(result);
  }
}
