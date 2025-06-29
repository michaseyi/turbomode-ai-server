import z from 'zod';
import dotenv from 'dotenv';
dotenv.config();

const envConfigSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  SERVICE_NAME: z.string().default('turbomode ai server'),
  PORT: z.coerce.number().default(3000),
  API_PREFIX: z.string().default('/api'),

  JWT_SECRET: z.string(),
  JWT_EXPIRES_IN: z.string().default('7d'),
  JWT_REFRESH_EXPIRES_IN: z.string().default('30d'),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALLBACK_URL: z.string().default('http://localhost:3001/oauth/callback'),
  GOOGLE_APPLICATION_CREDENTIALS: z.string(),
  GOOGLE_PUBSUB_INCOMING_MAIL_SUB: z.string(),
  GOOGLE_PUBSUB_INCOMING_MAIL_TOPIC: z.string(),

  DATABASE_URL: z.string(),

  CORS_ORIGIN: z.string().default('*'),

  REQUEST_TIMEOUT: z.coerce.number().default(60000),
  GROQ_API_KEY: z.string(),
  TAVILY_API_KEY: z.string(),

  PINECONE_API_KEY: z.string(),

  QDRANT_URL: z.string(),
  QDRANT_API_KEY: z.string().optional(),

  REDIS_URL: z.string(),

  FRONTEND_URL: z.string(),
});

export const env = envConfigSchema.parse({
  NODE_ENV: process.env.NODE_ENV,
  SERVICE_NAME: process.env.SERVICE_NAME,
  PORT: process.env.PORT,
  API_PREFIX: process.env.API_PREFIX,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN,
  JWT_REFRESH_EXPIRES_IN: process.env.JWT_REFRESH_EXPIRES_IN,
  GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID,
  GOOGLE_CLIENT_SECRET: process.env.GOOGLE_CLIENT_SECRET,
  GOOGLE_CALLBACK_URL: process.env.GOOGLE_CALLBACK_URL,
  DATABASE_URL: process.env.DATABASE_URL,
  CORS_ORIGIN: process.env.CORS_ORIGIN,
  REQUEST_TIMEOUT: process.env.REQUEST_TIMEOUT,
  GROQ_API_KEY: process.env.GROQ_API_KEY,
  GOOGLE_APPLICATION_CREDENTIALS: process.env.GOOGLE_APPLICATION_CREDENTIALS,
  GOOGLE_PUBSUB_INCOMING_MAIL_SUB: process.env.GOOGLE_PUBSUB_INCOMING_MAIL_SUB,
  GOOGLE_PUBSUB_INCOMING_MAIL_TOPIC: process.env.GOOGLE_PUBSUB_INCOMING_MAIL_TOPIC,
  FRONTEND_URL: process.env.FRONTEND_URL,
  TAVILY_API_KEY: process.env.TAVILY_API_KEY,
  PINECONE_API_KEY: process.env.PINECONE_API_KEY,
  QDRANT_URL: process.env.QDRANT_URL,
  REDIS_URL: process.env.REDIS_URL,
  QDRANT_API_KEY: process.env.QDRANT_API_KEY,
});
