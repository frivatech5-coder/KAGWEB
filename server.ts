import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { Readable } from 'node:stream';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{20,64}$/;
const RANGE_RE = /^bytes=\d*-\d*$/;

async function fetchDriveAudio(id: string, rangeHeader?: string) {
  const headers: Record<string, string> = {
    'User-Agent': 'Mozilla/5.0 (compatible; KAGWitimaAudio/1.0)',
  };
  if (rangeHeader && RANGE_RE.test(rangeHeader)) {
    headers.Range = rangeHeader;
  }

  let upstream = await fetch(
    `https://drive.google.com/uc?export=download&id=${encodeURIComponent(id)}`,
    { headers, redirect: 'follow' }
  );

  // Handle Google Drive large-file virus scan confirmation page if returned
  const contentType = upstream.headers.get('content-type') || '';
  if (upstream.ok && contentType.toLowerCase().includes('text/html')) {
    const html = await upstream.text();
    const confirmMatch = html.match(/name="confirm"\s+value="([^"]+)"/i) || html.match(/confirm=([a-zA-Z0-9_-]+)/);
    const uuidMatch = html.match(/name="uuid"\s+value="([^"]+)"/i);
    if (confirmMatch) {
      const qs = new URLSearchParams({
        id,
        export: 'download',
        confirm: confirmMatch[1],
      });
      if (uuidMatch) qs.set('uuid', uuidMatch[1]);
      upstream = await fetch(`https://drive.usercontent.google.com/download?${qs.toString()}`, {
        headers,
        redirect: 'follow',
      });
    } else {
      return null;
    }
  }

  return upstream;
}

async function startServer() {
  const app = express();

  app.get('/api/audio', async (req, res) => {
    const id = typeof req.query.id === 'string' ? req.query.id.trim() : '';
    if (!DRIVE_ID_RE.test(id)) {
      res.status(400).json({ error: 'Invalid audio ID' });
      return;
    }

    try {
      const rangeHeader = typeof req.headers.range === 'string' ? req.headers.range : undefined;
      const upstream = await fetchDriveAudio(id, rangeHeader);

      if (!upstream || (!upstream.ok && upstream.status !== 206)) {
        res.status(502).json({ error: 'Could not reach audio stream' });
        return;
      }

      const contentType = upstream.headers.get('content-type') || '';
      if (contentType.toLowerCase().includes('text/html')) {
        res.status(502).json({ error: 'Audio file is not publicly streamable' });
        return;
      }

      res.status(upstream.status);
      res.setHeader('Content-Type', contentType || 'audio/mpeg');
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
      nodeStream.on('error', () => {
        if (!res.headersSent) res.status(502).end();
        else res.end();
      });
      nodeStream.pipe(res);
    } catch {
      if (!res.headersSent) {
        res.status(502).json({ error: 'Audio stream error' });
      } else {
        res.end();
      }
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.join(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
