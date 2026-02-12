# Swagger API Examples

Create a **creator** first with `POST /creators`, then use the returned `data.id` as `creatorId` in the content requests below.

---

## 1. Create creator (do this first)

```json
{
  "name": "Tech Writer",
  "email": "tech@example.com"
}
```

Use the `id` from the response (e.g. `1`) as `creatorId` in all content requests below.

---

## 2. Content examples (replace `creatorId` with your creator's id)

### Example 1
```json
{
  "title": "Getting Started with TypeScript",
  "description": "A beginner-friendly guide to TypeScript. Learn type annotations, interfaces, and how TypeScript improves your JavaScript workflow.",
  "tags": ["tech", "typescript", "javascript"],
  "creatorId": 1
}
```

### Example 2
```json
{
  "title": "Building REST APIs with NestJS",
  "description": "Step-by-step tutorial on creating scalable REST APIs using NestJS framework, TypeORM, and validation pipes.",
  "tags": ["tech", "nestjs", "api"],
  "creatorId": 1
}
```

### Example 3
```json
{
  "title": "Introduction to Machine Learning",
  "description": "Explore the fundamentals of machine learning: supervised vs unsupervised learning, common algorithms, and when to use each approach.",
  "tags": ["ai", "machine-learning", "data"],
  "creatorId": 1
}
```

### Example 4
```json
{
  "title": "PostgreSQL Full-Text Search Deep Dive",
  "description": "How to implement fast full-text search in PostgreSQL using to_tsvector, plainto_tsquery, and GIN indexes.",
  "tags": ["database", "postgresql", "search"],
  "creatorId": 1
}
```

### Example 5
```json
{
  "title": "Redis Caching Strategies",
  "description": "Cache-aside, write-through, and write-behind patterns. Best practices for cache invalidation and TTL tuning.",
  "tags": ["redis", "caching", "performance"],
  "creatorId": 1
}
```

### Example 6
```json
{
  "title": "Background Jobs with Bull Queues",
  "description": "Process long-running tasks asynchronously. Setting up Bull with Redis, job options, and error handling.",
  "tags": ["bull", "redis", "queues"],
  "creatorId": 1
}
```

### Example 7
```json
{
  "title": "LLM Function Calling with Gemini",
  "description": "How to use Gemini's function calling to let the model invoke tools, fetch data, and return structured responses.",
  "tags": ["ai", "gemini", "llm"],
  "creatorId": 1
}
```

### Example 8
```json
{
  "title": "Docker for Local Development",
  "description": "Run PostgreSQL, Redis, and other services locally with Docker Compose. Tips for faster feedback loops.",
  "tags": ["docker", "devops", "local"],
  "creatorId": 1
}
```

### Example 9
```json
{
  "title": "API Response Design Patterns",
  "description": "Consistent response structures, request IDs for tracing, and user-friendly error messages in REST APIs.",
  "tags": ["api", "design", "best-practices"],
  "creatorId": 1
}
```

### Example 10
```json
{
  "title": "Unit Testing NestJS Services",
  "description": "Mocking repositories, queues, and cache. Writing focused tests with Jest. E2E vs unit test tradeoffs.",
  "tags": ["testing", "nestjs", "jest"],
  "creatorId": 1
}
```
