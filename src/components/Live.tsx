import React, { useEffect, useRef, useState } from 'react';
import {
  BellPlus,
  Check,
  Clock,
  ExternalLink,
  MessageSquare,
  Radio,
  Share2,
  Video,
  X,
} from 'lucide-react';
import type { LiveStatus } from '../types/church';
import {
  buildEmbedUrl,
  buildServiceIcs,
  buildYouTubeChatUrl,
  buildYouTubeWatchUrl,
  parseMeetUrl,
} from '../lib/live';

export const LiveBanner: React.FC<{
  live: LiveStatus;
  dismissed: boolean;
  onDismiss: () => void;
}> = ({ live, dismissed, onDismiss }) => {
  if (!live.isLive || live.mode === 'off' || dismissed) return null;

  const title = live.title?.trim() || 'Sunday Service';

  return (
    <div
      role="region"
      aria-label="Live service notification"
      aria-live="polite"
      className="bg-clay text-white border-b border-black/10"
    >
      <div className="mx-auto max-w-5xl px-4 sm:px-5 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className="relative flex size-3 shrink-0" aria-hidden="true">
            <span className="animate-ping motion-reduce:animate-none absolute inline-flex h-full w-full rounded-full bg-white opacity-80" />
            <span className="relative inline-flex rounded-full size-3 bg-red-600 ring-2 ring-white" />
          </span>
          <p className="text-sm sm:text-base font-bold truncate">
            We are live: {title}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <a
            href="#live"
            className="min-h-11 px-4 rounded-full bg-white text-pine text-sm font-bold inline-flex items-center justify-center hover:bg-paper transition"
          >
            Watch now
          </a>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss live notification"
            className="min-h-11 min-w-11 rounded-full grid place-items-center text-white/90 hover:bg-black/15 transition"
          >
            <X size={18} />
          </button>
        </div>
      </div>
    </div>
  );
};

function getCountdownParts(targetMs: number, nowMs: number) {
  const diff = Math.max(0, targetMs - nowMs);
  const totalSec = Math.floor(diff / 1000);
  const days = Math.floor(totalSec / 86400);
  const hours = Math.floor((totalSec % 86400) / 3600);
  const minutes = Math.floor((totalSec % 3600) / 60);
  const seconds = totalSec % 60;
  return { diff, days, hours, minutes, seconds };
}

function formatTimeZones(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  const localTime = new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  const kenyaTime = new Intl.DateTimeFormat('en-KE', {
    timeZone: 'Africa/Nairobi',
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date);

  return { localTime, kenyaTime };
}

export const LiveSection: React.FC<{ live: LiveStatus; churchName: string }> = ({
  live,
  churchName,
}) => {
  const sectionRef = useRef<HTMLElement>(null);
  const [nearViewport, setNearViewport] = useState(false);
  const [iframeFailed, setIframeFailed] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);
  const [nowMs, setNowMs] = useState(() => Date.now());

  useEffect(() => {
    setIframeFailed(false);
  }, [live.mode, live.youtubeVideoId, live.youtubeChannelId, live.isLive]);

  // Lazy-mount YouTube iframe only when section is near the viewport and live
  useEffect(() => {
    if (live.mode === 'off' || !live.isLive) return;
    const el = sectionRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') {
      setNearViewport(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setNearViewport(true);
          observer.disconnect();
        }
      },
      { rootMargin: '250px' }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [live.mode, live.isLive]);

  const targetMs = live.nextStartsAt ? Date.parse(live.nextStartsAt) : NaN;
  const hasFutureStart = !live.isLive && !Number.isNaN(targetMs) && targetMs > nowMs;

  // Countdown tick (pauses when browser tab is hidden)
  useEffect(() => {
    if (!hasFutureStart) return;
    let timer: number | undefined;

    const startTicking = () => {
      if (timer !== undefined) window.clearInterval(timer);
      if (document.hidden) return;
      setNowMs(Date.now());
      timer = window.setInterval(() => {
        setNowMs(Date.now());
      }, 1000);
    };

    const handleVisibility = () => {
      if (document.hidden) {
        if (timer !== undefined) {
          window.clearInterval(timer);
          timer = undefined;
        }
      } else {
        startTicking();
      }
    };

    startTicking();
    document.addEventListener('visibilitychange', handleVisibility);
    return () => {
      if (timer !== undefined) window.clearInterval(timer);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, [hasFutureStart, live.nextStartsAt]);

  if (live.mode === 'off') return null;

  const embedUrl = buildEmbedUrl(live);
  const watchUrl = buildYouTubeWatchUrl(live);
  const hostname = typeof window !== 'undefined' ? window.location.hostname : '';
  const chatUrl = buildYouTubeChatUrl(live, hostname);
  const meetUrl = parseMeetUrl(live.meetUrl);
  const showMeet = Boolean(meetUrl && (live.mode === 'meet' || live.showMeetButton));
  const title = live.title?.trim() || 'Sunday Celebration Service';

  const handleShare = async () => {
    const shareUrl = `${window.location.origin}/#live`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${churchName} — ${title}`,
          text: `Join us live at ${churchName}: ${title}`,
          url: shareUrl,
        });
        return;
      } catch {
        // Fall through to copy link if share cancelled or unsupported
      }
    }
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopiedShare(true);
      window.setTimeout(() => setCopiedShare(false), 2500);
    } catch {
      // Ignore clipboard error
    }
  };

  const handleDownloadIcs = () => {
    const pageUrl = `${window.location.origin}/#live`;
    const ics = buildServiceIcs(live, churchName, pageUrl);
    const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kag-witima-live-service.ics';
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  };

  const isOfflineNetwork = typeof navigator !== 'undefined' && navigator.onLine === false;

  return (
    <section
      ref={sectionRef}
      id="live"
      aria-live="polite"
      className="py-14 md:py-20 bg-sand border-b border-ink/10"
    >
      <div className="mx-auto max-w-5xl px-5">
        {live.isLive ? (
          live.mode === 'meet' ? (
            <div className="bg-paper rounded-3xl p-6 sm:p-10 shadow-md border border-gold/40 max-w-3xl mx-auto">
              <div className="inline-flex items-center gap-2 rounded-full bg-red-100 text-red-800 px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide">
                <span className="size-2.5 rounded-full bg-red-600 animate-pulse motion-reduce:animate-none" />
                Live on Google Meet
              </div>
              <p className="font-hand text-3xl text-clay mt-4">Join our prayer meeting online</p>
              <h2 className="text-3xl sm:text-4xl font-bold text-pine mt-1">{title}</h2>
              {live.message?.trim() && (
                <p className="mt-3 text-base sm:text-lg text-ink/80 leading-relaxed">
                  {live.message.trim()}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                {meetUrl && (
                  <a
                    href={meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-clay"
                  >
                    <Video size={18} />
                    <span>Join on Google Meet</span>
                    <ExternalLink size={15} />
                  </a>
                )}
                <button
                  type="button"
                  onClick={handleShare}
                  className="btn btn-line text-pine"
                >
                  {copiedShare ? <Check size={18} /> : <Share2 size={18} />}
                  <span>{copiedShare ? 'Link copied' : 'Share'}</span>
                </button>
              </div>

              <ol className="mt-8 grid sm:grid-cols-3 gap-3 text-sm">
                <li className="rounded-2xl bg-sand/70 p-4 border border-ink/10">
                  <span className="font-display font-bold text-pine block">1. Tap the button</span>
                  <span className="text-ink/75">Opens Google Meet in your browser or the Meet app.</span>
                </li>
                <li className="rounded-2xl bg-sand/70 p-4 border border-ink/10">
                  <span className="font-display font-bold text-pine block">2. Allow microphone</span>
                  <span className="text-ink/75">Allow microphone access if you wish to speak or pray.</span>
                </li>
                <li className="rounded-2xl bg-sand/70 p-4 border border-ink/10">
                  <span className="font-display font-bold text-pine block">3. Mute when listening</span>
                  <span className="text-ink/75">Keep your microphone muted while others are sharing.</span>
                </li>
              </ol>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-2 rounded-full bg-red-600 text-white px-3.5 py-1.5 text-xs font-bold uppercase tracking-wide">
                  <Radio size={14} className="animate-pulse motion-reduce:animate-none" />
                  Live now
                </span>
                <p className="font-hand text-2xl text-clay">Worship with us online</p>
              </div>

              <h2 className="text-3xl md:text-5xl font-bold text-pine">{title}</h2>
              {live.message?.trim() && (
                <p className="text-base sm:text-lg text-ink/80 max-w-2xl">{live.message.trim()}</p>
              )}

              <div className="relative aspect-video w-full rounded-2xl overflow-hidden shadow-lg bg-black">
                {embedUrl && nearViewport && !iframeFailed && !isOfflineNetwork ? (
                  <iframe
                    src={embedUrl}
                    title={title}
                    allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                    referrerPolicy="strict-origin-when-cross-origin"
                    allowFullScreen
                    onError={() => setIframeFailed(true)}
                    className="absolute inset-0 size-full border-0"
                  />
                ) : (
                  <div className="absolute inset-0 grid place-items-center p-6 text-center text-white bg-pine">
                    <div className="space-y-4 max-w-md">
                      <p className="font-display text-2xl font-bold">
                        {isOfflineNetwork
                          ? 'You appear to be offline'
                          : iframeFailed
                          ? 'Having trouble loading the video player'
                          : 'Preparing livestream...'}
                      </p>
                      {watchUrl && (
                        <a
                          href={watchUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-clay"
                        >
                          <ExternalLink size={18} />
                          <span>Having trouble? Open it on YouTube</span>
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap gap-3">
                  {watchUrl && (
                    <a
                      href={watchUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-clay"
                    >
                      <ExternalLink size={17} />
                      <span>Open on YouTube</span>
                    </a>
                  )}
                  {chatUrl && (
                    <a
                      href={chatUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-line text-pine"
                    >
                      <MessageSquare size={17} />
                      <span>Open chat</span>
                    </a>
                  )}
                  {showMeet && meetUrl && (
                    <a
                      href={meetUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-line text-pine"
                    >
                      <Video size={17} />
                      <span>Join on Google Meet</span>
                    </a>
                  )}
                  <button
                    type="button"
                    onClick={handleShare}
                    className="btn btn-line text-pine"
                  >
                    {copiedShare ? <Check size={17} /> : <Share2 size={17} />}
                    <span>{copiedShare ? 'Link copied' : 'Share'}</span>
                  </button>
                </div>

                {watchUrl && (
                  <a
                    href={watchUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-ink/70 underline underline-offset-4 hover:text-pine"
                  >
                    Having trouble? Open it on YouTube
                  </a>
                )}
              </div>
            </div>
          )
        ) : hasFutureStart ? (
          (() => {
            const parts = getCountdownParts(targetMs, nowMs);
            const tz = formatTimeZones(live.nextStartsAt);
            return (
              <div className="bg-paper rounded-3xl p-6 sm:p-10 shadow-md border border-gold/40">
                <div className="grid md:grid-cols-[1.2fr_1fr] gap-8 items-center">
                  <div>
                    <p className="font-hand text-2xl text-clay">Next live service</p>
                    <h2 className="text-3xl sm:text-4xl font-bold text-pine mt-1">{title}</h2>
                    {live.message?.trim() && (
                      <p className="mt-3 text-ink/80">{live.message.trim()}</p>
                    )}

                    {tz && (
                      <div className="mt-4 space-y-1 text-sm text-ink/75">
                        <p className="flex items-center gap-2">
                          <Clock size={16} className="text-clay shrink-0" />
                          <span>
                            <b>Your local time:</b> {tz.localTime}
                          </span>
                        </p>
                        <p className="pl-6 text-ink/65">
                          <b>Kenya time (EAT):</b> {tz.kenyaTime}
                        </p>
                      </div>
                    )}

                    <div className="mt-6 flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={handleDownloadIcs}
                        className="btn btn-clay"
                      >
                        <BellPlus size={18} />
                        <span>Remind me</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleShare}
                        className="btn btn-line text-pine"
                      >
                        {copiedShare ? <Check size={17} /> : <Share2 size={17} />}
                        <span>{copiedShare ? 'Link copied' : 'Share'}</span>
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-4 gap-2 sm:gap-3 text-center">
                    {[
                      ['Days', parts.days],
                      ['Hours', parts.hours],
                      ['Mins', parts.minutes],
                      ['Secs', parts.seconds],
                    ].map(([label, val]) => (
                      <div
                        key={String(label)}
                        className="rounded-2xl bg-pine text-white py-4 px-2 shadow-sm"
                      >
                        <p className="font-display text-2xl sm:text-4xl font-bold text-gold tabular-nums">
                          {String(val).padStart(2, '0')}
                        </p>
                        <p className="text-xs uppercase tracking-wider text-white/75 mt-1">
                          {label}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()
        ) : (
          <div className="bg-paper rounded-3xl p-6 sm:p-10 shadow-sm border border-gold/40 flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div>
              <p className="font-hand text-2xl text-clay">Online Sanctuary</p>
              <h2 className="text-2xl sm:text-3xl font-bold text-pine mt-1">
                We are not live right now
              </h2>
              <p className="mt-2 text-ink/75">
                We are not live right now. Catch up with a recent sermon while we prepare for our next gathering.
              </p>
            </div>
            <a href="#sermons" className="btn btn-clay shrink-0">
              Catch up on sermons
            </a>
          </div>
        )}
      </div>
    </section>
  );
};
