import {
  noteRouter,
  actionRouter,
  authRouter,
  healthRouter,
  integrationRouter,
  agentRouter,
} from '@/api/v1/routes';
import { OpenAPIHono } from '@hono/zod-openapi';
import { swaggerUI } from '@hono/swagger-ui';

export const v1 = new OpenAPIHono();

v1.route('/auth', authRouter);
v1.route('/health', healthRouter);
v1.route('/integrations', integrationRouter);
v1.route('/actions', actionRouter);
v1.route('/notes', noteRouter);
v1.route('/agents', agentRouter);

v1.get('/docs', swaggerUI({ url: '/api/docs' }));
