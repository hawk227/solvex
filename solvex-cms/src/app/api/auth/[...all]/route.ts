import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

// Better Auth needs a live Cloudflare binding, so the instance is built per
// request rather than at module scope.
export const POST = async (req: Request) => toNextJsHandler(auth()).POST(req);
export const GET = async (req: Request) => toNextJsHandler(auth()).GET(req);
