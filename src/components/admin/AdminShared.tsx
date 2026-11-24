import React, { useState } from 'react';
import { ArrowDown, ArrowUp, Check, Loader2, Trash2, AlertCircle } from 'lucide-react';
import { isPermissionDeniedError } from '../../lib/firebase';

export type AdminTabId =
  | 'overview'
  | 'live'
  | 'music'
  | 'times'
  | 'sermons'
  | 'events'
  | 'pastor'
  | 'contact'
  | 'prayer'
  | 'admins'
  | 'danger';

export type SaveStatus = 'clean' | 'dirty' | 'saving' | 'saved' | 'error';

export const inputCls =
  'w-full min-h-12 rounded-xl border border-ink/20 bg-white px-4 py-2.5 text-base text-ink placeholder:text-ink/40 focus:border-pine focus:outline-none';

export const textareaCls =
  'w-full rounded-xl border border-ink/20 bg-white px-4 py-3 text-base text-ink placeholder:text-ink/40 focus:border-pine focus:outline-none';

export function formatAdminError(error: unknown): string {
  if (isPermissionDeniedError(error)) {
    return 'You do not have permission. Sign in again with the church admin Google account.';
  }
  if (error instanceof Error && error.message) {
    return error.message;
  }
  return 'Something went wrong. Please check your internet connection and try again.';
}

export function extractYouTubeId(raw: string): string {
  const val = raw.trim();
  if (!val) return '';
  if (/^[a-zA-Z0-9_-]{11}$/.test(val)) return val;

  try {
    const withProto = /^https?:\/\//i.test(val) ? val : `https://${val}`;
    const url = new URL(withProto);
    const vParam = url.searchParams.get('v');
    if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) return vParam;

    const parts = url.pathname.split('/').filter(Boolean);
    if (url.hostname.includes('youtu.be') && parts[0] && /^[a-zA-Z0-9_-]{11}$/.test(parts[0])) {
      return parts[0];
    }
    const idx = parts.findIndex((p) => p === 'embed' || p === 'shorts' || p === 'live' || p === 'v');
    if (idx !== -1 && parts[idx + 1] && /^[a-zA-Z0-9_-]{11}$/.test(parts[idx + 1])) {
      return parts[idx + 1];
    }
  } catch {
    // Fallback regex
  }

  const match = val.match(/(?:v=|youtu\.be\/|embed\/|shorts\/|live\/)([a-zA-Z0-9_-]{11})/);
  return match?.[1] ?? val;
}

export const Field: React.FC<{
  id: string;
  label: string;
  helper?: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}> = ({ id, label, helper, error, required, children }) => (
  <div className="space-y-1.5">
    <label htmlFor={id} className="block text-sm font-bold text-pine">
      {label}
      {required && <span className="text-clay ml-1" aria-hidden="true">*</span>}
    </label>
    {children}
    {helper && !error && <p className="text-xs text-ink/65">{helper}</p>}
    {error && (
      <p role="alert" className="text-xs font-semibold text-red-700 flex items-center gap-1">
        <AlertCircle size={14} className="shrink-0" />
        <span>{error}</span>
      </p>
    )}
  </div>
);

export const MoveButtons: React.FC<{
  index: number;
  total: number;
  onMove: (from: number, to: number) => void;
  itemName: string;
}> = ({ index, total, onMove, itemName }) => (
  <div className="flex items-center gap-1">
    <button
      type="button"
      disabled={index === 0}
      onClick={() => onMove(index, index - 1)}
      aria-label={`Move ${itemName} up`}
      className="min-h-11 min-w-11 grid place-items-center rounded-xl border border-ink/15 bg-paper text-pine hover:bg-sand disabled:opacity-35 disabled:pointer-events-none transition"
    >
      <ArrowUp size={18} />
    </button>
    <button
      type="button"
      disabled={index >= total - 1}
      onClick={() => onMove(index, index + 1)}
      aria-label={`Move ${itemName} down`}
      className="min-h-11 min-w-11 grid place-items-center rounded-xl border border-ink/15 bg-paper text-pine hover:bg-sand disabled:opacity-35 disabled:pointer-events-none transition"
    >
      <ArrowDown size={18} />
    </button>
  </div>
);

export const ConfirmDeleteButton: React.FC<{
  label?: string;
  itemLabel: string;
  onConfirm: () => void | Promise<void>;
  busy?: boolean;
}> = ({ label = 'Delete', itemLabel, onConfirm, busy = false }) => {
  const [confirming, setConfirming] = useState(false);

  if (confirming) {
    return (
      <div className="flex items-center gap-2 flex-wrap">
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            await onConfirm();
            setConfirming(false);
          }}
          className="min-h-11 px-3.5 rounded-xl bg-red-700 text-white text-sm font-bold hover:bg-red-800 disabled:opacity-50 transition"
        >
          {busy ? 'Deleting...' : 'Yes, delete'}
        </button>
        <button
          type="button"
          disabled={busy}
          onClick={() => setConfirming(false)}
          className="min-h-11 px-3.5 rounded-xl border border-ink/20 bg-white text-ink text-sm font-semibold hover:bg-sand transition"
        >
          Cancel
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      aria-label={`Delete ${itemLabel}`}
      className="min-h-11 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-red-200 bg-red-50/80 text-red-700 text-sm font-semibold hover:bg-red-100 transition"
    >
      <Trash2 size={16} />
      <span>{label}</span>
    </button>
  );
};

export const SaveBar: React.FC<{
  status: SaveStatus;
  errorMessage?: string | null;
  onSave: () => void;
  onDiscard?: () => void;
}> = ({ status, errorMessage, onSave, onDiscard }) => {
  const isDirty = status === 'dirty';
  const isSaving = status === 'saving';
  const isSaved = status === 'saved';
  const isError = status === 'error';

  return (
    <div className="sticky bottom-0 z-20 -mx-4 sm:-mx-6 px-4 sm:px-6 py-3 bg-paper/95 backdrop-blur border-t border-ink/15 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
      <div aria-live="polite" className="text-sm font-semibold flex items-center gap-2 min-h-6">
        {isSaving && (
          <span className="inline-flex items-center gap-2 text-pine">
            <Loader2 size={16} className="animate-spin" />
            Saving changes...
          </span>
        )}
        {isSaved && (
          <span className="inline-flex items-center gap-1.5 text-pine">
            <Check size={16} className="text-pine" />
            Saved to the church website
          </span>
        )}
        {isDirty && <span className="text-clay">Unsaved changes</span>}
        {isError && (
          <span className="text-red-700 flex items-center gap-1.5">
            <AlertCircle size={16} className="shrink-0" />
            {errorMessage || 'Could not save changes.'}
          </span>
        )}
        {status === 'clean' && <span className="text-ink/55">All changes saved</span>}
      </div>

      <div className="flex items-center gap-2 sm:justify-end">
        {isDirty && onDiscard && (
          <button
            type="button"
            onClick={onDiscard}
            className="min-h-12 px-4 rounded-full border border-ink/20 bg-white text-ink text-sm font-bold hover:bg-sand transition"
          >
            Discard
          </button>
        )}
        <button
          type="button"
          disabled={isSaving || (!isDirty && !isError)}
          onClick={onSave}
          className="flex-1 sm:flex-initial min-h-12 px-6 rounded-full bg-pine text-white text-sm font-bold hover:bg-clay disabled:opacity-45 disabled:pointer-events-none transition inline-flex items-center justify-center gap-2"
        >
          {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
          <span>{isSaving ? 'Saving...' : 'Save changes'}</span>
        </button>
      </div>
    </div>
  );
};
