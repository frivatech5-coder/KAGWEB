import React, { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { ChurchSettings, Sermon } from '../../types/church';
import {
  ConfirmDeleteButton,
  Field,
  MoveButtons,
  SaveBar,
  extractYouTubeId,
  formatAdminError,
  inputCls,
  textareaCls,
  type SaveStatus,
} from './AdminShared';

interface SermonsTabProps {
  settings: ChurchSettings;
  onSaveSettings: (next: ChurchSettings) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
  startAdding?: boolean;
  onConsumeQuickAction?: () => void;
}

const emptySermon = (): Sermon => ({
  id: `sermon_${Date.now()}`,
  title: '',
  series: '',
  speaker: 'Pastor Sarah Waweru',
  date: '',
  scripture: '',
  duration: '',
  youtubeId: '',
  summary: '',
  keyTakeaway: '',
});

export const SermonsTab: React.FC<SermonsTabProps> = ({
  settings,
  onSaveSettings,
  onDirtyChange,
  startAdding,
  onConsumeQuickAction,
}) => {
  const [sermons, setSermons] = useState<Sermon[]>(settings.sermons);
  const [draft, setDraft] = useState<Sermon | null>(null);
  const [youtubeInput, setYoutubeInput] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SaveStatus>('clean');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'clean' || status === 'saved') {
      setSermons(settings.sermons);
    }
  }, [settings.sermons]);

  useEffect(() => {
    onDirtyChange(status === 'dirty');
    return () => onDirtyChange(false);
  }, [status, onDirtyChange]);

  const openAdd = () => {
    const fresh = emptySermon();
    setDraft(fresh);
    setYoutubeInput('');
    setErrors({});
  };

  useEffect(() => {
    if (startAdding) {
      openAdd();
      onConsumeQuickAction?.();
    }
  }, [startAdding, onConsumeQuickAction]);

  const openEdit = (sermon: Sermon) => {
    setDraft({ ...sermon });
    setYoutubeInput(sermon.youtubeId || '');
    setErrors({});
  };

  const markDirty = (next: Sermon[]) => {
    setSermons(next);
    setStatus('dirty');
    setSaveError(null);
  };

  const moveItem = (from: number, to: number) => {
    const next = [...sermons];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    markDirty(next);
  };

  const parsedYouTubeId = extractYouTubeId(youtubeInput);
  const validYouTubeId = /^[a-zA-Z0-9_-]{11}$/.test(parsedYouTubeId) ? parsedYouTubeId : '';

  const applySermon = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft) return;

    const nextErrs: Record<string, string> = {};
    if (!draft.title.trim()) nextErrs.title = 'Please enter the sermon title.';
    if (!draft.speaker.trim()) nextErrs.speaker = 'Please enter who preached.';
    if (!validYouTubeId) {
      nextErrs.youtubeId = 'Please paste a full YouTube link or an 11-character YouTube video ID.';
    }
    if (Object.keys(nextErrs).length > 0) {
      setErrors(nextErrs);
      return;
    }

    const cleaned: Sermon = {
      ...draft,
      title: draft.title.trim(),
      series: draft.series.trim() || 'Sunday Service',
      speaker: draft.speaker.trim(),
      date: draft.date.trim() || 'Recent Sunday',
      scripture: draft.scripture.trim(),
      youtubeId: validYouTubeId,
      keyTakeaway: draft.keyTakeaway.trim(),
      summary: draft.summary.trim() || draft.keyTakeaway.trim(),
    };

    const exists = sermons.some((s) => s.id === cleaned.id);
    const nextList = exists ? sermons.map((s) => (s.id === cleaned.id ? cleaned : s)) : [cleaned, ...sermons];
    markDirty(nextList);
    setDraft(null);
    setYoutubeInput('');
  };

  const removeItem = (id: string) => {
    markDirty(sermons.filter((s) => s.id !== id));
    if (draft?.id === id) setDraft(null);
  };

  const handleSave = async () => {
    setStatus('saving');
    setSaveError(null);
    try {
      await onSaveSettings({ ...settings, sermons });
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setSaveError(formatAdminError(err));
    }
  };

  const handleDiscard = () => {
    setSermons(settings.sermons);
    setDraft(null);
    setStatus('clean');
    setSaveError(null);
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-pine">Recent Sermons</h2>
          <p className="text-sm text-ink/70 mt-1">
            The top 4 sermons in this list appear on the homepage. Paste any YouTube link and we pull the video automatically.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="min-h-12 px-5 rounded-full bg-clay text-white text-sm font-bold hover:bg-[#a05a37] transition inline-flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={18} />
          <span>Add sermon</span>
        </button>
      </div>

      {draft && (
        <form onSubmit={applySermon} noValidate className="bg-white rounded-2xl border-2 border-pine/30 p-4 sm:p-6 space-y-4 shadow-sm">
          <h3 className="font-display text-lg font-bold text-pine">
            {sermons.some((s) => s.id === draft.id) ? 'Edit sermon' : 'Add a sermon'}
          </h3>

          <Field
            id="sermon-yt"
            label="YouTube link or ID"
            helper="Paste any YouTube link (youtube.com/watch?v=... or youtu.be/...) or the 11-character video ID"
            error={errors.youtubeId}
            required
          >
            <input
              id="sermon-yt"
              type="text"
              value={youtubeInput}
              onChange={(e) => {
                setYoutubeInput(e.target.value);
                setErrors((prev) => ({ ...prev, youtubeId: '' }));
              }}
              placeholder="https://www.youtube.com/watch?v=..."
              className={inputCls}
            />
          </Field>

          {validYouTubeId && (
            <div className="rounded-xl overflow-hidden border border-ink/15 bg-black max-w-sm">
              <img
                src={`https://i.ytimg.com/vi/${validYouTubeId}/hqdefault.jpg`}
                alt="YouTube video preview"
                className="w-full aspect-video object-cover"
              />
              <p className="bg-sand px-3 py-1.5 text-xs font-semibold text-pine">
                Video ready (ID: {validYouTubeId})
              </p>
            </div>
          )}

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="sermon-title" label="Sermon title" error={errors.title} required>
              <input
                id="sermon-title"
                type="text"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="e.g. Walking in the Spirit"
                className={inputCls}
              />
            </Field>

            <Field id="sermon-speaker" label="Preacher" error={errors.speaker} required>
              <input
                id="sermon-speaker"
                type="text"
                value={draft.speaker}
                onChange={(e) => setDraft({ ...draft, speaker: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-3 gap-4">
            <Field id="sermon-series" label="Series" helper="e.g. Sunday Word">
              <input
                id="sermon-series"
                type="text"
                value={draft.series}
                onChange={(e) => setDraft({ ...draft, series: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field id="sermon-date" label="Date" helper="e.g. Sun, 17 Nov">
              <input
                id="sermon-date"
                type="text"
                value={draft.date}
                onChange={(e) => setDraft({ ...draft, date: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field id="sermon-scripture" label="Bible reading" helper="e.g. Romans 8:1-14">
              <input
                id="sermon-scripture"
                type="text"
                value={draft.scripture}
                onChange={(e) => setDraft({ ...draft, scripture: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>

          <Field id="sermon-takeaway" label="Main message / takeaway" helper="One short quote shown below the sermon card">
            <textarea
              id="sermon-takeaway"
              rows={2}
              value={draft.keyTakeaway}
              onChange={(e) => setDraft({ ...draft, keyTakeaway: e.target.value })}
              className={textareaCls}
            />
          </Field>

          <div className="flex flex-wrap items-center gap-2 pt-1">
            <button
              type="submit"
              className="min-h-12 px-5 rounded-full bg-pine text-white text-sm font-bold hover:bg-clay transition"
            >
              Done editing
            </button>
            <button
              type="button"
              onClick={() => setDraft(null)}
              className="min-h-12 px-5 rounded-full border border-ink/20 bg-paper text-ink text-sm font-semibold hover:bg-sand transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {sermons.map((s, idx) => (
          <li key={s.id} className="bg-white rounded-2xl border border-ink/10 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3 min-w-0">
              {s.youtubeId?.trim() && (
                <img
                  src={`https://i.ytimg.com/vi/${s.youtubeId.trim()}/hqdefault.jpg`}
                  alt=""
                  className="w-24 aspect-video rounded-lg object-cover shrink-0 bg-black"
                />
              )}
              <div className="min-w-0">
                <p className="text-xs font-bold uppercase tracking-wide text-clay">
                  {s.series} · {s.date}
                </p>
                <h3 className="font-display text-lg font-bold text-pine truncate">{s.title}</h3>
                <p className="text-sm text-ink/65 truncate">
                  {s.speaker} {s.scripture ? `· ${s.scripture}` : ''}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <MoveButtons index={idx} total={sermons.length} onMove={moveItem} itemName={s.title} />
              <button
                type="button"
                onClick={() => openEdit(s)}
                className="min-h-11 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-paper text-pine text-sm font-semibold hover:bg-sand transition"
              >
                <Pencil size={15} />
                <span>Edit</span>
              </button>
              <ConfirmDeleteButton itemLabel={s.title} onConfirm={() => removeItem(s.id)} />
            </div>
          </li>
        ))}
      </ul>

      <SaveBar status={status} errorMessage={saveError} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
};

export default SermonsTab;
