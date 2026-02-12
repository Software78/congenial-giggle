export default () => ({
  port: parseInt(process.env.PORT || '3000', 10),
  database: {
    url: process.env.DATABASE_URL,
  },
  redis: {
    host: process.env.REDIS_HOST ,
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
  },
  gemini: {
    apiKey: process.env.GEMINI_API_KEY || '',
  },
});
