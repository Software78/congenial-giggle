import { Injectable } from '@nestjs/common';
import { GoogleGenAI } from '@google/genai';
import { ContentService } from '../content/content.service';
import { SearchService } from '../search/search.service';
import { ConfigService } from '@nestjs/config';

const SYSTEM_PROMPT = `You are a helpful assistant for a content platform. You can:
- Summarize content by ID (use get_content_by_id with the content ID)
- Search for content by keyword or tags (use search_content)
- Provide contextual recommendations based on user queries

Always respond with valid JSON. When summarizing, return: {"summary": "...", "contentId": "..."}.
When searching/recommending, return: {"results": [...], "message": "..."}.
Be concise and helpful.`;

@Injectable()
export class AIService {
  private readonly ai: GoogleGenAI;

  constructor(
    private readonly contentService: ContentService,
    private readonly searchService: SearchService,
    private readonly configService: ConfigService,
  ) {
    const apiKey =
      this.configService.get<string>('GEMINI_API_KEY') ||
      this.configService.get<string>('gemini.apiKey') ||
      process.env.GEMINI_API_KEY;
    this.ai = new GoogleGenAI({ apiKey: apiKey || '' });
  }

  async assist(query: string): Promise<Record<string, unknown>> {
    const tools = this.getToolDeclarations();
    const contents: unknown[] = [
      { role: 'user', parts: [{ text: `${SYSTEM_PROMPT}\n\nUser query: ${query}` }] },
    ];

    let result = await this.ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: contents as never,
      config: {
        tools: [{ functionDeclarations: tools }],
        responseMimeType: 'application/json',
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
            const contentId = args?.content_id as string;
            if (!contentId) {
              toolResult = { error: 'content_id is required' };
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
          toolResult = items.map((c) => ({
            id: c.id,
            title: c.title,
            description: c.description.substring(0, 200),
            tags: c.tags,
          }));
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

        result = await this.ai.models.generateContent({
          model: 'gemini-1.5-flash',
          contents: contents as never,
          config: {
            tools: [{ functionDeclarations: tools }],
            responseMimeType: 'application/json',
          },
        });
      } else {
        break;
      }
    }

    const text = result.text?.trim();
    if (text) {
      try {
        return JSON.parse(text) as Record<string, unknown>;
      } catch {
        return { response: text };
      }
    }

    return { response: 'No response generated' };
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
              type: 'string',
              description: 'The UUID of the content to fetch',
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
