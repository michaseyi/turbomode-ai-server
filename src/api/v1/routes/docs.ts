import { Hono } from 'hono';

const docsRouter = new Hono();

/**
 * @route GET /docs
 * @description Get api documentation
 * @access Public
 */
docsRouter.get('/');

export { docsRouter };
