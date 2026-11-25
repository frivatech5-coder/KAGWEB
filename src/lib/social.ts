import type { SocialLinksData } from '../types/church';

export type SocialPlatform = keyof SocialLinksData;

const ALLOWED_DOMAINS: Record<SocialPlatform, readonly string[]> = {
  youtube: ['youtube.com', 'youtu.be'],
  facebook: ['facebook.com', 'fb.com'],
  x: ['x.com', 'twitter.com'],
  tiktok: ['tiktok.com'],
};

const HANDLE_RE = /^@([a-zA-Z0-9._-]{1,64})$/;

function matchesDomain(hostname: string, allowed: readonly string[]): boolean {
  const host = hostname.toLowerCase().replace(/^www\./, '');
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

/**
 * Validates and normalizes a church social media URL or @handle.
 * Accepts only https:// URLs on the platform's official domain or an @handle.
 * Returns '' if empty or invalid.
 */
export function cleanSocialUrl(platform: SocialPlatform, value: string): string {
  const raw = (value ?? '').trim();
  if (!raw) return '';

  if (raw.startsWith('@')) {
    const match = raw.match(HANDLE_RE);
    if (!match) return '';
    const handle = match[1];
    switch (platform) {
      case 'youtube':
        return `https://www.youtube.com/@${handle}`;
      case 'facebook':
        return `https://www.facebook.com/${handle}`;
      case 'x':
        return `https://x.com/${handle}`;
      case 'tiktok':
        return `https://www.tiktok.com/@${handle}`;
    }
  }

  if (!/^https:\/\//i.test(raw)) return '';

  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:') return '';
    if (!matchesDomain(url.hostname, ALLOWED_DOMAINS[platform])) return '';
    if (url.pathname === '/' && !url.search) return '';
    return url.toString();
  } catch {
    return '';
  }
}

export function getCleanedSocialLinks(social?: Partial<SocialLinksData> | null): SocialLinksData {
  return {
    youtube: cleanSocialUrl('youtube', social?.youtube ?? ''),
    facebook: cleanSocialUrl('facebook', social?.facebook ?? ''),
    x: cleanSocialUrl('x', social?.x ?? ''),
    tiktok: cleanSocialUrl('tiktok', social?.tiktok ?? ''),
  };
}

export function hasAnySocialLink(social?: Partial<SocialLinksData> | null): boolean {
  const cleaned = getCleanedSocialLinks(social);
  return Boolean(cleaned.youtube || cleaned.facebook || cleaned.x || cleaned.tiktok);
}
