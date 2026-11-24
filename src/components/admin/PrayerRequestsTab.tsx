import React, { useEffect, useState } from 'react';
import { CheckCircle2, Lock, MessageCircle, Phone, AlertCircle } from 'lucide-react';
import {
  deletePrayerPetition,
  subscribeToPrayerPetitions,
  updatePrayerPetitionPrayedFor,
  type PrayerPetition,
} from '../../lib/firebase';
import { ConfirmDeleteButton, formatAdminError } from './AdminShared';

function formatDateTime(iso: string): string {
  try {
    return new Intl.DateTimeFormat('en-KE', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function toPhoneDigits(contact: string): string | null {
  const digits = contact.replace(/[^\d+]/g, '');
  if (digits.replace(/\D/g, '').length < 9) return null;
  return digits;
}

function toWhatsAppDigits(contact: string): string | null {
  const digits = contact.replace(/\D/g, '');
  if (digits.length < 9) return null;
  if (digits.startsWith('0') && digits.length === 10) return `254${digits.slice(1)}`;
  return digits;
}

export const PrayerRequestsTab: React.FC = () => {
  const [petitions, setPetitions] = useState<PrayerPetition[] | null>(null);
  const [filter, setFilter] = useState<'all' | 'new' | 'prayed'>('all');
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  useEffect(() => {
    const unsub = subscribeToPrayerPetitions(
      (list) => {
        setPetitions(list);
        setError(null);
      },
      (err) => {
        setPetitions([]);
        setError(formatAdminError(err));
      }
    );
    return () => unsub();
  }, []);

  const togglePrayed = async (p: PrayerPetition) => {
    setBusyId(p.id);
    setError(null);
    try {
      await updatePrayerPetitionPrayedFor(p.id, !p.prayedFor);
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async (id: string) => {
    setBusyId(id);
    setError(null);
    try {
      await deletePrayerPetition(id);
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setBusyId(null);
    }
  };

  const filtered =
    petitions?.filter((p) => {
      if (filter === 'new') return !p.prayedFor;
      if (filter === 'prayed') return Boolean(p.prayedFor);
      return true;
    }) ?? null;

  const newCount = petitions?.filter((p) => !p.prayedFor).length ?? 0;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-pine">Prayer Requests</h2>
        <p className="text-sm text-ink/70 mt-1">
          Private petitions submitted from the website. Only signed-in church leaders can read them.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`min-h-11 px-4 rounded-full text-sm font-bold transition ${
            filter === 'all' ? 'bg-pine text-white' : 'bg-white border border-ink/15 text-ink/75'
          }`}
        >
          All ({petitions?.length ?? 0})
        </button>
        <button
          type="button"
          onClick={() => setFilter('new')}
          className={`min-h-11 px-4 rounded-full text-sm font-bold transition ${
            filter === 'new' ? 'bg-clay text-white' : 'bg-white border border-ink/15 text-ink/75'
          }`}
        >
          Needs prayer ({newCount})
        </button>
        <button
          type="button"
          onClick={() => setFilter('prayed')}
          className={`min-h-11 px-4 rounded-full text-sm font-bold transition ${
            filter === 'prayed' ? 'bg-pine text-white' : 'bg-white border border-ink/15 text-ink/75'
          }`}
        >
          Prayed for
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex items-start gap-2">
          <AlertCircle size={18} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {filtered === null && <p className="text-sm text-ink/60">Loading prayer requests...</p>}

      {filtered?.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-gold/60 bg-white/50 p-8 text-center text-ink/70">
          {filter === 'new'
            ? 'Every current prayer request has been prayed for.'
            : 'No prayer requests here yet.'}
        </div>
      )}

      <ul className="space-y-4">
        {filtered?.map((p) => {
          const tel = p.contact ? toPhoneDigits(p.contact) : null;
          const wa = p.contact ? toWhatsAppDigits(p.contact) : null;

          return (
            <li
              key={p.id}
              className={`rounded-2xl border p-4 sm:p-5 shadow-sm space-y-3 ${
                p.prayedFor ? 'bg-paper/70 border-ink/10' : 'bg-white border-gold/60'
              }`}
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display text-lg font-bold text-pine">
                    {p.name || 'Anonymous Seeker'}
                  </span>
                  {p.isConfidential && (
                    <span className="inline-flex items-center gap-1 rounded-md bg-pine/10 text-pine px-2 py-0.5 text-xs font-bold">
                      <Lock size={12} />
                      Confidential
                    </span>
                  )}
                  <span className="rounded-md bg-sand text-clay px-2 py-0.5 text-xs font-bold">
                    {p.category}
                  </span>
                </div>
                <span className="text-xs text-ink/55">{formatDateTime(p.createdAt)}</span>
              </div>

              <p className="text-base text-ink leading-relaxed whitespace-pre-wrap">{p.requestText}</p>

              {p.contact && (
                <p className="text-sm text-ink/70">
                  Contact: <span className="font-semibold text-pine">{p.contact}</span>
                </p>
              )}

              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-ink/10">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    disabled={busyId === p.id}
                    onClick={() => togglePrayed(p)}
                    className={`min-h-11 px-4 rounded-xl text-sm font-bold inline-flex items-center gap-1.5 transition ${
                      p.prayedFor
                        ? 'bg-pine text-white hover:bg-pine/90'
                        : 'border border-pine text-pine bg-paper hover:bg-sand'
                    }`}
                  >
                    <CheckCircle2 size={16} />
                    <span>{p.prayedFor ? 'Prayed for' : 'Mark as prayed for'}</span>
                  </button>

                  {tel && (
                    <a
                      href={`tel:${tel}`}
                      className="min-h-11 px-3.5 rounded-xl border border-ink/15 bg-paper text-pine text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-sand"
                    >
                      <Phone size={15} />
                      <span>Call</span>
                    </a>
                  )}

                  {wa && (
                    <a
                      href={`https://wa.me/${wa}`}
                      target="_blank"
                      rel="noreferrer"
                      className="min-h-11 px-3.5 rounded-xl border border-ink/15 bg-paper text-pine text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-sand"
                    >
                      <MessageCircle size={15} />
                      <span>WhatsApp</span>
                    </a>
                  )}
                </div>

                <ConfirmDeleteButton
                  itemLabel={`prayer request from ${p.name || 'visitor'}`}
                  busy={busyId === p.id}
                  onConfirm={() => handleDelete(p.id)}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
};

export default PrayerRequestsTab;
