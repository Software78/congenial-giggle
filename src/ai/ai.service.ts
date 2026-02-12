import { GoogleGenAI } from '@google/genai';
import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as CacheManager from 'cache-manager';
import { v4 as uuidv4 } from 'uuid';
import { ContentService } from '../content/content.service';
import { SearchService } from '../search/search.service';

const AI_ASSIST_CACHE_KEY_PREFIX = 'ai:assist:';

const SYSTEM_PROMPT = `You are a helpful assistant for a content platform. You can:
- Summarize content by ID (use get_content_by_id with the content ID)
- Search for content by keyword or tags (use search_content)
- Provide contextual recommendations based on user queries

Always respond with valid JSON only. Do not wrap in markdown code blocks.
When summarizing, return: {"summary": "...", "contentId": <number>}.
When searching/recommending, return: {"results": [...], "message": "..."}.
Be concise and helpful.`;

@Injectable()
export class AIService {
  private readonly ai: GoogleGenAI;

  constructor(
    @Inject(CACHE_MANAGER) private readonly cacheManager: CacheManager.Cache,
    private readonly contentService: ContentService,
    private readonly searchService: SearchService,
    private readonly configService: ConfigService,
  ) {
    const apiKey = this.configService.get<string>('gemini.apiKey') || process.env.GEMINI_API_KEY;
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  async assist(query: string, requestId?: string): Promise<Record<string, unknown>> {
    const cacheTtlMs =
      (this.configService.get<number>('gemini.assistCacheTtlSeconds') ?? 600) * 1000;

    if (requestId) {
      const cached = await this.cacheManager.get<Record<string, unknown>>(
        `${AI_ASSIST_CACHE_KEY_PREFIX}${requestId}`,
      );
      if (cached) {
        return { ...cached, requestId };
      }
    }

    const id = requestId ?? uuidv4();
    const tools = this.getToolDeclarations();
    const contents: unknown[] = [
      { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nUser query: ${query}` }] },
    ];

    let result = await this.generateContentWithRetry({
      model: 'gemini-2.5-flash',
      contents: contents as never,
      config: {
        tools: [{ functionDeclarations: tools }],
      },
    });

    // Handle function call loop
    const maxIterations = 5;
    for (let i = 0; i < maxIterations; i++) {
      if (result.functionCalls && result.functionCalls.length > 0) {
        const functionCall = result.functionCalls[0];
        const { name, args = {} } = functionCall;

        let toolResult: unknown;
        if (name === 'get_content_by_id') {
          try {
            const rawId = args?.content_id;
            const contentId = typeof rawId === 'number' ? rawId : parseInt(String(rawId), 10);
            if (!contentId || isNaN(contentId)) {
              toolResult = { error: 'content_id is required and must be an integer' };
            } else {
              const content = await this.contentService.findById(contentId);
              toolResult = {
                id: content.id,
                title: content.title,
                description: content.description,
                tags: content.tags,
                status: content.status,
              };
            }
          } catch (err) {
            toolResult = { error: 'Content not found' };
          }
        } else if (name === 'search_content') {
          const items = await this.searchService.search(
            (args?.query as string) ?? '',
            args?.tags as string[] | undefined,
            10,
            0,
          );
          toolResult = {
            results: items.map((c) => ({
              id: c.id,
              title: c.title,
              description: c.description.substring(0, 200),
              tags: c.tags,
            })),
          };
        } else {
          toolResult = { error: `Unknown function: ${name}` };
        }

        const modelContent = result.candidates?.[0]?.content;
        if (modelContent) {
          contents.push(modelContent);
        }
        contents.push({
          role: 'user',
          parts: [
            {
              functionResponse: {
                name,
                response: toolResult,
              },
            },
          ],
        });

        result = await this.generateContentWithRetry({
          model: 'gemini-2.5-flash',
          contents: contents as never,
          config: {
            tools: [{ functionDeclarations: tools }],
          },
        });
      } else {
        break;
      }
    }

    const text = result.text?.trim();
    let body: Record<string, unknown>;
    if (text) {
      const stripped = this.stripMarkdownCodeBlock(text);
      try {
        body = JSON.parse(stripped) as Record<string, unknown>;
        delete body.requestId;
      } catch {
        body = { response: text };
      }
    } else {
      body = { response: 'No response generated' };
    }

    await this.cacheManager.set(`${AI_ASSIST_CACHE_KEY_PREFIX}${id}`, body, cacheTtlMs);
    return { ...body, requestId: id };
  }

  private async generateContentWithRetry(
    options: Parameters<GoogleGenAI['models']['generateContent']>[0],
  ): Promise<Awaited<ReturnType<GoogleGenAI['models']['generateContent']>>> {
    const maxAttempts = this.configService.get<number>('gemini.assistRetryMaxAttempts') ?? 3;
    const initialDelayMs =
      this.configService.get<number>('gemini.assistRetryInitialDelayMs') ?? 1000;
    const maxDelayMs = this.configService.get<number>('gemini.assistRetryMaxDelayMs') ?? 10000;

    let lastError: unknown;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await this.ai.models.generateContent(options);
      } catch (err) {
        lastError = err;
        if (attempt === maxAttempts || !this.isTransientError(err)) {
          throw err;
        }
        const delayMs = Math.min(
          initialDelayMs * Math.pow(2, attempt - 1) + Math.random() * 200,
          maxDelayMs,
        );
        await this.sleep(delayMs);
      }
    }
    throw lastError;
  }

  private isTransientError(err: unknown): boolean {
    if (err && typeof err === 'object') {
      const status = (err as { status?: number }).status;
      if (typeof status === 'number') {
        return status >= 500 || status === 429;
      }
      const code = (err as { code?: string }).code;
      if (typeof code === 'string') {
        return ['ECONNRESET', 'ETIMEDOUT', 'ENOTFOUND', 'EAI_AGAIN'].includes(code);
      }
    }
    return true;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private stripMarkdownCodeBlock(text: string): string {
    const match = text.match(/^```(?:json)?\s*\n?([\s\S]*?)\n?```$/);
    return match ? match[1].trim() : text;
  }

  private getToolDeclarations() {
    return [
      {
        name: 'get_content_by_id',
        description: 'Fetches full content by its ID. Use this when the user asks to summarize or get details of specific content.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            content_id: {
              type: 'integer',
              description: 'The numeric ID of the content to fetch',
            },
          },
          required: ['content_id'],
        },
      },
      {
        name: 'search_content',
        description: 'Searches for content by keyword and optional tags. Use for finding content, recommendations, or discovery.',
        parametersJsonSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query (keywords)',
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Optional tags to filter by',
            },
          },
          required: ['query'],
        },
      },
    ];
  }
}
