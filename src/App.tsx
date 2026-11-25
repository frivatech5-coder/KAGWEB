import React, { useState, useEffect, lazy, Suspense } from 'react';
import { Header, Hero, Welcome, Times, Sermons, Events, Give, Visit, Footer } from './components/Site';
import { LiveBanner, LiveSection } from './components/Live';
import { Music } from './components/Music';
import { initialChurchSettings, initialLiveStatus } from './data/defaultChurchData';
import { ChurchSettings, LiveStatus } from './types/church';

const PrayerRequestModal = lazy(() => import('./components/PrayerRequestModal').then((m) => ({ default: m.PrayerRequestModal })));
const AdminPanel = lazy(() => import('./components/admin/AdminPanel'));

const loadFirebase = () => import('./lib/firebase');

/**
 * Defensive deep-merging to ensure that:
 * 1. Default content is available if Firestore doc is fresh.
 * 2. Explicitly deleted or emptied arrays (e.g. user deleted all gallery photos)
 *    are HONORED and NEVER overwritten by fallback defaults.
 */
const STALE_SCHEDULE_UPDATED_AT = '2026-11-24T18:54:31.775Z';

export function mergeSettingsWithDefaults(remote: Partial<ChurchSettings> | null | undefined): ChurchSettings {
  if (!remote) return initialChurchSettings;
  const rawSchedules = Array.isArray(remote.schedules)
    ? remote.schedules.length > 0
      ? remote.schedules
      : initialChurchSettings.schedules
    : initialChurchSettings.schedules;

  const schedules =
    remote.updatedAt === STALE_SCHEDULE_UPDATED_AT
      ? rawSchedules.map((s) =>
          s.id === 'sch-6' && s.time === '07:00 AM – 09:30 AM'
            ? { ...s, time: '10:00 AM – 01:00 PM' }
            : s
        )
      : rawSchedules;

  return {
    ...initialChurchSettings,
    ...remote,
    // Preserve array instances explicitly (even if [] empty array)
    gallery: Array.isArray(remote.gallery) ? remote.gallery : initialChurchSettings.gallery,
    schedules,
    sermons: Array.isArray(remote.sermons) ? remote.sermons : initialChurchSettings.sermons,
    ministries: Array.isArray(remote.ministries) ? remote.ministries : initialChurchSettings.ministries,
    events: Array.isArray(remote.events) ? remote.events : initialChurchSettings.events,
    mpesa: {
      ...initialChurchSettings.mpesa,
      ...(remote.mpesa || {}),
    },
    social: {
      ...initialChurchSettings.social,
      ...(remote.social || {}),
    },
    hero: {
      ...initialChurchSettings.hero,
      ...(remote.hero || {}),
    },
    scripture: {
      ...initialChurchSettings.scripture,
      ...(remote.scripture || {}),
    },
    story: {
      ...initialChurchSettings.story,
      ...(remote.story || {}),
    },
    pastor: {
      ...initialChurchSettings.pastor,
      ...(remote.pastor || {}),
    },
    giving: {
      ...initialChurchSettings.giving,
      ...(remote.giving || {}),
    },
    directions: (() => {
      const mergedDir = {
        ...initialChurchSettings.directions,
        ...(remote.directions || {}),
      };
      if (!mergedDir.mapsQuery || mergedDir.mapsQuery === 'Witima, Othaya, Nyeri, Kenya') {
        mergedDir.mapsQuery = 'CXVM+CHX, Witima';
      }
      if (mergedDir.addressDetails && !mergedDir.addressDetails.includes('CXVM+CHX')) {
        mergedDir.addressDetails = `CXVM+CHX, Witima · ${mergedDir.addressDetails}`;
      }
      return mergedDir;
    })(),
    footer: {
      ...initialChurchSettings.footer,
      ...(remote.footer || {}),
    },
  };
}

export default function App() {
  const [settings, setSettings] = useState<ChurchSettings>(() => {
    try {
      const saved = localStorage.getItem('witima_church_settings');
      if (saved) {
        const parsed = JSON.parse(
          saved.replace(/\/src\/assets\/images\/([a-z_]+)_\d+\.jpg/g, '/images/$1.webp')
        );
        return mergeSettingsWithDefaults(parsed);
      }
    } catch {
      // Fallback
    }
    return initialChurchSettings;
  });

  const [prayerModalOpen, setPrayerModalOpen] = useState(false);
  const [adminModalOpen, setAdminModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<LiveStatus>(initialLiveStatus);
  const [liveBannerDismissed, setLiveBannerDismissed] = useState(false);

  // Show a momentary confirmation toast
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 3500);
  };

  // Real-time synchronization with Firebase Firestore
  useEffect(() => {
    let unsubscribeSettings: (() => void) | undefined;
    let unsubscribeLive: (() => void) | undefined;
    let cancelled = false;

    const start = () =>
      loadFirebase()
        .then(({ testConnection, subscribeToChurchSettings, subscribeToLive }) => {
          if (cancelled) return;
          testConnection();
          unsubscribeSettings = subscribeToChurchSettings(
            (remoteSettings) => {
              if (remoteSettings && remoteSettings.churchName) {
                const cleaned = JSON.parse(
                  JSON.stringify(remoteSettings).replace(
                    /\/src\/assets\/images\/([a-z_]+)_\d+\.jpg/g,
                    '/images/$1.webp'
                  )
                );
                const merged = mergeSettingsWithDefaults(cleaned);
                setSettings(merged);
                try {
                  localStorage.setItem('witima_church_settings', JSON.stringify(merged));
                } catch {
                  // Ignore
                }
              }
            },
            (error) => {
              console.warn('Real-time sync error, using local fallback:', error);
            }
          );
          unsubscribeLive = subscribeToLive(
            (nextLive) => {
              setLiveStatus(nextLive);
            },
            (error) => {
              console.warn('Live sync error:', error);
            }
          );
        })
        .catch((err) => {
          console.warn('Could not initialize Firebase connection:', err);
        });

    const idle = (window as any).requestIdleCallback as ((cb: () => void) => number) | undefined;
    if (idle) idle(start);
    else setTimeout(start, 400);

    return () => {
      cancelled = true;
      if (unsubscribeSettings) unsubscribeSettings();
      if (unsubscribeLive) unsubscribeLive();
    };
  }, []);

  // Support deep link #live once Live section renders
  useEffect(() => {
    if (liveStatus.mode === 'off') return;
    if (window.location.hash === '#live') {
      const el = document.getElementById('live');
      el?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [liveStatus.mode]);

  const handleSaveSettings = async (newSettings: ChurchSettings) => {
    const fb = await loadFirebase();
    try {
      await fb.saveChurchSettingsToFirebase(newSettings);
      setSettings(newSettings);
      try {
        localStorage.setItem('witima_church_settings', JSON.stringify(newSettings));
      } catch (e) {
        console.error('Could not save church settings to localStorage', e);
      }
      showToast('All changes saved and synced to the church website.');
    } catch (error) {
      console.error('Firebase persistence failed:', error);
      if (fb.isPermissionDeniedError(error)) {
        showToast('Permission denied. Please sign in with the church admin Google account.');
      } else {
        showToast('Could not save changes. Please check your connection and try again.');
      }
      throw error;
    }
  };

  const handleResetSettings = async () => {
    const fb = await loadFirebase();
    try {
      await fb.saveChurchSettingsToFirebase(initialChurchSettings);
      setSettings(initialChurchSettings);
      try {
        localStorage.removeItem('witima_church_settings');
      } catch (e) {
        console.error('Could not reset church settings', e);
      }
      showToast('Parish content reset to defaults.');
    } catch (error) {
      console.error('Firebase reset persistence failed:', error);
      if (fb.isPermissionDeniedError(error)) {
        showToast('Permission denied. Please sign in with the church admin Google account.');
      }
      throw error;
    }
  };

  const openPrayer = () => setPrayerModalOpen(true);
  const isLiveNow = Boolean(liveStatus.isLive && liveStatus.mode !== 'off');
  return (
    <div className="min-h-screen">
      {toastMessage && (
        <div role="status" className="fixed bottom-5 inset-x-5 sm:left-auto sm:right-6 z-50 px-4 py-3 rounded-xl bg-pine text-white text-sm shadow-xl">{toastMessage}</div>
      )}
      <Header settings={settings} onPrayer={openPrayer} isLive={isLiveNow} />
      <LiveBanner
        live={liveStatus}
        dismissed={liveBannerDismissed}
        onDismiss={() => setLiveBannerDismissed(true)}
      />
      <main>
        <Hero settings={settings} onPrayer={openPrayer} />
        <LiveSection live={liveStatus} churchName={settings.churchName} social={settings.social} />
        <Welcome settings={settings} />
        <Times settings={settings} />
        <Sermons settings={settings} />
        <Music />
        <Events settings={settings} />
        <Give settings={settings} />
        <Visit settings={settings} />
      </main>
      <Footer settings={settings} onPrayer={openPrayer} onAdmin={() => setAdminModalOpen(true)} />

      <Suspense fallback={null}>
        {prayerModalOpen && (
          <PrayerRequestModal isOpen={prayerModalOpen} onClose={() => setPrayerModalOpen(false)} settings={settings} />
        )}
        {adminModalOpen && (
          <AdminPanel
            isOpen={adminModalOpen}
            onClose={() => setAdminModalOpen(false)}
            settings={settings}
            onSaveSettings={handleSaveSettings}
            onResetSettings={handleResetSettings}
          />
        )}
      </Suspense>
    </div>
  );
}
