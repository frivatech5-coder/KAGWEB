import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  CalendarClock,
  Check,
  ChevronDown,
  Copy,
  ExternalLink,
  PowerOff,
  Radio,
  Tv,
  Video,
  Youtube,
} from 'lucide-react';
import { initialLiveStatus } from '../../data/defaultChurchData';
import { saveLive, subscribeToLive } from '../../lib/firebase';
import {
  buildEmbedUrl,
  fromNairobiDatetimeLocal,
  getNextSunday10amEatIso,
  isYouTubeHandleInput,
  parseMeetUrl,
  parseYouTubeChannelId,
  parseYouTubeId,
  toNairobiDatetimeLocal,
} from '../../lib/live';
import type { LiveMode, LiveStatus } from '../../types/church';
import {
  Field,
  SaveBar,
  formatAdminError,
  inputCls,
  textareaCls,
  type SaveStatus,
} from './AdminShared';

interface LiveTabProps {
  onDirtyChange: (dirty: boolean) => void;
}

const STREAM_MODES: Array<{
  id: LiveMode;
  title: string;
  desc: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}> = [
  {
    id: 'youtube',
    title: 'YouTube (paste the live link)',
    desc: 'Best for Sunday service — plays right inside the church website.',
    icon: Youtube,
  },
  {
    id: 'youtube_channel',
    title: 'YouTube channel (automatic)',
    desc: 'Always shows whatever is live on your church channel without pasting a new link each week.',
    icon: Tv,
  },
  {
    id: 'meet',
    title: 'Google Meet',
    desc: 'Best for interactive prayer meetings and Bible study — opens in the Meet app.',
    icon: Video,
  },
  {
    id: 'off',
    title: 'Off',
    desc: 'Hides the Watch Live section from the public website.',
    icon: PowerOff,
  },
];

export const LiveTab: React.FC<LiveTabProps> = ({ onDirtyChange }) => {
  const [draft, setDraft] = useState<LiveStatus>(initialLiveStatus);
  const [savedSnapshot, setSavedSnapshot] = useState<LiveStatus>(initialLiveStatus);

  const [ytVideoInput, setYtVideoInput] = useState('');
  const [ytChannelInput, setYtChannelInput] = useState('');
  const [meetInput, setMeetInput] = useState('');
  const [nairobiLocal, setNairobiLocal] = useState('');

  const [status, setStatus] = useState<SaveStatus>('clean');
  const [saveError, setSaveError] = useState<string | null>(null);
  const [liveToggleToast, setLiveToggleToast] = useState<string | null>(null);
  const [liveToggleError, setLiveToggleError] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState(false);

  const loadedRef = React.useRef(false);
  const statusRef = React.useRef<SaveStatus>('clean');
  statusRef.current = status;

  useEffect(() => {
    const unsub = subscribeToLive(
      (remote) => {
        setSavedSnapshot(remote);
        if (!loadedRef.current || statusRef.current === 'clean' || statusRef.current === 'saved') {
          setDraft(remote);
          setYtVideoInput(remote.youtubeVideoId || '');
          setYtChannelInput(remote.youtubeChannelId || '');
          setMeetInput(remote.meetUrl || '');
          setNairobiLocal(toNairobiDatetimeLocal(remote.nextStartsAt));
        }
        loadedRef.current = true;
      },
      (err) => {
        setSaveError(formatAdminError(err));
        loadedRef.current = true;
      }
    );
    return () => unsub();
  }, []);

  useEffect(() => {
    onDirtyChange(status === 'dirty');
    return () => onDirtyChange(false);
  }, [status, onDirtyChange]);

  const parsedVideoId = parseYouTubeId(ytVideoInput);
  const parsedChannelId = parseYouTubeChannelId(ytChannelInput);
  const handleChannelWarning =
    ytChannelInput.trim() !== '' && !parsedChannelId && isYouTubeHandleInput(ytChannelInput);
  const parsedMeet = parseMeetUrl(meetInput);

  const validateForMode = (candidate: LiveStatus): string | null => {
    if (candidate.mode === 'youtube' && !parseYouTubeId(candidate.youtubeVideoId)) {
      return 'Please paste a valid YouTube live link or 11-character video ID.';
    }
    if (candidate.mode === 'youtube_channel' && !parseYouTubeChannelId(candidate.youtubeChannelId)) {
      return handleChannelWarning
        ? 'That looks like an @handle link. Open your channel > About > Share channel > Copy channel ID (starts with UC).'
        : 'Please enter a valid 24-character YouTube Channel ID starting with UC.';
    }
    if (candidate.mode === 'meet' && !parseMeetUrl(candidate.meetUrl)) {
      return 'Please enter a valid Google Meet link (e.g. https://meet.google.com/abc-defg-hij).';
    }
    if (
      (candidate.mode === 'youtube' || candidate.mode === 'youtube_channel') &&
      candidate.showMeetButton &&
      !parseMeetUrl(candidate.meetUrl)
    ) {
      return 'Please enter a valid Google Meet link or uncheck "Also show a Google Meet button".';
    }
    return null;
  };

  const buildNormalizedCandidate = (override?: Partial<LiveStatus>): LiveStatus => {
    const mode = override?.mode ?? draft.mode;
    const rawYt = override?.youtubeVideoId ?? ytVideoInput;
    const rawCh = override?.youtubeChannelId ?? ytChannelInput;
    const rawMeet = override?.meetUrl ?? meetInput;
    const nextIso =
      override?.nextStartsAt !== undefined
        ? override.nextStartsAt
        : fromNairobiDatetimeLocal(nairobiLocal);

    return {
      ...draft,
      ...override,
      mode,
      title: (override?.title ?? draft.title).trim(),
      message: (override?.message ?? draft.message).trim(),
      youtubeVideoId: parseYouTubeId(rawYt) ?? rawYt.trim(),
      youtubeChannelId: parseYouTubeChannelId(rawCh) ?? rawCh.trim(),
      meetUrl: parseMeetUrl(rawMeet) ?? rawMeet.trim(),
      nextStartsAt: nextIso,
    };
  };

  const handleToggleLiveNow = async () => {
    setLiveToggleError(null);
    setLiveToggleToast(null);
    const nextIsLive = !draft.isLive;

    if (nextIsLive && draft.mode === 'off') {
      setLiveToggleError('First pick how you are streaming below (YouTube or Google Meet).');
      return;
    }

    const candidate = buildNormalizedCandidate({ isLive: nextIsLive });
    if (nextIsLive) {
      const validationErr = validateForMode(candidate);
      if (validationErr) {
        setLiveToggleError(validationErr);
        return;
      }
    }

    // Ensure sanitized values are persisted
    const toSave: LiveStatus = {
      ...candidate,
      youtubeVideoId: parseYouTubeId(candidate.youtubeVideoId) ?? '',
      youtubeChannelId: parseYouTubeChannelId(candidate.youtubeChannelId) ?? '',
      meetUrl: parseMeetUrl(candidate.meetUrl) ?? '',
      title: candidate.title || 'Sunday Celebration Service',
    };

    try {
      await saveLive(toSave);
      setDraft(toSave);
      setSavedSnapshot(toSave);
      setStatus('clean');
      setLiveToggleToast(
        nextIsLive ? 'You are LIVE on the church website!' : 'Stream switched to offline.'
      );
      window.setTimeout(() => setLiveToggleToast(null), 4000);
    } catch (err) {
      setLiveToggleError(formatAdminError(err));
    }
  };

  const handleSave = async () => {
    const candidate = buildNormalizedCandidate();
    const validationErr = validateForMode(candidate);
    if (validationErr) {
      setStatus('error');
      setSaveError(validationErr);
      return;
    }

    const sanitized: LiveStatus = {
      ...candidate,
      youtubeVideoId: parseYouTubeId(candidate.youtubeVideoId) ?? '',
      youtubeChannelId: parseYouTubeChannelId(candidate.youtubeChannelId) ?? '',
      meetUrl: parseMeetUrl(candidate.meetUrl) ?? '',
    };

    setStatus('saving');
    setSaveError(null);
    try {
      await saveLive(sanitized);
      setDraft(sanitized);
      setSavedSnapshot(sanitized);
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setSaveError(formatAdminError(err));
    }
  };

  const handleDiscard = () => {
    setDraft(savedSnapshot);
    setYtVideoInput(savedSnapshot.youtubeVideoId || '');
    setYtChannelInput(savedSnapshot.youtubeChannelId || '');
    setMeetInput(savedSnapshot.meetUrl || '');
    setNairobiLocal(toNairobiDatetimeLocal(savedSnapshot.nextStartsAt));
    setStatus('clean');
    setSaveError(null);
  };

  const applySundayPreset = () => {
    const iso = getNextSunday10amEatIso();
    setDraft((prev) => ({
      ...prev,
      title: 'Sunday Celebration Service',
      nextStartsAt: iso,
    }));
    setNairobiLocal(toNairobiDatetimeLocal(iso));
    setStatus('dirty');
    setSaveError(null);
  };

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/#live` : 'https://church-site/#live';

  const copyShareUrl = async () => {
    try {
      await navigator.clipboard?.writeText(shareUrl);
      setCopiedShareLink(true);
      window.setTimeout(() => setCopiedShareLink(false), 2500);
    } catch {
      // Ignore
    }
  };

  const previewEmbed = buildEmbedUrl({
    ...draft,
    youtubeVideoId: parsedVideoId ?? '',
    youtubeChannelId: parsedChannelId ?? '',
  });

  const videoInvalid = ytVideoInput.trim() !== '' && !parsedVideoId;
  const channelInvalid = ytChannelInput.trim() !== '' && !parsedChannelId;
  const meetInvalid = meetInput.trim() !== '' && !parsedMeet;

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-pine">Watch Live</h2>
        <p className="text-sm text-ink/70 mt-1">
          Let members watch Sunday service on YouTube Live or join prayer meetings on Google Meet.
        </p>
      </div>

      {/* Big Live Now switch */}
      <div
        className={`rounded-2xl p-5 border-2 transition ${
          draft.isLive && draft.mode !== 'off'
            ? 'bg-red-50 border-red-400'
            : 'bg-white border-ink/15'
        }`}
      >
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            <div
              className={`size-12 rounded-2xl grid place-items-center shrink-0 ${
                draft.isLive && draft.mode !== 'off'
                  ? 'bg-red-600 text-white'
                  : 'bg-sand text-pine'
              }`}
            >
              <Radio
                size={22}
                className={draft.isLive && draft.mode !== 'off' ? 'animate-pulse motion-reduce:animate-none' : ''}
              />
            </div>
            <div>
              <p className="font-display text-xl font-bold text-pine">We are live now</p>
              <p className="text-sm text-ink/70">
                {draft.isLive && draft.mode !== 'off'
                  ? 'The red Live banner and player are visible to everyone visiting the website.'
                  : 'Flip this switch when the service starts. Flip it off when you finish.'}
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={draft.isLive}
            onClick={handleToggleLiveNow}
            className={`min-h-12 px-6 rounded-full font-bold text-base transition shrink-0 ${
              draft.isLive
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-pine text-white hover:bg-clay'
            }`}
          >
            {draft.isLive ? 'LIVE — Tap to end' : 'Go LIVE now'}
          </button>
        </div>

        <div aria-live="polite" className="mt-2">
          {liveToggleToast && (
            <p className="text-sm font-bold text-pine flex items-center gap-1.5 mt-2">
              <Check size={16} />
              <span>{liveToggleToast}</span>
            </p>
          )}
          {liveToggleError && (
            <p role="alert" className="text-sm font-semibold text-red-700 flex items-start gap-1.5 mt-2">
              <AlertCircle size={16} className="shrink-0 mt-0.5" />
              <span>{liveToggleError}</span>
            </p>
          )}
        </div>
      </div>

      {/* Streaming mode radio cards */}
      <div className="space-y-3">
        <p className="text-sm font-bold text-pine">How are you streaming?</p>
        <div className="grid sm:grid-cols-2 gap-3" role="radiogroup" aria-label="How are you streaming">
          {STREAM_MODES.map((m) => {
            const Icon = m.icon;
            const selected = draft.mode === m.id;
            return (
              <button
                key={m.id}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => {
                  setDraft((prev) => ({
                    ...prev,
                    mode: m.id,
                    isLive: m.id === 'off' ? false : prev.isLive,
                  }));
                  setStatus('dirty');
                  setSaveError(null);
                  setLiveToggleError(null);
                }}
                className={`min-h-14 text-left rounded-2xl p-4 border-2 transition flex items-start gap-3 ${
                  selected
                    ? 'border-pine bg-white shadow-sm'
                    : 'border-ink/10 bg-white/60 hover:bg-white'
                }`}
              >
                <div
                  className={`size-10 rounded-xl grid place-items-center shrink-0 ${
                    selected ? 'bg-pine text-white' : 'bg-sand text-pine'
                  }`}
                >
                  <Icon size={20} />
                </div>
                <div>
                  <p className="font-bold text-pine">{m.title}</p>
                  <p className="text-xs text-ink/70 mt-0.5">{m.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Mode-specific link & preview */}
      {draft.mode !== 'off' && (
        <div className="bg-white rounded-2xl border border-ink/10 p-4 sm:p-6 space-y-5 shadow-sm">
          {draft.mode === 'youtube' && (
            <div className="space-y-4">
              <Field
                id="live-yt-video"
                label="YouTube link or ID"
                helper="Paste your YouTube Live link (youtube.com/watch?v=..., youtu.be/..., or youtube.com/live/...)"
                error={
                  videoInvalid
                    ? 'Could not find a valid 11-character YouTube video ID in that link.'
                    : undefined
                }
                required
              >
                <input
                  id="live-yt-video"
                  type="text"
                  value={ytVideoInput}
                  onChange={(e) => {
                    setYtVideoInput(e.target.value);
                    setStatus('dirty');
                    setSaveError(null);
                  }}
                  placeholder="https://www.youtube.com/live/..."
                  className={inputCls}
                />
              </Field>

              {parsedVideoId && previewEmbed && (
                <div className="space-y-2 max-w-md">
                  <p className="text-xs font-bold text-pine">Video preview (ID: {parsedVideoId})</p>
                  <div className="aspect-video rounded-xl overflow-hidden bg-black border border-ink/10">
                    <img
                      src={`https://i.ytimg.com/vi/${parsedVideoId}/hqdefault.jpg`}
                      alt="YouTube livestream preview"
                      className="size-full object-cover"
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {draft.mode === 'youtube_channel' && (
            <div className="space-y-4">
              <Field
                id="live-yt-channel"
                label="YouTube channel ID"
                helper="Starts with UC (24 characters), e.g. UCxxxxxxxxxxxxxxxxxxxxxx"
                error={
                  channelInvalid
                    ? handleChannelWarning
                      ? 'Open your channel > About > Share channel > Copy channel ID'
                      : 'Please enter a valid YouTube Channel ID starting with UC (24 characters).'
                    : undefined
                }
                required
              >
                <input
                  id="live-yt-channel"
                  type="text"
                  value={ytChannelInput}
                  onChange={(e) => {
                    setYtChannelInput(e.target.value);
                    setStatus('dirty');
                    setSaveError(null);
                  }}
                  placeholder="UC..."
                  className={inputCls}
                />
              </Field>

              {parsedChannelId && (
                <p className="text-xs font-bold text-pine flex items-center gap-1.5">
                  <Check size={14} />
                  Channel ready: {parsedChannelId}
                </p>
              )}
            </div>
          )}

          {(draft.mode === 'youtube' || draft.mode === 'youtube_channel') && (
            <label className="flex items-center gap-3 min-h-12 cursor-pointer">
              <input
                type="checkbox"
                checked={draft.showMeetButton}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, showMeetButton: e.target.checked }));
                  setStatus('dirty');
                  setSaveError(null);
                }}
                className="size-5 accent-pine"
              />
              <span className="text-sm font-bold text-pine">
                Also show a Google Meet button alongside YouTube
              </span>
            </label>
          )}

          {(draft.mode === 'meet' || draft.showMeetButton) && (
            <div className="space-y-2">
              <Field
                id="live-meet-url"
                label="Google Meet link"
                helper="e.g. https://meet.google.com/abc-defg-hij"
                error={
                  meetInvalid
                    ? 'Please enter a valid meet.google.com link (e.g. https://meet.google.com/abc-defg-hij).'
                    : undefined
                }
                required={draft.mode === 'meet' || draft.showMeetButton}
              >
                <div className="flex flex-col sm:flex-row gap-2">
                  <input
                    id="live-meet-url"
                    type="text"
                    value={meetInput}
                    onChange={(e) => {
                      setMeetInput(e.target.value);
                      setStatus('dirty');
                      setSaveError(null);
                    }}
                    placeholder="https://meet.google.com/abc-defg-hij"
                    className={inputCls}
                  />
                  {parsedMeet && (
                    <a
                      href={parsedMeet}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="min-h-12 px-4 rounded-xl border border-pine text-pine text-sm font-bold inline-flex items-center justify-center gap-1.5 hover:bg-sand shrink-0"
                    >
                      <span>Open link to test</span>
                      <ExternalLink size={15} />
                    </a>
                  )}
                </div>
              </Field>
            </div>
          )}

          <hr className="border-ink/10" />

          {/* Service title, welcome message, schedule */}
          <div className="grid sm:grid-cols-2 gap-4">
            <Field
              id="live-title"
              label="Service title"
              helper="e.g. Sunday Celebration Service"
            >
              <input
                id="live-title"
                type="text"
                value={draft.title}
                onChange={(e) => {
                  setDraft((prev) => ({ ...prev, title: e.target.value }));
                  setStatus('dirty');
                }}
                placeholder="Sunday Celebration Service"
                className={inputCls}
              />
            </Field>

            <div className="space-y-1.5">
              <label htmlFor="live-next-start" className="block text-sm font-bold text-pine">
                Next service date & time (Kenya time)
              </label>
              <div className="flex gap-2">
                <input
                  id="live-next-start"
                  type="datetime-local"
                  value={nairobiLocal}
                  onChange={(e) => {
                    setNairobiLocal(e.target.value);
                    setStatus('dirty');
                  }}
                  className={inputCls}
                />
                {nairobiLocal && (
                  <button
                    type="button"
                    onClick={() => {
                      setNairobiLocal('');
                      setDraft((prev) => ({ ...prev, nextStartsAt: '' }));
                      setStatus('dirty');
                    }}
                    className="min-h-12 px-3.5 rounded-xl border border-ink/20 bg-paper text-sm font-semibold hover:bg-sand shrink-0"
                  >
                    Clear
                  </button>
                )}
              </div>
              <p className="text-xs text-ink/65">
                Optional. Shows a live countdown and "Remind me" calendar button before you go live.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={applySundayPreset}
              className="min-h-11 px-4 rounded-full bg-sand border border-gold/60 text-pine text-sm font-bold hover:bg-gold/25 transition inline-flex items-center gap-2"
            >
              <CalendarClock size={16} />
              <span>Sunday 10:00 AM service</span>
            </button>
          </div>

          <Field
            id="live-message"
            label="Short welcome message"
            helper="Optional greeting shown below the stream"
          >
            <textarea
              id="live-message"
              rows={2}
              value={draft.message}
              onChange={(e) => {
                setDraft((prev) => ({ ...prev, message: e.target.value }));
                setStatus('dirty');
              }}
              placeholder="Karibu! Worship with us from wherever you are."
              className={textareaCls}
            />
          </Field>
        </div>
      )}

      {/* Share link row */}
      <div className="bg-white rounded-2xl border border-ink/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase tracking-wide text-clay">Share link for WhatsApp</p>
          <p className="text-sm font-semibold text-pine truncate">{shareUrl}</p>
        </div>
        <button
          type="button"
          onClick={copyShareUrl}
          className="min-h-11 px-4 rounded-full border border-pine text-pine text-sm font-bold hover:bg-sand transition inline-flex items-center justify-center gap-2 shrink-0"
        >
          {copiedShareLink ? <Check size={16} /> : <Copy size={16} />}
          <span>{copiedShareLink ? 'Copied!' : 'Copy link'}</span>
        </button>
      </div>

      {/* Collapsed Help box */}
      <details className="bg-sand/70 rounded-2xl border border-gold/50 p-4 group">
        <summary className="cursor-pointer list-none flex items-center justify-between font-display font-bold text-pine text-base min-h-10">
          <span>Help: Choosing YouTube vs Google Meet & Sunday checklist</span>
          <ChevronDown size={18} className="group-open:rotate-180 transition-transform" />
        </summary>
        <div className="mt-3 pt-3 border-t border-ink/10 space-y-3 text-sm text-ink/85 leading-relaxed">
          <p>
            Meet is best for small groups such as Bible study and prayer meetings. For the whole congregation use YouTube Live. If your church has Google Workspace you can stream a Meet to YouTube Live from the Meet menu: <b>Activities &gt; Live streaming</b>.
          </p>
          <div>
            <p className="font-bold text-pine mb-1">How to go live on Sunday (5 steps):</p>
            <ol className="list-decimal pl-5 space-y-1">
              <li>Start your livestream in YouTube Studio (or open your Google Meet room).</li>
              <li>Paste the YouTube link (or confirm your automatic Channel ID) and tap <b>Save changes</b>.</li>
              <li>Check the video preview to confirm it is the right stream.</li>
              <li>Tap <b>Go LIVE now</b> at the top of this page and share the WhatsApp link.</li>
              <li>When the benediction finishes, tap <b>LIVE — Tap to end</b> so the website returns to normal.</li>
            </ol>
          </div>
        </div>
      </details>

      <SaveBar status={status} errorMessage={saveError} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
};

export default LiveTab;
