import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export async function POST(req: Request) {
  const { prompt } = await req.json();

  const result = await streamText({
    model: openai("gpt-4o"),
    system: `
      You are a coding assistant.
      Your task is to generate only the code requested.
      Do not include any explanations, comments, or markdown formatting.
      Do not include any text other than the code itself.
      The output must be valid code and nothing else.
      Absolutely no explanatory text or backticks should be included.
      Only provide the code. No other text is allowed. Do not wrap it with triple backticks. Just code.
      DO NOT START THE CODE WITH TRIPLE BACKTICKS.
    `,
    prompt: prompt,
  });

  return result.toDataStreamResponse();
}