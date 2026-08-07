export interface GenerateImageOptions {
  prompt: string;
  style: string;
  aspectRatio: string;
}

export interface GenerateImageResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
}

export async function generateImage(
  options: GenerateImageOptions
): Promise<GenerateImageResult> {
  console.log("Generating image with:", options);

  // TODO:
  // Connect OpenAI / Gemini / Flux image API here.

  return {
    success: true,
    imageUrl: "/images/placeholder.png",
  };
}

