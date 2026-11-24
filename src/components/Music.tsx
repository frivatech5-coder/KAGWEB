import React, { useEffect, useRef, useState } from 'react';
import { Download, Play, Pause, Music2 } from 'lucide-react';
import type { MusicTrack } from '../lib/firebase';

const mb = (n: number) => (n / 1048576).toFixed(1) + ' MB';

export const Music: React.FC = () => {
  const [tracks, setTracks] = useState<MusicTrack[] | null>(null);
  const [playing, setPlaying] = useState<string | null>(null);
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
    };
  }, []);

  const toggle = (t: MusicTrack) => {
    const a = audio.current;
    if (!a || !t.url?.trim()) return;
    if (playing === t.id) {
      a.pause();
      setPlaying(null);
      return;
    }
    a.src = t.url.trim();
    a.play().then(() => setPlaying(t.id)).catch(() => setPlaying(null));
  };

  return (
    <section id="music" className="py-16 md:py-24 bg-sand">
      <div className="mx-auto max-w-4xl px-5">
        <p className="font-hand text-2xl text-clay">Worship with us at home</p>
        <h2 className="text-3xl md:text-5xl font-bold text-pine mt-1">
          Our songs, <span className="scribble">free to download</span>
        </h2>
        <p className="mt-4 text-ink/75 max-w-xl">
          Songs recorded by our choir and worship team. Play them here, or download and share with your family and friends.
        </p>

        <audio ref={audio} onEnded={() => setPlaying(null)} preload="none" />

        <ul className="mt-8 space-y-3">
          {tracks === null && <li className="text-ink/60">Loading songs…</li>}
          {tracks?.length === 0 && (
            <li className="rounded-2xl border-2 border-dashed border-gold/60 p-8 text-center text-ink/70">
              <Music2 className="mx-auto mb-2 text-gold" /> New songs are coming soon. Check back after Sunday!
            </li>
          )}
          {tracks?.map((t) => (
            <li key={t.id} className="flex items-center gap-3 bg-paper rounded-2xl p-3 pr-4 shadow-sm">
              <button
                onClick={() => toggle(t)}
                aria-label={(playing === t.id ? 'Pause ' : 'Play ') + t.title}
                className="shrink-0 grid place-items-center size-12 rounded-full bg-pine text-white hover:bg-clay transition"
              >
                {playing === t.id ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
              </button>
              <div className="min-w-0 flex-1">
                <p className="font-bold truncate">{t.title}</p>
                <p className="text-sm text-ink/60 truncate">
                  {t.artist || 'KAG Emmanuel Witima'} · {mb(t.size)}
                </p>
              </div>
              {t.url?.trim() && (
                <a
                  href={t.url.trim()}
                  className="btn btn-line text-pine !min-h-11 !px-4 !py-2 text-sm"
                  aria-label={'Download ' + t.title}
                >
                  <Download size={16} /> <span className="hidden sm:inline">Download</span>
                </a>
              )}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
};
