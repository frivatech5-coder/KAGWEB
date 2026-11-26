const DRIVE_ID_RE = /^[a-zA-Z0-9_-]{20,64}$/;

/** Extracts a Google Drive file ID from share, open, uc, or usercontent URLs. */
export function extractGoogleDriveId(rawUrl: string): string | null {
  const val = (rawUrl ?? '').trim();
  if (!val) return null;

  const match = val.match(
    /(?:drive\.google\.com|docs\.google\.com|drive\.usercontent\.google\.com)\/(?:file\/d\/|open\?id=|uc\?(?:[^#]*&)?id=|download\?(?:[^#]*&)?id=)([a-zA-Z0-9_-]{20,64})/i
  );
  if (match && DRIVE_ID_RE.test(match[1])) {
    return match[1];
  }

  try {
    const parsed = new URL(val);
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'drive.google.com' ||
      host === 'docs.google.com' ||
      host === 'drive.usercontent.google.com'
    ) {
      const id = parsed.searchParams.get('id');
      if (id && DRIVE_ID_RE.test(id)) return id;
    }
  } catch {
    return null;
  }

  return null;
}

/**
 * Returns a browser-playable audio URL.
 * Google Drive links set Cross-Origin-Resource-Policy: same-site which blocks <audio>,
 * so we route them through our same-origin /api/audio range-streaming proxy.
 */
export function getPlayableAudioUrl(rawUrl: string): string {
  const trimmed = (rawUrl ?? '').trim();
  if (!trimmed) return '';
  const driveId = extractGoogleDriveId(trimmed);
  if (driveId) {
    return `/api/audio?id=${encodeURIComponent(driveId)}`;
  }
  return trimmed;
}

/** Fallback embeddable Google Drive player URL if direct audio streaming is unavailable. */
export function getGoogleDrivePreviewUrl(rawUrl: string): string | null {
  const driveId = extractGoogleDriveId(rawUrl);
  return driveId ? `https://drive.google.com/file/d/${encodeURIComponent(driveId)}/preview` : null;
}

/** Format seconds as m:ss (e.g. 0:00, 3:45). */
export function formatAudioTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) return '0:00';
  const total = Math.floor(seconds);
  const mins = Math.floor(total / 60);
  const secs = total % 60;
  return `${mins}:${String(secs).padStart(2, '0')}`;
}
