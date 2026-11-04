import OpenAI from 'openai';
import tcb from '@cloudbase/node-sdk';

/**
 * Build the LLM client used by every service.
 *
 * LLM_PROVIDER=openai (default): any OpenAI-compatible endpoint
 *   (DashScope / SiliconFlow / DeepSeek ...) via OPENAI_BASE_URL.
 * LLM_PROVIDER=cloudbase: Tencent CloudBase AI through @cloudbase/node-sdk.
 *   Some CloudBase plans (e.g. 小程序成长计划) reject raw OpenAI-format HTTP
 *   calls with AI_CHANNEL_NOT_ALLOWED and only accept SDK calls.
 *   OPENAI_API_KEY holds the CloudBase API key, CLOUDBASE_ENV the env id.
 *
 * The CloudBase adapter only implements the subset of
 * `chat.completions.create` this project uses (model / messages /
 * temperature / max_tokens / stream), so callers keep the OpenAI types.
 */
export function createLlmClient(opts: { timeout?: number; maxRetries?: number } = {}): OpenAI {
  if ((process.env.LLM_PROVIDER ?? 'openai').toLowerCase() === 'cloudbase') {
    return createCloudbaseClient(opts.timeout ?? 60000);
  }
  return new OpenAI({
    apiKey: process.env.OPENAI_API_KEY ?? '',
    baseURL: process.env.OPENAI_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    ...opts,
  });
}

type CreateParams = {
  model: string;
  messages: Array<{ role: string; content: unknown }>;
  temperature?: number;
  max_tokens?: number | null;
  stream?: boolean | null;
};

function createCloudbaseClient(defaultTimeout: number): OpenAI {
  const env = process.env.CLOUDBASE_ENV;
  if (!env) throw new Error('LLM_PROVIDER=cloudbase requires CLOUDBASE_ENV');

  const app = tcb.init({ env, accessKey: process.env.OPENAI_API_KEY ?? '', timeout: defaultTimeout });
  const model = app.ai().createModel(process.env.CLOUDBASE_PROVIDER ?? 'cloudbase');

  const create = async (params: CreateParams, reqOpts?: { timeout?: number }) => {
    const input = {
      model: params.model,
      messages: params.messages,
      temperature: params.temperature,
      // Not in the SDK's input type, but its request body spreads the input,
      // so the field reaches the provider.
      ...(params.max_tokens != null ? { max_tokens: params.max_tokens } : {}),
    } as any;
    const options = { timeout: reqOpts?.timeout ?? defaultTimeout };

    if (params.stream) {
      const res = await model.streamText(input, options);
      return toChunkStream(res.textStream, params.model);
    }

    const res = await model.generateText(input, options);
    // generateText reports failures via `error` instead of throwing.
    if (res.error) throw res.error;
    return {
      id: `cb-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: params.model,
      choices: [{ index: 0, message: { role: 'assistant', content: res.text }, finish_reason: 'stop', logprobs: null }],
      usage: res.usage,
    };
  };

  return { chat: { completions: { create } } } as unknown as OpenAI;
}

/** Re-shape the SDK's plain text stream into OpenAI-style chunks. */
async function* toChunkStream(textStream: AsyncIterable<string>, model: string) {
  for await (const text of textStream) {
    if (!text) continue;
    yield { object: 'chat.completion.chunk', model, choices: [{ index: 0, delta: { content: text }, finish_reason: null }] };
  }
}
