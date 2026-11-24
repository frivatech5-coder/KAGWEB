import React, { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { ChurchEvent, ChurchSettings, Ministry } from '../../types/church';
import {
  ConfirmDeleteButton,
  Field,
  MoveButtons,
  SaveBar,
  formatAdminError,
  inputCls,
  textareaCls,
  type SaveStatus,
} from './AdminShared';

interface EventsMinistriesTabProps {
  settings: ChurchSettings;
  onSaveSettings: (next: ChurchSettings) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
  startAdding?: boolean;
  onConsumeQuickAction?: () => void;
}

const emptyEvent = (): ChurchEvent => ({
  id: `event_${Date.now()}`,
  title: '',
  date: '',
  time: '',
  venue: 'Main Sanctuary',
  description: '',
  tag: 'Special Gathering',
});

const emptyMinistry = (): Ministry => ({
  id: `min_${Date.now()}`,
  name: '',
  lead: '',
  kicker: '',
  description: '',
  meetingTime: '',
  scripture: '',
});

export const EventsMinistriesTab: React.FC<EventsMinistriesTabProps> = ({
  settings,
  onSaveSettings,
  onDirtyChange,
  startAdding,
  onConsumeQuickAction,
}) => {
  const [subTab, setSubTab] = useState<'events' | 'ministries'>('events');
  const [events, setEvents] = useState<ChurchEvent[]>(settings.events);
  const [ministries, setMinistries] = useState<Ministry[]>(settings.ministries);

  const [eventDraft, setEventDraft] = useState<ChurchEvent | null>(null);
  const [ministryDraft, setMinistryDraft] = useState<Ministry | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SaveStatus>('clean');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'clean' || status === 'saved') {
      setEvents(settings.events);
      setMinistries(settings.ministries);
    }
  }, [settings.events, settings.ministries]);

  useEffect(() => {
    onDirtyChange(status === 'dirty');
    return () => onDirtyChange(false);
  }, [status, onDirtyChange]);

  useEffect(() => {
    if (startAdding) {
      setSubTab('events');
      setEventDraft(emptyEvent());
      setMinistryDraft(null);
      setErrors({});
      onConsumeQuickAction?.();
    }
  }, [startAdding, onConsumeQuickAction]);

  const moveEvent = (from: number, to: number) => {
    const next = [...events];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setEvents(next);
    setStatus('dirty');
  };

  const moveMinistry = (from: number, to: number) => {
    const next = [...ministries];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setMinistries(next);
    setStatus('dirty');
  };

  const applyEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!eventDraft) return;
    const errs: Record<string, string> = {};
    if (!eventDraft.title.trim()) errs.title = 'Please enter the event name.';
    if (!eventDraft.date.trim()) errs.date = 'Please enter the event date.';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const cleaned: ChurchEvent = {
      ...eventDraft,
      title: eventDraft.title.trim(),
      date: eventDraft.date.trim(),
      time: eventDraft.time.trim(),
      venue: eventDraft.venue.trim() || 'Main Sanctuary',
      description: eventDraft.description.trim(),
      tag: eventDraft.tag.trim() || 'Church Event',
    };
    const exists = events.some((ev) => ev.id === cleaned.id);
    setEvents(exists ? events.map((ev) => (ev.id === cleaned.id ? cleaned : ev)) : [...events, cleaned]);
    setEventDraft(null);
    setStatus('dirty');
    setSaveError(null);
  };

  const applyMinistry = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ministryDraft) return;
    const errs: Record<string, string> = {};
    if (!ministryDraft.name.trim()) errs.name = 'Please enter the ministry name.';
    if (!ministryDraft.meetingTime.trim()) errs.meetingTime = 'Please enter when the group meets.';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    const cleaned: Ministry = {
      ...ministryDraft,
      name: ministryDraft.name.trim(),
      meetingTime: ministryDraft.meetingTime.trim(),
      lead: ministryDraft.lead.trim() || 'Parish Team',
      kicker: ministryDraft.kicker.trim() || 'Fellowship',
      description: ministryDraft.description.trim(),
      scripture: ministryDraft.scripture.trim(),
    };
    const exists = ministries.some((m) => m.id === cleaned.id);
    setMinistries(exists ? ministries.map((m) => (m.id === cleaned.id ? cleaned : m)) : [...ministries, cleaned]);
    setMinistryDraft(null);
    setStatus('dirty');
    setSaveError(null);
  };

  const handleSave = async () => {
    setStatus('saving');
    setSaveError(null);
    try {
      await onSaveSettings({ ...settings, events, ministries });
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setSaveError(formatAdminError(err));
    }
  };

  const handleDiscard = () => {
    setEvents(settings.events);
    setMinistries(settings.ministries);
    setEventDraft(null);
    setMinistryDraft(null);
    setStatus('clean');
    setSaveError(null);
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-pine">Events & Ministries</h2>
          <p className="text-sm text-ink/70 mt-1">
            Keep upcoming church gatherings and family groups up to date.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            setErrors({});
            if (subTab === 'events') {
              setEventDraft(emptyEvent());
              setMinistryDraft(null);
            } else {
              setMinistryDraft(emptyMinistry());
              setEventDraft(null);
            }
          }}
          className="min-h-12 px-5 rounded-full bg-clay text-white text-sm font-bold hover:bg-[#a05a37] transition inline-flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={18} />
          <span>{subTab === 'events' ? 'Add event' : 'Add ministry'}</span>
        </button>
      </div>

      <div className="inline-flex rounded-full bg-sand p-1 border border-ink/10">
        <button
          type="button"
          onClick={() => setSubTab('events')}
          className={`min-h-11 px-5 rounded-full text-sm font-bold transition ${
            subTab === 'events' ? 'bg-pine text-white shadow-sm' : 'text-ink/75 hover:text-ink'
          }`}
        >
          Upcoming Events ({events.length})
        </button>
        <button
          type="button"
          onClick={() => setSubTab('ministries')}
          className={`min-h-11 px-5 rounded-full text-sm font-bold transition ${
            subTab === 'ministries' ? 'bg-pine text-white shadow-sm' : 'text-ink/75 hover:text-ink'
          }`}
        >
          Ministries ({ministries.length})
        </button>
      </div>

      {subTab === 'events' && (
        <div className="space-y-4">
          {eventDraft && (
            <form onSubmit={applyEvent} noValidate className="bg-white rounded-2xl border-2 border-pine/30 p-4 sm:p-6 space-y-4 shadow-sm">
              <h3 className="font-display text-lg font-bold text-pine">
                {events.some((ev) => ev.id === eventDraft.id) ? 'Edit event' : 'New event'}
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="ev-title" label="Event name" error={errors.title} required>
                  <input
                    id="ev-title"
                    type="text"
                    value={eventDraft.title}
                    onChange={(e) => setEventDraft({ ...eventDraft, title: e.target.value })}
                    placeholder="e.g. Harvest Thanksgiving Sunday"
                    className={inputCls}
                  />
                </Field>
                <Field id="ev-date" label="Date" helper="e.g. Sun, 14 Dec" error={errors.date} required>
                  <input
                    id="ev-date"
                    type="text"
                    value={eventDraft.date}
                    onChange={(e) => setEventDraft({ ...eventDraft, date: e.target.value })}
                    placeholder="Sun, 14 Dec"
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="ev-time" label="Time" helper="e.g. 9:30 AM - 1:00 PM">
                  <input
                    id="ev-time"
                    type="text"
                    value={eventDraft.time}
                    onChange={(e) => setEventDraft({ ...eventDraft, time: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field id="ev-venue" label="Venue" helper="e.g. Main Sanctuary">
                  <input
                    id="ev-venue"
                    type="text"
                    value={eventDraft.venue}
                    onChange={(e) => setEventDraft({ ...eventDraft, venue: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>

              <Field id="ev-desc" label="Short details">
                <textarea
                  id="ev-desc"
                  rows={2}
                  value={eventDraft.description}
                  onChange={(e) => setEventDraft({ ...eventDraft, description: e.target.value })}
                  className={textareaCls}
                />
              </Field>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className="min-h-12 px-5 rounded-full bg-pine text-white text-sm font-bold hover:bg-clay transition">
                  Done editing
                </button>
                <button type="button" onClick={() => setEventDraft(null)} className="min-h-12 px-5 rounded-full border border-ink/20 bg-paper text-sm font-semibold">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <ul className="space-y-3">
            {events.map((ev, idx) => (
              <li key={ev.id} className="bg-white rounded-2xl border border-ink/10 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <p className="font-hand text-xl text-clay">{ev.date}</p>
                  <h3 className="font-display text-lg font-bold text-pine">{ev.title}</h3>
                  <p className="text-sm text-ink/65">{ev.time} · {ev.venue}</p>
                  {ev.description && <p className="text-sm text-ink/80">{ev.description}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <MoveButtons index={idx} total={events.length} onMove={moveEvent} itemName={ev.title} />
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setEventDraft({ ...ev });
                    }}
                    className="min-h-11 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-paper text-pine text-sm font-semibold hover:bg-sand"
                  >
                    <Pencil size={15} />
                    <span>Edit</span>
                  </button>
                  <ConfirmDeleteButton
                    itemLabel={ev.title}
                    onConfirm={() => {
                      setEvents(events.filter((x) => x.id !== ev.id));
                      setStatus('dirty');
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {subTab === 'ministries' && (
        <div className="space-y-4">
          {ministryDraft && (
            <form onSubmit={applyMinistry} noValidate className="bg-white rounded-2xl border-2 border-pine/30 p-4 sm:p-6 space-y-4 shadow-sm">
              <h3 className="font-display text-lg font-bold text-pine">
                {ministries.some((m) => m.id === ministryDraft.id) ? 'Edit ministry' : 'New ministry'}
              </h3>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="min-name" label="Ministry name" error={errors.name} required>
                  <input
                    id="min-name"
                    type="text"
                    value={ministryDraft.name}
                    onChange={(e) => setMinistryDraft({ ...ministryDraft, name: e.target.value })}
                    placeholder="e.g. Women of Destiny (WWK)"
                    className={inputCls}
                  />
                </Field>
                <Field id="min-time" label="When they meet" helper="e.g. Thursdays at 5:00 PM" error={errors.meetingTime} required>
                  <input
                    id="min-time"
                    type="text"
                    value={ministryDraft.meetingTime}
                    onChange={(e) => setMinistryDraft({ ...ministryDraft, meetingTime: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <Field id="min-kicker" label="Short tagline" helper="e.g. Prayer, fellowship & encouragement">
                  <input
                    id="min-kicker"
                    type="text"
                    value={ministryDraft.kicker}
                    onChange={(e) => setMinistryDraft({ ...ministryDraft, kicker: e.target.value })}
                    className={inputCls}
                  />
                </Field>
                <Field id="min-lead" label="Led by">
                  <input
                    id="min-lead"
                    type="text"
                    value={ministryDraft.lead}
                    onChange={(e) => setMinistryDraft({ ...ministryDraft, lead: e.target.value })}
                    className={inputCls}
                  />
                </Field>
              </div>

              <div className="flex flex-wrap gap-2">
                <button type="submit" className="min-h-12 px-5 rounded-full bg-pine text-white text-sm font-bold hover:bg-clay transition">
                  Done editing
                </button>
                <button type="button" onClick={() => setMinistryDraft(null)} className="min-h-12 px-5 rounded-full border border-ink/20 bg-paper text-sm font-semibold">
                  Cancel
                </button>
              </div>
            </form>
          )}

          <ul className="space-y-3">
            {ministries.map((m, idx) => (
              <li key={m.id} className="bg-white rounded-2xl border border-ink/10 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div className="space-y-1 min-w-0">
                  <h3 className="font-display text-lg font-bold text-pine">{m.name}</h3>
                  <p className="text-sm font-semibold text-clay">{m.meetingTime}</p>
                  <p className="text-sm text-ink/70">{m.kicker} · led by {m.lead}</p>
                </div>
                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <MoveButtons index={idx} total={ministries.length} onMove={moveMinistry} itemName={m.name} />
                  <button
                    type="button"
                    onClick={() => {
                      setErrors({});
                      setMinistryDraft({ ...m });
                    }}
                    className="min-h-11 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-paper text-pine text-sm font-semibold hover:bg-sand"
                  >
                    <Pencil size={15} />
                    <span>Edit</span>
                  </button>
                  <ConfirmDeleteButton
                    itemLabel={m.name}
                    onConfirm={() => {
                      setMinistries(ministries.filter((x) => x.id !== m.id));
                      setStatus('dirty');
                    }}
                  />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      <SaveBar status={status} errorMessage={saveError} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
};

export default EventsMinistriesTab;
