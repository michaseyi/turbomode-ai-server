import 'hono';
import { AuthUser } from '@/types/auth.type';

declare module 'hono' {
  interface ContextVariableMap {
    user: AuthUser | undefined;
  }
}
