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
    assistCacheTtlSeconds: parseInt(process.env.GEMINI_ASSIST_CACHE_TTL_SECONDS || '600', 10),
    assistRetryMaxAttempts: parseInt(process.env.GEMINI_ASSIST_RETRY_MAX_ATTEMPTS || '3', 10),
    assistRetryInitialDelayMs: parseInt(process.env.GEMINI_ASSIST_RETRY_INITIAL_DELAY_MS || '1000', 10),
    assistRetryMaxDelayMs: parseInt(process.env.GEMINI_ASSIST_RETRY_MAX_DELAY_MS || '10000', 10),
  },
});
