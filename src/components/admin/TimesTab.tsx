import React, { useEffect, useState } from 'react';
import { Pencil, Plus } from 'lucide-react';
import type { ChurchScheduleItem, ChurchSettings } from '../../types/church';
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

interface TimesTabProps {
  settings: ChurchSettings;
  onSaveSettings: (next: ChurchSettings) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}

const emptySchedule = (): ChurchScheduleItem => ({
  id: `sched_${Date.now()}`,
  day: 'Sunday',
  title: '',
  time: '',
  description: '',
  location: 'Main Sanctuary',
  category: 'worship',
});

export const TimesTab: React.FC<TimesTabProps> = ({ settings, onSaveSettings, onDirtyChange }) => {
  const [items, setItems] = useState<ChurchScheduleItem[]>(settings.schedules);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftItem, setDraftItem] = useState<ChurchScheduleItem | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SaveStatus>('clean');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'clean' || status === 'saved') {
      setItems(settings.schedules);
    }
  }, [settings.schedules]);

  useEffect(() => {
    onDirtyChange(status === 'dirty');
    return () => onDirtyChange(false);
  }, [status, onDirtyChange]);

  const markDirty = (nextItems: ChurchScheduleItem[]) => {
    setItems(nextItems);
    setStatus('dirty');
    setSaveError(null);
  };

  const moveItem = (from: number, to: number) => {
    const next = [...items];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    markDirty(next);
  };

  const openAdd = () => {
    const fresh = emptySchedule();
    setDraftItem(fresh);
    setEditingId(fresh.id);
    setErrors({});
  };

  const openEdit = (item: ChurchScheduleItem) => {
    setDraftItem({ ...item });
    setEditingId(item.id);
    setErrors({});
  };

  const applyItemEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draftItem) return;
    const nextErrs: Record<string, string> = {};
    if (!draftItem.day.trim()) nextErrs.day = 'Please enter the day of the week.';
    if (!draftItem.title.trim()) nextErrs.title = 'Please enter a service name.';
    if (!draftItem.time.trim()) nextErrs.time = 'Please enter the meeting time.';
    if (!draftItem.location.trim()) nextErrs.location = 'Please enter where it takes place.';
    if (Object.keys(nextErrs).length > 0) {
      setErrors(nextErrs);
      return;
    }

    const cleaned: ChurchScheduleItem = {
      ...draftItem,
      day: draftItem.day.trim(),
      title: draftItem.title.trim(),
      time: draftItem.time.trim(),
      location: draftItem.location.trim(),
      description: draftItem.description.trim(),
    };

    const exists = items.some((i) => i.id === cleaned.id);
    const nextList = exists ? items.map((i) => (i.id === cleaned.id ? cleaned : i)) : [...items, cleaned];
    markDirty(nextList);
    setEditingId(null);
    setDraftItem(null);
  };

  const removeItem = (id: string) => {
    markDirty(items.filter((i) => i.id !== id));
    if (editingId === id) {
      setEditingId(null);
      setDraftItem(null);
    }
  };

  const handleSave = async () => {
    if (items.length === 0) {
      setStatus('error');
      setSaveError('Please keep at least one service time.');
      return;
    }
    setStatus('saving');
    setSaveError(null);
    try {
      await onSaveSettings({ ...settings, schedules: items });
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setSaveError(formatAdminError(err));
    }
  };

  const handleDiscard = () => {
    setItems(settings.schedules);
    setEditingId(null);
    setDraftItem(null);
    setStatus('clean');
    setSaveError(null);
  };

  return (
    <div className="space-y-6 pb-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="font-display text-2xl font-bold text-pine">Service Times</h2>
          <p className="text-sm text-ink/70 mt-1">
            Add, edit, or reorder times for the &ldquo;When we meet&rdquo; section. The main Sunday time on the homepage banner stays fixed at 10:00 AM – 01:00 PM.
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="min-h-12 px-5 rounded-full bg-clay text-white text-sm font-bold hover:bg-[#a05a37] transition inline-flex items-center justify-center gap-2 shrink-0"
        >
          <Plus size={18} />
          <span>Add service time</span>
        </button>
      </div>

      {draftItem && (
        <form onSubmit={applyItemEdit} noValidate className="bg-white rounded-2xl border-2 border-pine/30 p-4 sm:p-6 space-y-4 shadow-sm">
          <h3 className="font-display text-lg font-bold text-pine">
            {items.some((i) => i.id === draftItem.id) ? 'Edit service time' : 'New service time'}
          </h3>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="sched-day" label="Day" helper="e.g. Sunday, Wednesday, Friday" error={errors.day} required>
              <input
                id="sched-day"
                type="text"
                value={draftItem.day}
                onChange={(e) => setDraftItem({ ...draftItem, day: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field
              id="sched-time"
              label="Time"
              helper="Time, e.g. 10:00 AM - 12:45 PM"
              error={errors.time}
              required
            >
              <input
                id="sched-time"
                type="text"
                value={draftItem.time}
                onChange={(e) => setDraftItem({ ...draftItem, time: e.target.value })}
                placeholder="10:00 AM - 12:45 PM"
                className={inputCls}
              />
            </Field>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <Field id="sched-title" label="Service name" helper="e.g. Main Worship Service" error={errors.title} required>
              <input
                id="sched-title"
                type="text"
                value={draftItem.title}
                onChange={(e) => setDraftItem({ ...draftItem, title: e.target.value })}
                className={inputCls}
              />
            </Field>

            <Field id="sched-location" label="Place / Room" helper="e.g. Main Sanctuary" error={errors.location} required>
              <input
                id="sched-location"
                type="text"
                value={draftItem.location}
                onChange={(e) => setDraftItem({ ...draftItem, location: e.target.value })}
                className={inputCls}
              />
            </Field>
          </div>

          <Field id="sched-cat" label="Type of meeting" helper="Helps highlight the main Sunday worship service">
            <select
              id="sched-cat"
              value={draftItem.category}
              onChange={(e) => setDraftItem({ ...draftItem, category: e.target.value as ChurchScheduleItem['category'] })}
              className={inputCls}
            >
              <option value="worship">Sunday Worship</option>
              <option value="prayer">Prayer Gathering</option>
              <option value="fellowship">Bible Study / Fellowship</option>
              <option value="youth">Youth / Children</option>
            </select>
          </Field>

          <Field id="sched-desc" label="Short description" helper="One short sentence welcoming visitors">
            <textarea
              id="sched-desc"
              rows={2}
              value={draftItem.description}
              onChange={(e) => setDraftItem({ ...draftItem, description: e.target.value })}
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
              onClick={() => {
                setEditingId(null);
                setDraftItem(null);
              }}
              className="min-h-12 px-5 rounded-full border border-ink/20 bg-paper text-ink text-sm font-semibold hover:bg-sand transition"
            >
              Cancel
            </button>
          </div>
        </form>
      )}

      <ul className="space-y-3">
        {items.map((item, idx) => (
          <li key={item.id} className="bg-white rounded-2xl border border-ink/10 p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide text-clay">
                {item.day} · {item.time}
              </p>
              <h3 className="font-display text-lg font-bold text-pine">{item.title}</h3>
              <p className="text-sm text-ink/75">
                {item.description} <span className="text-ink/50">· {item.location}</span>
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2 shrink-0">
              <MoveButtons index={idx} total={items.length} onMove={moveItem} itemName={item.title} />
              <button
                type="button"
                onClick={() => openEdit(item)}
                className="min-h-11 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-paper text-pine text-sm font-semibold hover:bg-sand transition"
              >
                <Pencil size={15} />
                <span>Edit</span>
              </button>
              <ConfirmDeleteButton itemLabel={item.title} onConfirm={() => removeItem(item.id)} />
            </div>
          </li>
        ))}
      </ul>

      <SaveBar status={status} errorMessage={saveError} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
};

export default TimesTab;
