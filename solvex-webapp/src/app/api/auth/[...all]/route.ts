import { toNextJsHandler } from 'better-auth/next-js';
import { auth } from '@/lib/auth';

// Built per request: Better Auth needs a live Cloudflare binding.
export const POST = async (req: Request) => toNextJsHandler(auth()).POST(req);
export const GET = async (req: Request) => toNextJsHandler(auth()).GET(req);
