import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = await streamText({
    model: openai('gpt-4'),
    system: 'You are a helpful coding assistant. Generate only the code requested, without any explanation or markdown formatting. Do not include any other text or comments. Your output will be passed directly as VALID CODE.',
    prompt: prompt,
  });

  return result.toDataStreamResponse();
} 