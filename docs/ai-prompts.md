# AI Assist Example Prompts

Use these prompts with `POST /ai/assist`. The AI can fetch content by ID, search by keyword and tags, and provide summaries or recommendations.

**Request body:** `{ "query": "<your prompt>" }`  
**Optional:** Add `"requestId": "<uuid>"` for idempotency (returns cached result if available).

---

## Summarize content

Fetch and summarize a specific piece of content by its numeric ID.

| Prompt | Use case |
|--------|----------|
| `Summarize the content with id 1` | Brief summary of content #1 |
| `Give me a summary of content id 3` | Same, different phrasing |
| `What is content 5 about?` | Natural-language summary |

---

## Search content

Search by keyword and optional tags. Use these when you don't know content IDs.

| Prompt | Use case |
|--------|----------|
| `Search for posts about machine learning` | Keyword search |
| `Find content tagged with tech and ai` | Search by tags |
| `What articles do you have on NestJS?` | Topic discovery |
| `Show me posts about Redis and caching` | Multiple keywords |
| `Recommend content about TypeScript` | Discovery / recommendations |

---

## Combined or contextual

The AI may chain tool calls (e.g. search first, then summarize).

| Prompt | Use case |
|--------|----------|
| `Find content about PostgreSQL and summarize the first result` | Search → summarize |
| `What's the best article about REST APIs? Give me a quick summary.` | Recommendation + summary |
| `Search for docker content, then tell me about the top match` | Multi-step |

---

## Example curl

```bash
curl -X POST http://localhost:3000/ai/assist \
  -H "Content-Type: application/json" \
  -d '{"query":"Summarize the content with id 1"}'
```

Response (wrapped in standard format):
```json
{
  "requestId": "uuid",
  "data": {
    "summary": "This article covers...",
    "contentId": 1
  },
  "code": 200,
  "message": "Success"
}
```
