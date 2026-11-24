import type { LiveStatus } from '../types/church';

/**
 * Pure URL/ID parsers and helpers for Watch Live (YouTube Live + Google Meet).
 *
 * Inline unit-test examples:
 *   parseYouTubeId('https://www.youtube.com/watch?v=dQw4w9WgXcQ') === 'dQw4w9WgXcQ'
 *   parseYouTubeId('https://youtu.be/dQw4w9WgXcQ?t=12') === 'dQw4w9WgXcQ'
 *   parseYouTubeId('https://youtube.com/live/dQw4w9WgXcQ?feature=share') === 'dQw4w9WgXcQ'
 *   parseYouTubeId('https://youtube.com/shorts/dQw4w9WgXcQ') === 'dQw4w9WgXcQ'
 *   parseYouTubeId('dQw4w9WgXcQ') === 'dQw4w9WgXcQ'
 *   parseYouTubeId('https://evil.example/abc') === null
 *
 *   parseYouTubeChannelId('UC_x5XG1OV2P6uZZ5FSM9Ttw') === 'UC_x5XG1OV2P6uZZ5FSM9Ttw'
 *   parseYouTubeChannelId('https://www.youtube.com/channel/UC_x5XG1OV2P6uZZ5FSM9Ttw') === 'UC_x5XG1OV2P6uZZ5FSM9Ttw'
 *   parseYouTubeChannelId('https://www.youtube.com/@kagwitima') === null
 *
 *   parseMeetUrl('meet.google.com/abc-defg-hij') === 'https://meet.google.com/abc-defg-hij'
 *   parseMeetUrl('https://meet.google.com/abc-defg-hij?authuser=0') === 'https://meet.google.com/abc-defg-hij'
 *   parseMeetUrl('javascript:alert(1)') === null
 *   parseMeetUrl('https://evil.com/abc-defg-hij') === null
 */

const YT_ID_RE = /^[a-zA-Z0-9_-]{11}$/;
const YT_CHANNEL_ID_RE = /^UC[a-zA-Z0-9_-]{22}$/;
const MEET_CODE_RE = /^\/([a-z]{3}-[a-z]{4}-[a-z]{3}|[a-zA-Z0-9_-]{6,32})\/?$/;

export function parseYouTubeId(input: string): string | null {
  const val = input.trim();
  if (!val) return null;
  if (YT_ID_RE.test(val)) return val;

  try {
    const withProto = /^https?:\/\//i.test(val) ? val : `https://${val}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    const isYoutube =
      host === 'youtube.com' || host === 'm.youtube.com' || host === 'youtu.be' || host === 'youtube-nocookie.com';
    if (!isYoutube) return null;

    const vParam = url.searchParams.get('v');
    if (vParam && YT_ID_RE.test(vParam)) return vParam;

    const parts = url.pathname.split('/').filter(Boolean);
    if (host === 'youtu.be' && parts[0] && YT_ID_RE.test(parts[0])) {
      return parts[0];
    }
    const idx = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'live' || p === 'v');
    if (idx !== -1 && parts[idx + 1] && YT_ID_RE.test(parts[idx + 1])) {
      return parts[idx + 1];
    }
  } catch {
    return null;
  }

  return null;
}

export function isYouTubeHandleInput(input: string): boolean {
  const val = input.trim();
  return val.includes('/@') || val.startsWith('@');
}

export function parseYouTubeChannelId(input: string): string | null {
  const val = input.trim();
  if (!val) return null;
  if (YT_CHANNEL_ID_RE.test(val)) return val;

  try {
    const withProto = /^https?:\/\//i.test(val) ? val : `https://${val}`;
    const url = new URL(withProto);
    const host = url.hostname.replace(/^www\./, '').toLowerCase();
    if (host !== 'youtube.com' && host !== 'm.youtube.com') return null;

    const parts = url.pathname.split('/').filter(Boolean);
    const idx = parts.findIndex((p) => p === 'channel');
    if (idx !== -1 && parts[idx + 1] && YT_CHANNEL_ID_RE.test(parts[idx + 1])) {
      return parts[idx + 1];
    }
  } catch {
    return null;
  }

  return null;
}

export function parseMeetUrl(input: string): string | null {
  const val = input.trim();
  if (!val) return null;

  try {
    const withProto = /^https?:\/\//i.test(val) ? val : `https://${val}`;
    const url = new URL(withProto);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    if (url.hostname.toLowerCase() !== 'meet.google.com') return null;

    const match = url.pathname.match(MEET_CODE_RE);
    if (!match) return null;

    return `https://meet.google.com/${match[1].toLowerCase()}`;
  } catch {
    return null;
  }
}

export function buildEmbedUrl(status: LiveStatus): string | null {
  if (status.mode === 'youtube') {
    const id = parseYouTubeId(status.youtubeVideoId);
    if (!id) return null;
    return `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&modestbranding=1`;
  }
  if (status.mode === 'youtube_channel') {
    const ch = parseYouTubeChannelId(status.youtubeChannelId);
    if (!ch) return null;
    return `https://www.youtube-nocookie.com/embed/live_stream?channel=${ch}&autoplay=1&rel=0&modestbranding=1`;
  }
  return null;
}

export function buildYouTubeWatchUrl(status: LiveStatus): string | null {
  if (status.mode === 'youtube') {
    const id = parseYouTubeId(status.youtubeVideoId);
    return id ? `https://www.youtube.com/watch?v=${id}` : null;
  }
  if (status.mode === 'youtube_channel') {
    const ch = parseYouTubeChannelId(status.youtubeChannelId);
    return ch ? `https://www.youtube.com/channel/${ch}/live` : null;
  }
  return null;
}

export function buildYouTubeChatUrl(status: LiveStatus, hostname: string): string | null {
  if (status.mode !== 'youtube') return null;
  const id = parseYouTubeId(status.youtubeVideoId);
  if (!id || !hostname) return null;
  return `https://www.youtube.com/live_chat?v=${id}&embed_domain=${encodeURIComponent(hostname)}`;
}

// Convert ISO string to Africa/Nairobi (+03:00) "YYYY-MM-DDTHH:mm" for datetime-local input
export function toNairobiDatetimeLocal(iso: string): string {
  if (!iso) return '';
  const ms = Date.parse(iso);
  if (Number.isNaN(ms)) return '';
  const nairobiMs = ms + 3 * 60 * 60 * 1000;
  const d = new Date(nairobiMs);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}T${pad(d.getUTCHours())}:${pad(d.getUTCMinutes())}`;
}

// Parse "YYYY-MM-DDTHH:mm" as Africa/Nairobi (+03:00) to UTC ISO string
export function fromNairobiDatetimeLocal(localStr: string): string {
  const clean = localStr.trim();
  if (!clean) return '';
  const match = clean.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/);
  if (!match) return '';
  const [, y, m, d, hh, mm] = match;
  const utcMs = Date.UTC(Number(y), Number(m) - 1, Number(d), Number(hh) - 3, Number(mm), 0, 0);
  return new Date(utcMs).toISOString();
}

// Compute the upcoming Sunday at 10:00 AM EAT (+03:00)
export function getNextSunday10amEatIso(now = new Date()): string {
  const nairobiMs = now.getTime() + 3 * 60 * 60 * 1000;
  const nairobiNow = new Date(nairobiMs);
  const day = nairobiNow.getUTCDay(); // 0 = Sunday
  let daysUntilSunday = (7 - day) % 7;
  if (daysUntilSunday === 0 && nairobiNow.getUTCHours() >= 10) {
    daysUntilSunday = 7;
  }
  const target = new Date(
    Date.UTC(
      nairobiNow.getUTCFullYear(),
      nairobiNow.getUTCMonth(),
      nairobiNow.getUTCDate() + daysUntilSunday,
      10 - 3,
      0,
      0,
      0
    )
  );
  return target.toISOString();
}

function formatIcsDateUtc(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return (
    date.getUTCFullYear() +
    pad(date.getUTCMonth() + 1) +
    pad(date.getUTCDate()) +
    'T' +
    pad(date.getUTCHours()) +
    pad(date.getUTCMinutes()) +
    pad(date.getUTCSeconds()) +
    'Z'
  );
}

function escapeIcsText(str: string): string {
  return str.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

export function buildServiceIcs(status: LiveStatus, churchName: string, pageUrl: string): string {
  const startMs = Date.parse(status.nextStartsAt);
  const start = Number.isNaN(startMs) ? new Date() : new Date(startMs);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  const summary = status.title?.trim() || `${churchName} — Live Service`;
  const descParts = [
    status.message?.trim() || `Join ${churchName} live online.`,
    `Watch online: ${pageUrl}`,
  ];
  const validMeet = parseMeetUrl(status.meetUrl);
  if (validMeet) descParts.push(`Google Meet: ${validMeet}`);

  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//KAG Emmanuel Church Witima//Watch Live//EN',
    'CALSCALE:GREGORIAN',
    'BEGIN:VEVENT',
    `UID:live-${start.getTime()}@kagwitima`,
    `DTSTAMP:${formatIcsDateUtc(new Date())}`,
    `DTSTART:${formatIcsDateUtc(start)}`,
    `DTEND:${formatIcsDateUtc(end)}`,
    `SUMMARY:${escapeIcsText(summary)}`,
    `DESCRIPTION:${escapeIcsText(descParts.join('\n'))}`,
    `URL:${pageUrl}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');
}
