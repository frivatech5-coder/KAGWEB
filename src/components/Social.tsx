import React from 'react';
import { FaFacebook, FaTiktok, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import type { SocialLinksData } from '../types/church';
import { cleanSocialUrl, type SocialPlatform } from '../lib/social';

export interface SocialLinksProps {
  social?: Partial<SocialLinksData> | null;
  churchName?: string;
  size?: 'sm' | 'md' | 'lg';
  variant?: 'color' | 'light';
  className?: string;
}

const PLATFORMS: {
  key: SocialPlatform;
  label: string;
  brandColorClass: string;
  Icon: React.ComponentType<{ size?: number; 'aria-hidden'?: boolean }>;
}[] = [
  {
    key: 'youtube',
    label: 'YouTube',
    brandColorClass: 'text-[#FF0000]',
    Icon: FaYoutube,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    brandColorClass: 'text-[#1877F2]',
    Icon: FaFacebook,
  },
  {
    key: 'x',
    label: 'X',
    brandColorClass: 'text-[#000000]',
    Icon: FaXTwitter,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    brandColorClass: 'text-[#000000]',
    Icon: FaTiktok,
  },
];

const ICON_SIZES: Record<'sm' | 'md' | 'lg', number> = {
  sm: 19,
  md: 22,
  lg: 25,
};

export const SocialLinks: React.FC<SocialLinksProps> = ({
  social,
  churchName = 'KAG Emmanuel Witima',
  size = 'md',
  variant = 'color',
  className = '',
}) => {
  const active = PLATFORMS.map((p) => ({
    ...p,
    href: cleanSocialUrl(p.key, social?.[p.key] ?? ''),
  })).filter((p) => Boolean(p.href));

  if (active.length === 0) return null;

  const iconSize = ICON_SIZES[size];
  const shortName = churchName === 'KAG Emmanuel Church Witima' ? 'KAG Emmanuel Witima' : churchName;

  return (
    <div className={`flex flex-wrap items-center gap-3 ${className}`}>
      {active.map(({ key, label, brandColorClass, Icon, href }) => (
        <a
          key={key}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          aria-label={`${shortName} on ${label} (opens in a new tab)`}
          title={`${shortName} on ${label}`}
          className={`size-12 rounded-full inline-flex items-center justify-center shrink-0 transition-transform duration-150 hover:scale-105 motion-reduce:transform-none ${
            variant === 'light'
              ? 'bg-white/10 text-white hover:bg-white/20 focus-visible:outline-3 focus-visible:outline-gold focus-visible:outline-offset-3'
              : `bg-sand ${brandColorClass} hover:bg-[#e3d7be] focus-visible:outline-3 focus-visible:outline-clay focus-visible:outline-offset-3`
          }`}
        >
          <Icon size={iconSize} aria-hidden />
        </a>
      ))}
    </div>
  );
};
