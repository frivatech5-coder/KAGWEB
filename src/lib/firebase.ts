import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  onSnapshot,
  collection,
  addDoc,
  deleteDoc,
  query,
  orderBy,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { ChurchSettings, LiveStatus } from '../types/church';
import { initialLiveStatus } from '../data/defaultChurchData';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);

// Primary church admin emails (lowercase) — also update firestore.rules and storage.rules
export const ADMIN_EMAILS = ['frivatech5@gmail.com'];

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export function isPermissionDeniedError(error: unknown): boolean {
  if (!error) return false;
  const msg = error instanceof Error ? error.message : String(error);
  const code = (error as { code?: string })?.code ?? '';
  return (
    code === 'permission-denied' ||
    code === 'storage/unauthorized' ||
    msg.includes('permission-denied') ||
    msg.includes('Missing or insufficient permissions') ||
    msg.includes('storage/unauthorized')
  );
}

// Validate connection
export async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

// Check if signed-in Firebase user is authorized as a church admin
export async function isAdminUser(user: User | null): Promise<boolean> {
  if (!user || !user.email || user.emailVerified !== true) return false;
  const email = user.email.trim().toLowerCase();
  if (ADMIN_EMAILS.includes(email)) return true;

  try {
    const emailDoc = await getDoc(doc(db, 'admin_emails', email));
    if (emailDoc.exists()) return true;
  } catch {
    // Ignore read error and check legacy admins collection
  }

  try {
    const uidDoc = await getDoc(doc(db, 'admins', user.uid));
    if (uidDoc.exists()) return true;
  } catch {
    return false;
  }

  return false;
}

export const watchAuth = (cb: (u: User | null) => void) => onAuthStateChanged(auth, cb);

export async function adminSignIn() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    return await signInWithPopup(auth, provider);
  } catch (error: unknown) {
    const code = (error as { code?: string })?.code ?? '';
    if (code === 'auth/popup-blocked') {
      await signInWithRedirect(auth, provider);
      return null;
    }
    throw error;
  }
}

export async function checkRedirectSignIn() {
  try {
    return await getRedirectResult(auth);
  } catch (error) {
    console.warn('Redirect sign-in check:', error);
    throw error;
  }
}

export const adminSignOut = () => signOut(auth);

// Real-time synchronization for Church Settings
const SETTINGS_DOC_PATH = 'settings';
const SETTINGS_DOC_ID = 'witima_config';

export function subscribeToChurchSettings(
  onUpdate: (settings: ChurchSettings) => void,
  onError?: (error: Error) => void
) {
  const settingsDocRef = doc(db, SETTINGS_DOC_PATH, SETTINGS_DOC_ID);

  return onSnapshot(
    settingsDocRef,
    (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data() as ChurchSettings;
        onUpdate(data);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, `${SETTINGS_DOC_PATH}/${SETTINGS_DOC_ID}`);
      } catch (wrapped) {
        if (onError) onError(wrapped instanceof Error ? wrapped : new Error(String(wrapped)));
      }
    }
  );
}

// Save Church Settings to Firebase
export async function saveChurchSettingsToFirebase(settings: ChurchSettings): Promise<void> {
  const path = `${SETTINGS_DOC_PATH}/${SETTINGS_DOC_ID}`;
  try {
    const settingsDocRef = doc(db, SETTINGS_DOC_PATH, SETTINGS_DOC_ID);
    await setDoc(
      settingsDocRef,
      {
        ...settings,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

// ---------- Prayer petitions ----------
export interface PrayerPetition {
  id: string;
  name: string;
  contact: string;
  category: string;
  requestText: string;
  isConfidential: boolean;
  prayedFor?: boolean;
  createdAt: string;
}

export async function submitPrayerPetitionToFirebase(petition: {
  name: string;
  contact: string;
  category: string;
  requestText: string;
  isConfidential: boolean;
  prayedFor?: boolean;
}): Promise<void> {
  const path = 'prayer_petitions';
  try {
    const colRef = collection(db, path);
    await addDoc(colRef, {
      ...petition,
      prayedFor: Boolean(petition.prayedFor),
      createdAt: new Date().toISOString(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToPrayerPetitions(
  onUpdate: (petitions: PrayerPetition[]) => void,
  onError?: (error: Error) => void
) {
  const q = query(collection(db, 'prayer_petitions'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => {
      onUpdate(
        snap.docs.map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PrayerPetition, 'id'>),
        }))
      );
    },
    (e) => onError?.(e)
  );
}

export async function updatePrayerPetitionPrayedFor(id: string, prayedFor: boolean): Promise<void> {
  await updateDoc(doc(db, 'prayer_petitions', id), { prayedFor });
}

export async function deletePrayerPetition(id: string): Promise<void> {
  await deleteDoc(doc(db, 'prayer_petitions', id));
}

// ---------- Music library ----------
export interface MusicTrack {
  id: string;
  title: string;
  artist: string;
  url: string;
  storagePath: string;
  size: number;
  createdAt: string;
}

export function subscribeToMusic(onUpdate: (tracks: MusicTrack[]) => void, onError?: (e: Error) => void) {
  const q = query(collection(db, 'music'), orderBy('createdAt', 'desc'));
  return onSnapshot(
    q,
    (snap) => onUpdate(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<MusicTrack, 'id'>) }))),
    (e) => onError?.(e)
  );
}

const friendlyStorageError = (code: string) =>
  ({
    'storage/unauthorized': 'Permission denied. Sign in with the admin Google account and publish storage.rules.',
    'storage/unauthenticated': 'You are not signed in. Sign in with Google and try again.',
    'storage/bucket-not-found':
      'Firebase Storage is not set up for this project yet. Use "Paste a link" instead, or enable Storage in the Firebase console.',
    'storage/project-not-found':
      'Firebase Storage is not set up for this project yet. Use "Paste a link" instead, or enable Storage in the Firebase console.',
    'storage/retry-limit-exceeded':
      'Upload timed out. Storage may not be enabled (it can require the Blaze plan). Use "Paste a link" instead.',
    'storage/canceled': 'Upload stopped.',
    stalled:
      'The upload never started. Firebase Storage is probably not enabled or not allowed for this project (new projects may need the Blaze plan). Use "Paste a link" instead.',
  } as Record<string, string>)[code] || `Upload failed (${code}).`;

export async function uploadTrack(
  file: File,
  meta: { title: string; artist: string },
  onProgress: (pct: number) => void,
  onCancelReady?: (cancel: () => void) => void
): Promise<void> {
  const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
  const storage = getStorage(app);
  storage.maxUploadRetryTime = 20000;
  storage.maxOperationRetryTime = 20000;

  const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const storagePath = `music/${Date.now()}_${safe}`;
  const task = uploadBytesResumable(ref(storage, storagePath), file, {
    contentType: file.type || 'audio/mpeg',
    contentDisposition: `attachment; filename="${safe}"`,
  });

  let watchdog: ReturnType<typeof setTimeout> | undefined;
  onCancelReady?.(() => {
    if (watchdog) clearTimeout(watchdog);
    task.cancel();
  });

  await new Promise<void>((resolve, reject) => {
    let started = false;
    watchdog = setTimeout(() => {
      if (!started) {
        task.cancel();
        reject({ code: 'stalled' });
      }
    }, 15000);

    task.on(
      'state_changed',
      (s) => {
        if (s.bytesTransferred > 0) started = true;
        if (s.totalBytes > 0) {
          onProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100));
        }
      },
      (e) => {
        if (watchdog) clearTimeout(watchdog);
        reject(e);
      },
      () => {
        if (watchdog) clearTimeout(watchdog);
        resolve();
      }
    );
  }).catch((e) => {
    const code = (e as { code?: string })?.code || 'unknown';
    const err = new Error(friendlyStorageError(code)) as Error & { code?: string };
    err.code = code;
    throw err;
  });

  const url = await getDownloadURL(task.snapshot.ref);
  await addDoc(collection(db, 'music'), {
    ...meta,
    url,
    storagePath,
    size: file.size,
    createdAt: new Date().toISOString(),
  });
}

/** Works without Firebase Storage: paste a direct audio link or a Google Drive share link. */
export function normaliseAudioLink(raw: string): string | null {
  const u = raw.trim();
  if (!/^https:\/\//i.test(u)) return null;
  const drive = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]{20,})/);
  return drive ? `https://drive.google.com/uc?export=download&id=${drive[1]}` : u;
}

export async function addTrackByLink(meta: { title: string; artist: string }, link: string): Promise<void> {
  const url = normaliseAudioLink(link);
  if (!url) throw new Error('Please paste a full link starting with https://');
  await addDoc(collection(db, 'music'), {
    ...meta,
    url,
    storagePath: '',
    size: 0,
    createdAt: new Date().toISOString(),
  });
}

export async function updateTrack(id: string, data: { title: string; artist: string }): Promise<void> {
  await updateDoc(doc(db, 'music', id), {
    title: data.title,
    artist: data.artist,
  });
}

export async function deleteTrack(t: MusicTrack): Promise<void> {
  if (t.storagePath) {
    const { getStorage, ref, deleteObject } = await import('firebase/storage');
    const storage = getStorage(app);
    await deleteObject(ref(storage, t.storagePath)).catch(() => {});
  }
  await deleteDoc(doc(db, 'music', t.id));
}

// ---------- Site image optimization & upload ----------
async function resizeImageToWebP(
  file: File,
  maxWidth = 1600,
  maxBytes = 3 * 1024 * 1024
): Promise<Blob> {
  const bitmapUrl = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not read the selected image.'));
      el.src = bitmapUrl;
    });

    const scale = img.width > maxWidth ? maxWidth / img.width : 1;
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Browser canvas is not available.');
    ctx.drawImage(img, 0, 0, width, height);

    const qualities = [0.85, 0.72, 0.58, 0.45];
    for (const q of qualities) {
      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', q));
      if (blob && blob.size <= maxBytes) {
        return blob;
      }
    }

    const fallbackJpeg = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.6));
    if (fallbackJpeg && fallbackJpeg.size <= maxBytes) {
      return fallbackJpeg;
    }

    throw new Error('Photo is still too large after compression. Please pick a smaller image.');
  } finally {
    URL.revokeObjectURL(bitmapUrl);
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') resolve(reader.result);
      else reject(new Error('Could not process image data.'));
    };
    reader.onerror = () => reject(new Error('Could not read image data.'));
    reader.readAsDataURL(blob);
  });
}

export async function uploadSiteImage(
  file: File,
  onProgress: (pct: number) => void,
  onCancelReady?: (cancel: () => void) => void
): Promise<string> {
  const optimizedBlob = await resizeImageToWebP(file, 1600, 3 * 1024 * 1024);

  try {
    const { getStorage, ref, uploadBytesResumable, getDownloadURL } = await import('firebase/storage');
    const storage = getStorage(app);
    storage.maxUploadRetryTime = 12000;
    storage.maxOperationRetryTime = 12000;

    const baseName = file.name.replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9._-]/g, '_') || 'photo';
    const ext = optimizedBlob.type === 'image/jpeg' ? 'jpg' : 'webp';
    const storagePath = `site/${Date.now()}_${baseName}.${ext}`;

    const task = uploadBytesResumable(ref(storage, storagePath), optimizedBlob, {
      contentType: optimizedBlob.type || 'image/webp',
    });
    let watchdog: ReturnType<typeof setTimeout> | undefined;
    onCancelReady?.(() => {
      if (watchdog) clearTimeout(watchdog);
      task.cancel();
    });

    await new Promise<void>((resolve, reject) => {
      let started = false;
      watchdog = setTimeout(() => {
        if (!started) {
          task.cancel();
          reject({ code: 'stalled' });
        }
      }, 10000);

      task.on(
        'state_changed',
        (s) => {
          if (s.bytesTransferred > 0) started = true;
          if (s.totalBytes > 0) {
            onProgress(Math.round((s.bytesTransferred / s.totalBytes) * 100));
          }
        },
        (e) => {
          if (watchdog) clearTimeout(watchdog);
          reject(e);
        },
        () => {
          if (watchdog) clearTimeout(watchdog);
          resolve();
        }
      );
    });

    return await getDownloadURL(task.snapshot.ref);
  } catch (err) {
    const code = (err as { code?: string })?.code ?? '';
    if (code === 'storage/canceled') {
      throw err;
    }
    // Fallback when Storage rules are not yet published or Storage is disabled: embed a compact WebP photo (<= 160 KB) in Firestore settings
    onProgress(85);
    const compactBlob = await resizeImageToWebP(file, 720, 160 * 1024);
    const dataUrl = await blobToDataUrl(compactBlob);
    onProgress(100);
    return dataUrl;
  }
}

// ---------- Additional Admin Emails ----------
export interface AdminEmailEntry {
  email: string;
  addedBy?: string;
  createdAt?: string;
}

export function subscribeToAdminEmails(
  onUpdate: (entries: AdminEmailEntry[]) => void,
  onError?: (e: Error) => void
) {
  return onSnapshot(
    collection(db, 'admin_emails'),
    (snap) => {
      onUpdate(
        snap.docs.map((d) => ({
          email: d.id,
          ...(d.data() as Omit<AdminEmailEntry, 'email'>),
        }))
      );
    },
    (e) => onError?.(e)
  );
}

export async function addAdminEmail(email: string, addedBy: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  if (!clean || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean)) {
    throw new Error('Please enter a valid Google email address.');
  }
  await setDoc(doc(db, 'admin_emails', clean), {
    email: clean,
    addedBy,
    createdAt: new Date().toISOString(),
  });
}

export async function removeAdminEmail(email: string): Promise<void> {
  const clean = email.trim().toLowerCase();
  await deleteDoc(doc(db, 'admin_emails', clean));
}

// ---------- Watch Live (YouTube Live + Google Meet) ----------
const LIVE_DOC_PATH = 'live';
const LIVE_DOC_ID = 'current';

export function subscribeToLive(
  onUpdate: (status: LiveStatus) => void,
  onError?: (error: Error) => void
) {
  const liveRef = doc(db, LIVE_DOC_PATH, LIVE_DOC_ID);
  return onSnapshot(
    liveRef,
    (snapshot) => {
      if (snapshot.exists()) {
        onUpdate({
          ...initialLiveStatus,
          ...(snapshot.data() as Partial<LiveStatus>),
        });
      } else {
        onUpdate(initialLiveStatus);
      }
    },
    (error) => {
      onError?.(error);
    }
  );
}

export async function saveLive(status: LiveStatus): Promise<void> {
  const path = `${LIVE_DOC_PATH}/${LIVE_DOC_ID}`;
  try {
    await setDoc(
      doc(db, LIVE_DOC_PATH, LIVE_DOC_ID),
      {
        ...status,
        updatedAt: new Date().toISOString(),
      },
      { merge: true }
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}
