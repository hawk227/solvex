import { bucket } from '@/lib/cf';

/**
 * Serves an image straight from the R2 binding.
 *
 * Only used in local development. `CDN_BASE_URL` points at the real bucket's
 * public host, but locally uploads go into Miniflare's R2 — so every image would
 * render broken and you could not tell a genuine failure from a dev limitation.
 *
 * In production `imageUrl()` returns the CDN host and this route is never hit.
 */
export async function GET(_req: Request, ctx: RouteContext<'/api/image/[...key]'>) {
  const { key } = await ctx.params;
  const object = await bucket().get(key.join('/'));

  if (!object) return new Response('Not found', { status: 404 });

  return new Response(object.body, {
    headers: {
      'content-type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      // Deliberately not immutable: local objects get replaced while iterating.
      'cache-control': 'no-store',
    },
  });
}
