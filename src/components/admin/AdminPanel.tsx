import React, { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  Clock,
  HandHeart,
  Home,
  LayoutGrid,
  Loader2,
  LogOut,
  MoreHorizontal,
  Music2,
  Phone,
  Radio,
  ShieldCheck,
  Users,
  Video,
  X,
  AlertCircle,
} from 'lucide-react';
import { subscribeToLive, subscribeToMusic, subscribeToPrayerPetitions } from '../../lib/firebase';
import { useAdmin } from '../../lib/useAdmin';
import type { ChurchSettings } from '../../types/church';
import type { AdminTabId } from './AdminShared';

const OverviewTab = lazy(() => import('./OverviewTab'));
const LiveTab = lazy(() => import('./LiveTab'));
const MusicTab = lazy(() => import('./MusicTab'));
const TimesTab = lazy(() => import('./TimesTab'));
const SermonsTab = lazy(() => import('./SermonsTab'));
const EventsMinistriesTab = lazy(() => import('./EventsMinistriesTab'));
const PastorHomeTab = lazy(() => import('./PastorHomeTab'));
const ContactGivingTab = lazy(() => import('./ContactGivingTab'));
const PrayerRequestsTab = lazy(() => import('./PrayerRequestsTab'));
const AdminsTab = lazy(() => import('./AdminsTab'));
const DangerZoneTab = lazy(() => import('./DangerZoneTab'));

export interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChurchSettings;
  onSaveSettings: (newSettings: ChurchSettings) => Promise<void>;
  onResetSettings: () => Promise<void> | void;
}

interface TabDef {
  id: AdminTabId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{ size?: number; className?: string }>;
}

const ALL_TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', shortLabel: 'Home', icon: LayoutGrid },
  { id: 'live', label: 'Watch Live', shortLabel: 'Live', icon: Radio },
  { id: 'music', label: 'Music', shortLabel: 'Music', icon: Music2 },
  { id: 'times', label: 'Service Times', shortLabel: 'Times', icon: Clock },
  { id: 'sermons', label: 'Sermons', shortLabel: 'Sermons', icon: Video },
  { id: 'events', label: 'Events & Ministries', shortLabel: 'Events', icon: Calendar },
  { id: 'pastor', label: 'Pastor & Home', shortLabel: 'Pastor', icon: Home },
  { id: 'contact', label: 'Contact & Giving', shortLabel: 'Giving', icon: Phone },
  { id: 'prayer', label: 'Prayer Requests', shortLabel: 'Prayer', icon: HandHeart },
  { id: 'admins', label: 'Admins', shortLabel: 'Admins', icon: Users },
  { id: 'danger', label: 'Danger zone', shortLabel: 'Danger', icon: AlertTriangle },
];

const MOBILE_PRIMARY_IDS: AdminTabId[] = ['overview', 'live', 'music', 'prayer'];
const MOBILE_MORE_IDS: AdminTabId[] = ['times', 'sermons', 'events', 'pastor', 'contact', 'admins', 'danger'];

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  onResetSettings,
}) => {
  const { user, isAdmin, loading, signIn, signOut, error } = useAdmin();
  const [activeTab, setActiveTab] = useState<AdminTabId>('overview');
  const [moreOpen, setMoreOpen] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [pendingAction, setPendingAction] = useState<
    | { type: 'close' }
    | { type: 'tab'; tab: AdminTabId; quickAction?: 'add' }
    | null
  >(null);
  const [quickActionTab, setQuickActionTab] = useState<AdminTabId | null>(null);

  const [musicCount, setMusicCount] = useState<number | null>(null);
  const [newPrayerCount, setNewPrayerCount] = useState<number | null>(null);
  const [liveActive, setLiveActive] = useState(false);

  const dialogRef = useRef<HTMLDivElement>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);
  const syncedStaleRef = useRef(false);

  useEffect(() => {
    if (
      isAdmin &&
      (settings.updatedAt === '2026-11-24T18:54:31.775Z' ||
        settings.updatedAt === '2026-11-24T19:04:54.817Z') &&
      !syncedStaleRef.current
    ) {
      syncedStaleRef.current = true;
      onSaveSettings(settings).catch(() => {});
    }
  }, [isAdmin, settings, onSaveSettings]);

  useEffect(() => {
    if (!isOpen || !isAdmin) return;
    const unsubMusic = subscribeToMusic(
      (list) => setMusicCount(list.length),
      () => setMusicCount(0)
    );
    const unsubPrayer = subscribeToPrayerPetitions(
      (list) => setNewPrayerCount(list.filter((p) => !p.prayedFor).length),
      () => setNewPrayerCount(0)
    );
    const unsubLive = subscribeToLive(
      (st) => setLiveActive(Boolean(st.isLive && st.mode !== 'off')),
      () => setLiveActive(false)
    );
    return () => {
      unsubMusic();
      unsubPrayer();
      unsubLive();
    };
  }, [isOpen, isAdmin]);

  const requestClose = useCallback(() => {
    if (hasUnsavedChanges) {
      setPendingAction({ type: 'close' });
      return;
    }
    setMoreOpen(false);
    onClose();
  }, [hasUnsavedChanges, onClose]);

  const requestTabChange = useCallback(
    (tab: AdminTabId, quickAction?: 'add') => {
      setMoreOpen(false);
      if (tab === activeTab && !quickAction) return;
      if (hasUnsavedChanges && tab !== activeTab) {
        setPendingAction({ type: 'tab', tab, quickAction });
        return;
      }
      setActiveTab(tab);
      if (quickAction === 'add') setQuickActionTab(tab);
    },
    [activeTab, hasUnsavedChanges]
  );

  // Focus management, body scroll lock, Escape + focus trap
  useEffect(() => {
    if (!isOpen) return;
    previousFocusRef.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const timer = window.setTimeout(() => {
      const container = dialogRef.current;
      if (!container) return;
      const firstFocusable = container.querySelector<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      );
      firstFocusable?.focus();
    }, 20);

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        if (moreOpen) {
          setMoreOpen(false);
        } else {
          requestClose();
        }
        return;
      }
      if (e.key === 'Tab' && dialogRef.current) {
        const focusables = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
          )
        ).filter((el) => el.offsetParent !== null);
        if (focusables.length === 0) return;
        const first = focusables[0];
        const last = focusables[focusables.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.clearTimeout(timer);
      window.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = prevOverflow;
      previousFocusRef.current?.focus();
    };
  }, [isOpen, moreOpen, requestClose]);

  if (!isOpen) return null;

  const confirmDiscardAndProceed = () => {
    const action = pendingAction;
    setPendingAction(null);
    setHasUnsavedChanges(false);
    if (!action) return;
    if (action.type === 'close') {
      onClose();
    } else {
      setActiveTab(action.tab);
      if (action.quickAction === 'add') setQuickActionTab(action.tab);
    }
  };

  const renderAuthGate = () => {
    if (loading) {
      return (
        <div className="flex-1 grid place-items-center p-6 text-center">
          <div className="space-y-3">
            <Loader2 size={32} className="mx-auto animate-spin text-pine" />
            <p className="text-base font-semibold text-pine">Checking church admin access...</p>
          </div>
        </div>
      );
    }

    if (!user) {
      return (
        <div className="flex-1 grid place-items-center p-6">
          <div className="w-full max-w-md bg-white rounded-3xl border border-ink/10 p-6 sm:p-8 shadow-sm text-center space-y-5">
            <div className="mx-auto size-14 rounded-2xl bg-pine/10 text-pine grid place-items-center">
              <ShieldCheck size={28} />
            </div>
            <div>
              <p className="font-hand text-2xl text-clay">Church leaders only</p>
              <h2 className="font-display text-2xl sm:text-3xl font-bold text-pine mt-1">
                {settings.churchName}
              </h2>
              <p className="mt-2 text-sm text-ink/70">
                Sign in with an authorized church Google account to update songs, service times, sermons, events, or read prayer requests.
              </p>
            </div>

            {error && (
              <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800 text-left flex items-start gap-2">
                <AlertCircle size={18} className="shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={() => signIn()}
              className="w-full min-h-12 px-6 rounded-full bg-pine text-white font-bold text-base hover:bg-clay transition inline-flex items-center justify-center gap-2.5"
            >
              <span>{error ? 'Retry Google Sign-In' : 'Sign in with Google'}</span>
            </button>
          </div>
        </div>
      );
    }

    if (!isAdmin) {
      return (
        <div className="flex-1 grid place-items-center p-6">
          <div className="w-full max-w-md bg-white rounded-3xl border border-ink/10 p-6 sm:p-8 shadow-sm text-center space-y-5">
            <div className="mx-auto size-14 rounded-2xl bg-clay/15 text-clay grid place-items-center">
              <AlertTriangle size={28} />
            </div>
            <div>
              <h2 className="font-display text-2xl font-bold text-pine">Account not authorized</h2>
              <p className="mt-3 text-sm sm:text-base text-ink/80 leading-relaxed">
                You are signed in as <span className="font-bold text-pine">{user.email}</span>, but this account is not allowed to edit the website. Ask the church admin to add you.
              </p>
            </div>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={() => signOut()}
                className="min-h-12 px-6 rounded-full bg-clay text-white font-bold text-sm hover:bg-[#a05a37] transition inline-flex items-center justify-center gap-2"
              >
                <LogOut size={16} />
                <span>Sign out</span>
              </button>
              <button
                type="button"
                onClick={requestClose}
                className="min-h-12 px-6 rounded-full border border-ink/20 bg-paper text-ink font-semibold text-sm hover:bg-sand transition"
              >
                Back to website
              </button>
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  const authGate = renderAuthGate();

  return (
    <div
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center lg:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) requestClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="admin-dialog-title"
        className="w-full h-full lg:h-[88vh] lg:max-w-5xl lg:rounded-3xl bg-paper text-ink shadow-2xl border border-ink/15 flex flex-col overflow-hidden"
      >
        {/* Top bar */}
        <header className="shrink-0 bg-pine text-white px-4 sm:px-6 min-h-16 py-2.5 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <h1 id="admin-dialog-title" className="font-display text-lg sm:text-xl font-bold truncate">
              {settings.churchName} · Admin
            </h1>
            {user && (
              <p className="text-xs text-white/75 truncate">{user.email}</p>
            )}
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {user && (
              <button
                type="button"
                onClick={() => signOut()}
                className="min-h-11 px-3.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs sm:text-sm font-bold inline-flex items-center gap-1.5 transition"
              >
                <LogOut size={15} />
                <span className="hidden sm:inline">Sign out</span>
              </button>
            )}
            <button
              type="button"
              onClick={requestClose}
              aria-label="Close admin panel"
              className="min-h-11 min-w-11 rounded-full bg-white/10 hover:bg-white/20 text-white grid place-items-center transition"
            >
              <X size={20} />
            </button>
          </div>
        </header>

        {/* Unsaved changes confirmation bar */}
        {pendingAction && (
          <div
            role="alertdialog"
            aria-label="Unsaved changes warning"
            className="shrink-0 bg-clay text-white px-4 sm:px-6 py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
          >
            <p className="text-sm font-bold">
              You have unsaved changes. Do you want to leave without saving?
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPendingAction(null)}
                className="min-h-11 px-4 rounded-full bg-white text-pine text-sm font-bold"
              >
                Keep editing
              </button>
              <button
                type="button"
                onClick={confirmDiscardAndProceed}
                className="min-h-11 px-4 rounded-full border border-white/60 text-white text-sm font-bold hover:bg-white/15"
              >
                Discard & continue
              </button>
            </div>
          </div>
        )}

        {authGate ? (
          authGate
        ) : (
          <div className="flex-1 min-h-0 flex flex-col lg:flex-row">
            {/* Desktop Left Sidebar */}
            <aside className="hidden lg:flex lg:w-64 shrink-0 flex-col bg-sand/70 border-r border-ink/10 p-3 justify-between overflow-y-auto">
              <nav aria-label="Admin sections" className="space-y-1">
                {ALL_TABS.filter((t) => t.id !== 'danger').map((tab) => {
                  const Icon = tab.icon;
                  const active = activeTab === tab.id;
                  const badge =
                    tab.id === 'prayer' && newPrayerCount && newPrayerCount > 0 ? newPrayerCount : null;
                  return (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => requestTabChange(tab.id)}
                      className={`w-full min-h-12 px-3.5 rounded-xl flex items-center justify-between gap-2 text-sm font-bold transition ${
                        active
                          ? 'bg-pine text-white shadow-sm'
                          : 'text-ink/80 hover:bg-paper hover:text-pine'
                      }`}
                    >
                      <span className="flex items-center gap-2.5 truncate">
                        <Icon size={18} className="shrink-0" />
                        <span className="truncate">{tab.label}</span>
                      </span>
                      {badge !== null && (
                        <span
                          className={`px-2 py-0.5 rounded-full text-xs font-bold ${
                            active ? 'bg-clay text-white' : 'bg-clay/15 text-clay'
                          }`}
                        >
                          {badge}
                        </span>
                      )}
                      {tab.id === 'live' && liveActive && (
                        <span className="size-2.5 rounded-full bg-red-600 animate-pulse motion-reduce:animate-none" aria-label="Currently live" />
                      )}
                    </button>
                  );
                })}
              </nav>

              <div className="pt-3 mt-3 border-t border-ink/10">
                <button
                  type="button"
                  onClick={() => requestTabChange('danger')}
                  className={`w-full min-h-12 px-3.5 rounded-xl flex items-center gap-2.5 text-sm font-bold transition ${
                    activeTab === 'danger'
                      ? 'bg-red-700 text-white'
                      : 'text-red-800 hover:bg-red-50'
                  }`}
                >
                  <AlertTriangle size={18} />
                  <span>Danger zone</span>
                </button>
              </div>
            </aside>

            {/* Main scrollable content */}
            <main className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6">
              <Suspense
                fallback={
                  <div className="py-12 text-center text-ink/60 flex items-center justify-center gap-2">
                    <Loader2 size={18} className="animate-spin" />
                    <span>Loading...</span>
                  </div>
                }
              >
                {activeTab === 'overview' && (
                  <OverviewTab
                    adminName={user?.displayName || user?.email || 'Leader'}
                    settings={settings}
                    musicCount={musicCount}
                    newPrayerCount={newPrayerCount}
                    onNavigate={requestTabChange}
                  />
                )}
                {activeTab === 'live' && <LiveTab onDirtyChange={setHasUnsavedChanges} />}
                {activeTab === 'music' && <MusicTab />}
                {activeTab === 'times' && (
                  <TimesTab
                    settings={settings}
                    onSaveSettings={onSaveSettings}
                    onDirtyChange={setHasUnsavedChanges}
                  />
                )}
                {activeTab === 'sermons' && (
                  <SermonsTab
                    settings={settings}
                    onSaveSettings={onSaveSettings}
                    onDirtyChange={setHasUnsavedChanges}
                    startAdding={quickActionTab === 'sermons'}
                    onConsumeQuickAction={() => setQuickActionTab(null)}
                  />
                )}
                {activeTab === 'events' && (
                  <EventsMinistriesTab
                    settings={settings}
                    onSaveSettings={onSaveSettings}
                    onDirtyChange={setHasUnsavedChanges}
                    startAdding={quickActionTab === 'events'}
                    onConsumeQuickAction={() => setQuickActionTab(null)}
                  />
                )}
                {activeTab === 'pastor' && (
                  <PastorHomeTab
                    settings={settings}
                    onSaveSettings={onSaveSettings}
                    onDirtyChange={setHasUnsavedChanges}
                  />
                )}
                {activeTab === 'contact' && (
                  <ContactGivingTab
                    settings={settings}
                    onSaveSettings={onSaveSettings}
                    onDirtyChange={setHasUnsavedChanges}
                  />
                )}
                {activeTab === 'prayer' && <PrayerRequestsTab />}
                {activeTab === 'admins' && <AdminsTab currentUserEmail={user?.email || ''} />}
                {activeTab === 'danger' && <DangerZoneTab onResetSettings={onResetSettings} />}
              </Suspense>
            </main>

            {/* Mobile "More" Drawer */}
            {moreOpen && (
              <div
                className="lg:hidden fixed inset-x-0 bottom-16 top-16 z-30 bg-black/40 flex items-end"
                onClick={(e) => {
                  if (e.target === e.currentTarget) setMoreOpen(false);
                }}
              >
                <div className="w-full bg-paper rounded-t-3xl border-t border-ink/15 p-4 space-y-2 shadow-2xl max-h-[75vh] overflow-y-auto">
                  <div className="flex items-center justify-between px-1 pb-2">
                    <h2 className="font-display text-lg font-bold text-pine">More sections</h2>
                    <button
                      type="button"
                      onClick={() => setMoreOpen(false)}
                      aria-label="Close more menu"
                      className="min-h-11 min-w-11 grid place-items-center rounded-full text-ink/70 hover:bg-sand"
                    >
                      <X size={20} />
                    </button>
                  </div>
                  <div className="grid gap-1.5">
                    {MOBILE_MORE_IDS.map((id) => {
                      const tab = ALL_TABS.find((t) => t.id === id)!;
                      const Icon = tab.icon;
                      const active = activeTab === id;
                      const isDanger = id === 'danger';
                      return (
                        <button
                          key={id}
                          type="button"
                          onClick={() => requestTabChange(id)}
                          className={`w-full min-h-12 px-4 rounded-xl flex items-center gap-3 text-base font-bold transition ${
                            active
                              ? isDanger
                                ? 'bg-red-700 text-white'
                                : 'bg-pine text-white'
                              : isDanger
                              ? 'bg-red-50 text-red-800'
                              : 'bg-white text-pine border border-ink/10'
                          }`}
                        >
                          <Icon size={20} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Mobile Fixed Bottom Tab Bar (max 5 items, >=48px touch targets) */}
            <nav
              aria-label="Mobile admin navigation"
              className="lg:hidden shrink-0 bg-white border-t border-ink/15 grid grid-cols-5 px-1 pb-[env(safe-area-inset-bottom)]"
            >
              {MOBILE_PRIMARY_IDS.map((id) => {
                const tab = ALL_TABS.find((t) => t.id === id)!;
                const Icon = tab.icon;
                const active = activeTab === id && !moreOpen;
                const badge =
                  id === 'prayer' && newPrayerCount && newPrayerCount > 0 ? newPrayerCount : null;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => requestTabChange(id)}
                    className={`relative min-h-14 py-1.5 flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition ${
                      active ? 'text-clay' : 'text-ink/65 hover:text-pine'
                    }`}
                  >
                    <Icon size={20} />
                    <span>{tab.shortLabel}</span>
                    {badge !== null && (
                      <span className="absolute top-1.5 right-3 min-w-4 h-4 px-1 rounded-full bg-clay text-white text-[10px] leading-4 font-bold text-center">
                        {badge}
                      </span>
                    )}
                    {id === 'live' && liveActive && (
                      <span className="absolute top-2 right-4 size-2 rounded-full bg-red-600 animate-pulse motion-reduce:animate-none" aria-label="Currently live" />
                    )}
                  </button>
                );
              })}

              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                aria-expanded={moreOpen}
                className={`min-h-14 py-1.5 flex flex-col items-center justify-center gap-0.5 text-xs font-bold transition ${
                  moreOpen || MOBILE_MORE_IDS.includes(activeTab)
                    ? 'text-clay'
                    : 'text-ink/65 hover:text-pine'
                }`}
              >
                <MoreHorizontal size={20} />
                <span>More</span>
              </button>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
