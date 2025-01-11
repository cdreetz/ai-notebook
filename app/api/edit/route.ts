import { openai } from '@ai-sdk/openai';
import { streamText } from 'ai';

export async function POST(req: Request) {
  const { prompt, selectedCode } = await req.json();

  const structuredPrompt = `SELECTED CODE:\n${selectedCode}\n\nINSTRUCTION:\n${prompt}`;
  
  const result = await streamText({
    model: openai('gpt-4'),
    system: `You are a helpful coding assistant specializing in code edits.
       You will receive the selected code and an instruction for how to modify it.
       Generate only the modified code, without any explanation or markdown formatting.
       Your output will replace the selected code directly.
       Don't include backticks or any other text/comments.`,
    prompt: structuredPrompt,
  });

  return result.toDataStreamResponse();
} 