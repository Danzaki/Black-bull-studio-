export type AIStyle =
  | "Luxury"
  | "Cyberpunk"
  | "Meme"
  | "Anime"
  | "Realistic"
  | "Pixel Art";

export type AspectRatio =
  | "1:1"
  | "4:5"
  | "16:9"
  | "9:16";

interface PromptOptions {
  prompt: string;
  style: AIStyle;
  aspectRatio: AspectRatio;
}

export function buildPrompt({
  prompt,
  style,
  aspectRatio,
}: PromptOptions): string {
  return `
Create a high-quality AI image.

Subject:
${prompt}

Style:
${style}

Aspect Ratio:
${aspectRatio}

Requirements:
- Ultra detailed
- Premium quality
- Professional composition
- High resolution
- Cinematic lighting
`.trim();
}
