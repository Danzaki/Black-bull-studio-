import OpenAI from 'openai';

function getOpenAIClient() {
  const openaiApiKey = process.env.OPENAI_API_KEY;

  if (!openaiApiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable.');
  }

  return new OpenAI({ apiKey: openaiApiKey });
}

export async function createCompletion(prompt: string) {
  const openai = getOpenAIClient();
  const response = await openai.responses.create({
    model: 'gpt-4.1-mini',
    input: prompt,
  });

  return response.output_text ?? ''; 
}
