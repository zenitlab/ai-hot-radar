import { Injectable, Logger } from '@nestjs/common';
import OpenAI from 'openai';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class ChatService {
  private readonly logger = new Logger(ChatService.name);
  private readonly client: OpenAI;
  private readonly model: string;

  constructor(private readonly prisma: PrismaService) {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY ?? '',
      baseURL: process.env.OPENAI_BASE_URL ?? 'https://dashscope.aliyuncs.com/compatible-mode/v1',
    });
    this.model = process.env.MODEL_NAME ?? 'qwen-coder-turbo';
  }

  async createSession(title?: string) {
    return this.prisma.chatSession.create({
      data: { title: title || '新对话' },
    });
  }

  async getSessions() {
    return this.prisma.chatSession.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async deleteSession(id: string) {
    return this.prisma.chatSession.delete({ where: { id } });
  }

  async getMessages(sessionId: string) {
    return this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
    });
  }

  /** Retrieve relevant hotspots for RAG context */
  private async retrieveContext(question: string, limit = 8) {
    const keywords = question
      .split(/\s+/)
      .filter((w) => w.length > 1)
      .slice(0, 5);

    if (!keywords.length) return [];

    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

    // Simple keyword matching across title and summary
    const conditions = keywords.map((kw) => ({
      OR: [
        { title: { contains: kw } },
        { summary: { contains: kw } },
      ],
    }));

    const items = await this.prisma.hotspot.findMany({
      where: {
        AND: [
          { OR: conditions },
          { createdAt: { gte: sevenDaysAgo } },
        ],
      },
      orderBy: [{ qualityScore: 'desc' }, { createdAt: 'desc' }],
      take: limit,
    });

    return items;
  }

  /** Stream chat response via SSE */
  async *streamChat(sessionId: string, userMessage: string): AsyncGenerator<string> {
    // Save user message
    await this.prisma.chatMessage.create({
      data: { sessionId, role: 'user', content: userMessage },
    });

    // Get conversation history (last 10 messages)
    const history = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAt: 'asc' },
      take: 10,
    });

    // RAG: retrieve relevant context
    const contextItems = await this.retrieveContext(userMessage);
    const contextText = contextItems
      .map((h, i) => `[${i + 1}] ${h.title}\n摘要: ${h.summary || h.content.slice(0, 100)}\n来源: ${h.source} | 时间: ${h.publishedAt?.toLocaleDateString('zh-CN') || '未知'}`)
      .join('\n\n');

    const systemPrompt = `你是 AIHOT 的 AI 助手，专注 AI 行业热点分析。
基于以下从数据库检索到的最新 AI 资讯来回答用户问题。如果资讯中没有相关信息，请诚实说明，不要编造内容。
回答用中文，简洁准确。

${contextText ? `=== 相关资讯 ===\n${contextText}\n=== 资讯结束 ===` : '（暂无相关资讯，请基于你的知识回答）'}`;

    const messages: OpenAI.ChatCompletionMessageParam[] = [
      { role: 'system', content: systemPrompt },
      ...history.slice(0, -1).map((m) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content,
      })),
      { role: 'user', content: userMessage },
    ];

    let fullResponse = '';

    try {
      const stream = await this.client.chat.completions.create({
        model: this.model,
        messages,
        temperature: 0.7,
        max_tokens: 1000,
        stream: true,
      });

      for await (const chunk of stream) {
        const delta = chunk.choices[0]?.delta?.content || '';
        if (delta) {
          fullResponse += delta;
          yield JSON.stringify({ delta }) + '\n';
        }
      }

      // Yield sources at the end
      if (contextItems.length > 0) {
        const sources = contextItems.map((h) => ({
          id: h.id, title: h.title, url: h.url, source: h.source,
        }));
        yield JSON.stringify({ done: true, sources }) + '\n';
      } else {
        yield JSON.stringify({ done: true, sources: [] }) + '\n';
      }

      // Save assistant message
      await this.prisma.chatMessage.create({
        data: { sessionId, role: 'assistant', content: fullResponse },
      });

      // Auto-update session title if it's the first message
      const session = await this.prisma.chatSession.findUnique({ where: { id: sessionId } });
      if (session?.title === '新对话') {
        const shortTitle = userMessage.slice(0, 30);
        await this.prisma.chatSession.update({
          where: { id: sessionId },
          data: { title: shortTitle },
        });
      }
    } catch (err) {
      this.logger.error('Chat stream error:', err);
      yield JSON.stringify({ error: 'AI 服务暂时不可用，请稍后重试' }) + '\n';
    }
  }
}
