export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/content_platform',
  },
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
  GEMINI_API_KEY: process.env.GEMINI_API_KEY || '',
});
