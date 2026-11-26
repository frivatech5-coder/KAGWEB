import type { IncomingMessage, ServerResponse } from 'node:http';
import { Readable } from 'node:stream';

const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{20,64}$/;
const RANGE_RE = /^bytes=(\d+)-(\d*)$/;
const MAX_VERCEL_CHUNK_BYTES = 2 * 1024 * 1024; // 2 MB per range chunk (safely under 4.5 MB limit)

function normalizeRange(rawRange?: string): string {
  if (!rawRange) return `bytes=0-${MAX_VERCEL_CHUNK_BYTES - 1}`;
  const m = rawRange.trim().match(RANGE_RE);
  if (!m) return `bytes=0-${MAX_VERCEL_CHUNK_BYTES - 1}`;
  const start = Number(m[1]);
  const requestedEnd = m[2] ? Number(m[2]) : start + MAX_VERCEL_CHUNK_BYTES - 1;
  const clampedEnd = Math.min(requestedEnd, start + MAX_VERCEL_CHUNK_BYTES - 1);
  return `bytes=${start}-${Math.max(start, clampedEnd)}`;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  const host = req.headers.host || 'localhost';
  const url = new URL(req.url || '/api/audio', `https://${host}`);
  const id = (url.searchParams.get('id') || '').trim();

  if (!DRIVE_ID_RE.test(id)) {
    res.statusCode = 400;
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify({ error: 'Invalid audio ID' }));
    return;
  }

  try {
    const rangeHeader = normalizeRange(
      typeof req.headers.range === 'string' ? req.headers.range : undefined
    );
    const headers: Record<string, string> = {
      'User-Agent': 'Mozilla/5.0 (compatible; KAGWitimaAudio/1.0)',
      Range: rangeHeader,
    };

    let upstream = await fetch(
      `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
      { headers, redirect: 'follow' }
    );

    const contentType = upstream.headers.get('content-type') || '';
    if (upstream.ok && contentType.toLowerCase().includes('text/html')) {
      const html = await upstream.text();
      const confirmMatch =
        html.match(/name="confirm"\s+value="([^"]+)"/i) || html.match(/confirm=([a-zA-Z0-9_-]+)/);
      const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/i);
      if (!confirmMatch) {
        res.statusCode = 502;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'Audio file is not publicly accessible' }));
        return;
      }
      const qs = new URLSearchParams({ id, export: 'download', confirm: confirmMatch[1] });
      if (uuidMatch) qs.set('uuid', uuidMatch[1]);
      upstream = await fetch(`https://drive.usercontent.google.com/download?${qs.toString()}`, {
        headers,
        redirect: 'follow',
      });
    }

    if (!upstream.ok && upstream.status !== 206) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Could not reach audio stream' }));
      return;
    }

    const finalType = upstream.headers.get('content-type') || 'audio/mpeg';
    if (finalType.toLowerCase().includes('text/html')) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Audio file is not publicly streamable' }));
      return;
    }

    res.statusCode = upstream.status;
    res.setHeader('Content-Type', finalType);
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=3600');
    res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');

    const contentLength = upstream.headers.get('content-length');
    if (contentLength) res.setHeader('Content-Length', contentLength);

    const contentRange = upstream.headers.get('content-range');
    if (contentRange) res.setHeader('Content-Range', contentRange);

    if (!upstream.body) {
      res.end();
      return;
    }

    const nodeStream = Readable.fromWeb(upstream.body as unknown as import('node:stream/web').ReadableStream);
    res.on('close', () => {
      if (!nodeStream.destroyed) nodeStream.destroy();
    });
    nodeStream.pipe(res);
  } catch {
    if (!res.headersSent) {
      res.statusCode = 502;
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify({ error: 'Audio stream error' }));
    } else {
      res.end();
    }
  }
}
