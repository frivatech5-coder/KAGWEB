import React, { useEffect, useState } from 'react';
import { ShieldCheck, UserPlus, AlertCircle, Info } from 'lucide-react';
import {
  ADMIN_EMAILS,
  addAdminEmail,
  removeAdminEmail,
  subscribeToAdminEmails,
  type AdminEmailEntry,
} from '../../lib/firebase';
import { ConfirmDeleteButton, Field, formatAdminError, inputCls } from './AdminShared';

interface AdminsTabProps {
  currentUserEmail: string;
}

export const AdminsTab: React.FC<AdminsTabProps> = ({ currentUserEmail }) => {
  const [entries, setEntries] = useState<AdminEmailEntry[]>([]);
  const [emailInput, setEmailInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    const unsub = subscribeToAdminEmails(setEntries, (err) => setError(formatAdminError(err)));
    return () => unsub();
  }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const clean = emailInput.trim().toLowerCase();
    if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
      setError('Please enter a valid Google email address (e.g. leader@gmail.com).');
      return;
    }
    if (ADMIN_EMAILS.includes(clean)) {
      setError('That email is already the primary church admin.');
      return;
    }
    setBusy(true);
    try {
      await addAdminEmail(clean, currentUserEmail);
      setEmailInput('');
    } catch (err) {
      setError(formatAdminError(err));
    } finally {
      setBusy(false);
    }
  };

  const handleRemove = async (email: string) => {
    setError(null);
    try {
      await removeAdminEmail(email);
    } catch (err) {
      setError(formatAdminError(err));
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-display text-2xl font-bold text-pine">Church Admins</h2>
        <p className="text-sm text-ink/70 mt-1">
          Let another pastor or volunteer sign in with their own Google account.
        </p>
      </div>

      <div className="rounded-2xl bg-sand border border-gold/50 p-4 flex items-start gap-3 text-sm text-ink/85">
        <Info size={18} className="text-clay shrink-0 mt-0.5" />
        <p>
          Leaders added below can edit website details and view prayer requests immediately. Uploading music or photos also requires adding their Google email to <code className="font-mono text-xs bg-white px-1.5 py-0.5 rounded">storage.rules</code>.
        </p>
      </div>

      <form onSubmit={handleAdd} noValidate className="bg-white rounded-2xl border border-ink/10 p-4 sm:p-6 space-y-4 shadow-sm">
        <Field
          id="new-admin-email"
          label="Add a leader's Google email"
          helper="They will sign in using the 'Sign in with Google' button on this screen."
          error={error ?? undefined}
        >
          <div className="flex flex-col sm:flex-row gap-3">
            <input
              id="new-admin-email"
              type="email"
              value={emailInput}
              onChange={(e) => {
                setEmailInput(e.target.value);
                setError(null);
              }}
              placeholder="pastor.name@gmail.com"
              className={inputCls}
            />
            <button
              type="submit"
              disabled={busy}
              className="min-h-12 px-6 rounded-full bg-pine text-white text-sm font-bold hover:bg-clay disabled:opacity-50 transition inline-flex items-center justify-center gap-2 shrink-0"
            >
              <UserPlus size={18} />
              <span>{busy ? 'Adding...' : 'Add admin'}</span>
            </button>
          </div>
        </Field>
      </form>

      <div className="space-y-3">
        <h3 className="font-display text-lg font-bold text-pine">Authorized Google accounts</h3>
        <ul className="space-y-2.5">
          {ADMIN_EMAILS.map((email) => (
            <li
              key={email}
              className="bg-white rounded-2xl border border-ink/10 p-4 flex items-center justify-between gap-3"
            >
              <div className="min-w-0">
                <p className="font-bold text-pine truncate">{email}</p>
                <p className="text-xs text-ink/60 flex items-center gap-1 mt-0.5">
                  <ShieldCheck size={14} className="text-clay" />
                  Primary church admin (always enabled)
                </p>
              </div>
            </li>
          ))}

          {entries
            .filter((e) => !ADMIN_EMAILS.includes(e.email))
            .map((entry) => {
              const isSelf = entry.email === currentUserEmail.toLowerCase();
              return (
                <li
                  key={entry.email}
                  className="bg-white rounded-2xl border border-ink/10 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-pine truncate">
                      {entry.email} {isSelf ? '(You)' : ''}
                    </p>
                    <p className="text-xs text-ink/60">
                      Added {entry.addedBy ? `by ${entry.addedBy}` : 'by church admin'}
                    </p>
                  </div>
                  {!isSelf && (
                    <ConfirmDeleteButton
                      label="Remove"
                      itemLabel={entry.email}
                      onConfirm={() => handleRemove(entry.email)}
                    />
                  )}
                </li>
              );
            })}
        </ul>
      </div>

      {error && (
        <p role="alert" className="text-xs font-semibold text-red-700 flex items-center gap-1">
          <AlertCircle size={14} />
          <span>{error}</span>
        </p>
      )}
    </div>
  );
};

export default AdminsTab;
