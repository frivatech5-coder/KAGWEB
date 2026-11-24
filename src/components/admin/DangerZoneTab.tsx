import React, { useState } from 'react';
import { AlertTriangle, Check, RotateCcw } from 'lucide-react';
import { Field, formatAdminError, inputCls } from './AdminShared';

interface DangerZoneTabProps {
  onResetSettings: () => Promise<void> | void;
}

export const DangerZoneTab: React.FC<DangerZoneTabProps> = ({ onResetSettings }) => {
  const [confirmText, setConfirmText] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canReset = confirmText.trim() === 'RESET';

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canReset) return;
    setBusy(true);
    setError(null);
    setDone(false);
    try {
      await onResetSettings();
      setConfirmText('');
      setDone(true);
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-red-800">Danger Zone</h2>
        <p className="text-sm text-ink/70 mt-1">
          Only use this if you want to erase website text changes and start fresh with the original template.
        </p>
      </div>

      <form
        onSubmit={handleReset}
        className="bg-white rounded-2xl border-2 border-red-200 p-5 sm:p-6 space-y-4 shadow-sm"
      >
        <div className="flex items-start gap-3">
          <AlertTriangle size={22} className="text-red-700 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-display text-lg font-bold text-red-800">
              Reset website content to defaults
            </h3>
            <p className="text-sm text-ink/75">
              This restores the original service times, sermons, events, welcome letter, and M-Pesa template. Uploaded worship songs and prayer requests will NOT be deleted.
            </p>
          </div>
        </div>

        <Field
          id="danger-reset-confirm"
          label="Type RESET in capital letters to unlock"
          error={error ?? undefined}
        >
          <input
            id="danger-reset-confirm"
            type="text"
            value={confirmText}
            onChange={(e) => {
              setConfirmText(e.target.value);
              setDone(false);
            }}
            placeholder="Type RESET"
            className={inputCls}
          />
        </Field>

        {done && (
          <p role="status" className="text-sm font-semibold text-pine flex items-center gap-1.5">
            <Check size={16} />
            Website content has been restored to defaults.
          </p>
        )}

        <button
          type="submit"
          disabled={!canReset || busy}
          className="min-h-12 px-6 rounded-full bg-red-700 text-white text-sm font-bold hover:bg-red-800 disabled:opacity-40 disabled:pointer-events-none transition inline-flex items-center gap-2"
        >
          <RotateCcw size={16} />
          <span>{busy ? 'Resetting...' : 'Reset to defaults'}</span>
        </button>
      </form>
    </div>
  );
};

export default DangerZoneTab;
