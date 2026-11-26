import React, { useEffect, useRef, useState } from 'react';
import { Download, Play, Pause, Music2, Loader2 } from 'lucide-react';
import type { MusicTrack } from '../lib/firebase';
import { formatAudioTime, getGoogleDrivePreviewUrl, getPlayableAudioUrl } from '../lib/audio';
import { Reveal, ShareSectionButton } from './Site';

const mb = (n: number) => (n / 1048576).toFixed(1) + ' MB';

export const Music: React.FC = () => {
  const [tracks, setTracks] = useState<MusicTrack[] | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [bufferingId, setBufferingId] = useState<string | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [previewFallbackId, setPreviewFallbackId] = useState<string | null>(null);
  const [errorTrackId, setErrorTrackId] = useState<string | null>(null);
  const audio = useRef<HTMLAudioElement>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;
    let cancelled = false;
    import('../lib/firebase')
      .then((m) => {
        if (cancelled) return;
        unsub = m.subscribeToMusic(setTracks, () => setTracks([]));
      })
      .catch(() => setTracks([]));
    return () => {
      cancelled = true;
      unsub?.();
      audio.current?.pause();
    };
  }, []);

  const handleTrackFailure = (t: MusicTrack) => {
    setBufferingId(null);
    setIsPlaying(false);
    if (getGoogleDrivePreviewUrl(t.url)) {
      setPreviewFallbackId(t.id);
      setErrorTrackId(null);
    } else {
      setErrorTrackId(t.id);
    }
  };

  const toggle = (t: MusicTrack) => {
    const playableUrl = getPlayableAudioUrl(t.url);
    if (!playableUrl) return;

    if (previewFallbackId === t.id) {
      setPreviewFallbackId(null);
      return;
    }

    const a = audio.current;
    if (!a) return;

    setPreviewFallbackId(null);
    setErrorTrackId(null);

    if (activeId === t.id) {
      if (isPlaying) {
        a.pause();
        setIsPlaying(false);
      } else {
        setBufferingId(t.id);
        a.play()
          .then(() => {
            setIsPlaying(true);
            setBufferingId(null);
          })
          .catch(() => handleTrackFailure(t));
      }
      return;
    }

    setActiveId(t.id);
    setIsPlaying(false);
    setCurrentTime(0);
    setDuration(0);
    setBufferingId(t.id);

    a.src = playableUrl;
    a.play()
      .then(() => {
        setIsPlaying(true);
        setBufferingId(null);
      })
      .catch(() => handleTrackFailure(t));
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const a = audio.current;
    const next = Number(e.target.value);
    if (!a || !Number.isFinite(next)) return;
    a.currentTime = next;
    setCurrentTime(next);
  };

  const activeTrack = tracks?.find((t) => t.id === activeId) ?? null;

  return (
    <section id="music" className="py-12 md:py-20 bg-sand">
      <Reveal className="mx-auto max-w-4xl px-5">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="font-hand text-2xl text-clay">Worship with us at home</p>
            <h2 className="text-3xl md:text-5xl font-bold text-pine mt-1">
              Our songs, <span className="scribble">free to download</span>
            </h2>
          </div>
          <ShareSectionButton
            anchor="#music"
            title="Worship Songs · KAG Emmanuel Church Witima"
            text="Listen to worship songs from KAG Emmanuel Witima:"
          />
        </div>
        <p className="mt-4 text-ink/75 max-w-xl">
          Songs recorded by our choir and worship team. Play them here first, or download and share with your family and friends.
        </p>

        <audio
          ref={audio}
          preload="none"
          onPlaying={() => {
            setIsPlaying(true);
            setBufferingId(null);
          }}
          onPause={() => setIsPlaying(false)}
          onWaiting={() => {
            if (activeId) setBufferingId(activeId);
          }}
          onCanPlay={() => setBufferingId(null)}
          onLoadedMetadata={(e) => {
            const d = e.currentTarget.duration;
            if (Number.isFinite(d)) setDuration(d);
          }}
          onTimeUpdate={(e) => {
            setCurrentTime(e.currentTarget.currentTime);
            const d = e.currentTarget.duration;
            if (Number.isFinite(d) && d > 0) setDuration(d);
          }}
          onEnded={() => {
            setIsPlaying(false);
            setBufferingId(null);
            setCurrentTime(0);
          }}
          onError={() => {
            if (activeTrack) handleTrackFailure(activeTrack);
          }}
        />

        <ul className="mt-8 space-y-3">
          {tracks === null && <li className="text-ink/60">Loading songs…</li>}
          {tracks?.length === 0 && (
            <li className="rounded-2xl border-2 border-dashed border-gold/60 p-8 text-center text-ink/70">
              <Music2 className="mx-auto mb-2 text-gold" /> New songs are coming soon. Check back after Sunday!
            </li>
          )}
          {tracks?.map((t) => {
            const isThisActive = activeId === t.id && previewFallbackId !== t.id && errorTrackId !== t.id;
            const isThisPlaying = isThisActive && isPlaying;
            const isThisBuffering = bufferingId === t.id;
            const previewUrl = previewFallbackId === t.id ? getGoogleDrivePreviewUrl(t.url) : null;

            return (
              <li key={t.id} className="bg-paper rounded-2xl p-3 pr-4 shadow-sm space-y-3">
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => toggle(t)}
                    aria-label={(isThisPlaying ? 'Pause ' : 'Play ') + t.title}
                    className={`shrink-0 grid place-items-center size-12 rounded-full text-white transition ${
                      isThisPlaying ? 'bg-clay hover:bg-pine' : 'bg-pine hover:bg-clay'
                    }`}
                  >
                    {isThisBuffering ? (
                      <Loader2 size={20} className="animate-spin" />
                    ) : isThisPlaying ? (
                      <Pause size={20} />
                    ) : (
                      <Play size={20} className="ml-0.5" />
                    )}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold truncate">{t.title}</p>
                    <p className="text-sm text-ink/60 truncate">
                      {t.artist || 'KAG Emmanuel Witima'}
                      {t.size ? ` · ${mb(t.size)}` : ''}
                    </p>
                  </div>

                  {t.url?.trim() && (
                    <a
                      href={t.url.trim()}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-line text-pine !min-h-11 !px-4 !py-2 text-sm"
                      aria-label={'Download ' + t.title}
                    >
                      <Download size={16} /> <span className="hidden sm:inline">Download</span>
                    </a>
                  )}
                </div>

                {isThisActive && (
                  <div className="pl-1 pr-1 pb-1 flex items-center gap-3 text-xs font-semibold text-ink/70 tabular-nums">
                    <span className="w-10 shrink-0">{formatAudioTime(currentTime)}</span>
                    <input
                      type="range"
                      min={0}
                      max={duration > 0 ? duration : 100}
                      step={0.5}
                      value={duration > 0 ? Math.min(currentTime, duration) : 0}
                      onChange={handleSeek}
                      disabled={!duration}
                      aria-label={`Seek ${t.title}`}
                      className="flex-1 h-2 accent-clay cursor-pointer"
                    />
                    <span className="w-10 shrink-0 text-right">
                      {duration > 0 ? formatAudioTime(duration) : isThisBuffering ? '…' : '0:00'}
                    </span>
                  </div>
                )}

                {previewUrl && (
                  <div className="pt-1">
                    <iframe
                      src={previewUrl}
                      title={`Listen to ${t.title}`}
                      allow="autoplay"
                      className="w-full h-16 rounded-xl border border-ink/10 bg-white"
                    />
                  </div>
                )}

                {errorTrackId === t.id && (
                  <p role="status" className="text-xs font-semibold text-clay pl-1">
                    Could not play this audio in the browser — tap Download to listen on your device.
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      </Reveal>
    </section>
  );
};
