import { openai } from '@ai-sdk/openai';
import { convertToCoreMessages, streamText } from 'ai';

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = await streamText({
    model: openai('gpt-4o'),
    //system: 'You are a helpful assistant as part of an AI notebook running in the browser. We are using the pyodide library to run python code and have access to the matplotlib, numpy, and networkx libraries.',
    system: 'You are a helpful assistant as part of an AI notebook running in the browser. We are using jupyter kernels to run native python code. The user also has access to a Package Manager component they can use view installed packages and install new ones.',
    messages: convertToCoreMessages(messages),
  });

  return result.toDataStreamResponse();
}
