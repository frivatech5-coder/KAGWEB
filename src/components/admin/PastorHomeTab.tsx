import React, { useEffect, useRef, useState } from 'react';
import { Check, ImagePlus, Link2, RotateCcw, AlertCircle } from 'lucide-react';
import { uploadSiteImage } from '../../lib/firebase';
import type { ChurchSettings } from '../../types/church';
import {
  Field,
  SaveBar,
  formatAdminError,
  inputCls,
  textareaCls,
  type SaveStatus,
} from './AdminShared';

interface PastorHomeTabProps {
  settings: ChurchSettings;
  onSaveSettings: (next: ChurchSettings) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}

const DEFAULT_HERO_IMAGE = '/assets/aistudio/image_e19d4965.png';
const DEFAULT_PASTOR_IMAGE = '/images/pastor_sarah_waweru.webp';

const ImageUploadControl: React.FC<{
  id: string;
  label: string;
  buttonLabel: string;
  helper: string;
  previewSrc: string;
  portrait?: boolean;
  currentUrl: string;
  onUploaded: (url: string) => Promise<void> | void;
  onUrlChange: (url: string) => void;
  onResetDefault?: () => Promise<void> | void;
}> = ({
  id,
  label,
  buttonLabel,
  helper,
  previewSrc,
  portrait = false,
  currentUrl,
  onUploaded,
  onUrlChange,
  onResetDefault,
}) => {
  const [pct, setPct] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [justSaved, setJustSaved] = useState(false);
  const [showUrlInput, setShowUrlInput] = useState(false);
  const cancelRef = useRef<(() => void) | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePick = async (file: File | null) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErr('Please choose a photo (JPG, PNG, or WebP).');
      return;
    }
    setErr(null);
    setJustSaved(false);
    setPct(0);
    try {
      const url = await uploadSiteImage(file, setPct, (cancel) => {
        cancelRef.current = cancel;
      });
      await onUploaded(url);
      setJustSaved(true);
    } catch (error) {
      const code = (error as { code?: string })?.code ?? '';
      if (code === 'storage/canceled') {
        setErr('Upload cancelled.');
      } else {
        setErr(formatAdminError(error));
      }
    } finally {
      cancelRef.current = null;
      setPct(null);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper/60 p-4 space-y-3">
      <div className="flex flex-col sm:flex-row gap-4 sm:items-center">
        <img
          src={previewSrc}
          alt={label}
          className={`w-full sm:w-32 ${
            portrait ? 'h-40 sm:h-40 object-cover object-top' : 'h-28 object-cover'
          } rounded-xl border border-ink/10 bg-pine/10 shrink-0`}
        />
        <div className="space-y-2 flex-1">
          <p className="text-sm font-bold text-pine">{label}</p>
          <p className="text-xs text-ink/65">{helper}</p>
          <div className="flex flex-wrap items-center gap-2">
            <input
              ref={inputRef}
              id={id}
              type="file"
              accept="image/*"
              onChange={(e) => handlePick(e.target.files?.[0] ?? null)}
              className="sr-only"
            />
            <label
              htmlFor={id}
              className="min-h-11 px-4 rounded-full bg-pine text-white text-sm font-bold inline-flex items-center gap-2 cursor-pointer hover:bg-clay transition"
            >
              <ImagePlus size={16} />
              <span>{pct !== null ? `Uploading ${pct}%...` : buttonLabel}</span>
            </label>
            <button
              type="button"
              onClick={() => setShowUrlInput((v) => !v)}
              className="min-h-11 px-3 rounded-full border border-ink/20 bg-white text-xs font-semibold text-ink/80 hover:text-pine inline-flex items-center gap-1.5"
            >
              <Link2 size={14} />
              <span>{showUrlInput ? 'Hide link' : 'Paste photo link'}</span>
            </button>
            {pct !== null && (
              <button
                type="button"
                onClick={() => cancelRef.current?.()}
                className="min-h-11 px-3 rounded-full border border-ink/20 bg-white text-xs font-bold text-ink"
              >
                Cancel
              </button>
            )}
            {onResetDefault && (
              <button
                type="button"
                onClick={async () => {
                  setErr(null);
                  setJustSaved(false);
                  await onResetDefault();
                  setJustSaved(true);
                }}
                className="min-h-11 px-3 rounded-full border border-ink/20 bg-white text-xs font-semibold text-ink/75 hover:text-ink inline-flex items-center gap-1.5"
              >
                <RotateCcw size={14} />
                <span>Use default</span>
              </button>
            )}
          </div>

          {showUrlInput && (
            <div className="pt-1">
              <input
                type="url"
                value={currentUrl.startsWith('data:') ? '' : currentUrl}
                onChange={(e) => {
                  setJustSaved(false);
                  onUrlChange(e.target.value);
                }}
                placeholder="https://example.com/pastor-photo.jpg"
                className={inputCls}
                aria-label={`${label} link`}
              />
              <p className="text-[11px] text-ink/60 mt-1">
                Paste an image link above, then tap Save changes at the bottom.
              </p>
            </div>
          )}

          {pct !== null && (
            <div className="h-2 rounded-full bg-white overflow-hidden">
              <div className="h-full bg-clay transition-all" style={{ width: `${pct}%` }} />
            </div>
          )}

          {justSaved && (
            <p role="status" className="text-xs font-bold text-pine flex items-center gap-1.5">
              <Check size={14} />
              <span>Photo updated on the website.</span>
            </p>
          )}

          {err && (
            <p role="alert" className="text-xs font-semibold text-red-700 flex items-center gap-1">
              <AlertCircle size={14} />
              <span>{err}</span>
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export const PastorHomeTab: React.FC<PastorHomeTabProps> = ({
  settings,
  onSaveSettings,
  onDirtyChange,
}) => {
  const [churchName, setChurchName] = useState(settings.churchName);
  const [annualTheme, setAnnualTheme] = useState(settings.annualTheme);
  const [heroImageSrc, setHeroImageSrc] = useState(settings.hero.imageSrc);
  const [pastorName, setPastorName] = useState(settings.pastor.name);
  const [pastorImageSrc, setPastorImageSrc] = useState(settings.pastor.imageSrc);
  const [welcomeHeading, setWelcomeHeading] = useState(settings.pastor.welcomeHeading);
  const [p1, setP1] = useState(settings.pastor.p1);
  const [p3, setP3] = useState(settings.pastor.p3);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SaveStatus>('clean');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'clean' || status === 'saved') {
      setChurchName(settings.churchName);
      setAnnualTheme(settings.annualTheme);
      setHeroImageSrc(settings.hero.imageSrc);
      setPastorName(settings.pastor.name);
      setPastorImageSrc(settings.pastor.imageSrc);
      setWelcomeHeading(settings.pastor.welcomeHeading);
      setP1(settings.pastor.p1);
      setP3(settings.pastor.p3);
    }
  }, [settings]);

  useEffect(() => {
    onDirtyChange(status === 'dirty');
    return () => onDirtyChange(false);
  }, [status, onDirtyChange]);

  const markDirty = () => {
    setStatus('dirty');
    setSaveError(null);
  };

  const heroPreview =
    !heroImageSrc?.trim() || heroImageSrc === '/images/hero_worship_witima.webp'
      ? DEFAULT_HERO_IMAGE
      : heroImageSrc.trim();

  const pastorPreview = pastorImageSrc?.trim() || DEFAULT_PASTOR_IMAGE;

  const buildUpdatedSettings = (overrides?: { heroSrc?: string; pastorSrc?: string }): ChurchSettings => ({
    ...settings,
    churchName: churchName.trim() || settings.churchName,
    annualTheme: annualTheme.trim(),
    pastorName: pastorName.trim() || settings.pastorName,
    hero: {
      ...settings.hero,
      imageSrc: (overrides?.heroSrc ?? heroImageSrc).trim() || DEFAULT_HERO_IMAGE,
    },
    pastor: {
      ...settings.pastor,
      name: pastorName.trim() || settings.pastor.name,
      imageSrc: (overrides?.pastorSrc ?? pastorImageSrc).trim() || DEFAULT_PASTOR_IMAGE,
      welcomeHeading: welcomeHeading.trim() || settings.pastor.welcomeHeading,
      p1: p1.trim() || settings.pastor.p1,
      p3: p3.trim(),
    },
  });

  const handleImmediatePhotoSave = async (overrides: { heroSrc?: string; pastorSrc?: string }) => {
    if (overrides.heroSrc !== undefined) setHeroImageSrc(overrides.heroSrc);
    if (overrides.pastorSrc !== undefined) setPastorImageSrc(overrides.pastorSrc);

    setStatus('saving');
    setSaveError(null);
    try {
      await onSaveSettings(buildUpdatedSettings(overrides));
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setSaveError(formatAdminError(err));
      throw err;
    }
  };

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!churchName.trim()) errs.churchName = 'Please enter the church name.';
    if (!pastorName.trim()) errs.pastorName = 'Please enter the pastor name.';
    if (!welcomeHeading.trim()) errs.welcomeHeading = 'Please enter a welcome heading.';
    if (!p1.trim()) errs.p1 = 'Please enter the first welcome paragraph.';
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      setStatus('error');
      setSaveError('Please fix the highlighted fields above.');
      return;
    }

    setErrors({});
    setStatus('saving');
    setSaveError(null);
    try {
      await onSaveSettings(buildUpdatedSettings());
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setSaveError(formatAdminError(err));
    }
  };

  const handleDiscard = () => {
    setChurchName(settings.churchName);
    setAnnualTheme(settings.annualTheme);
    setHeroImageSrc(settings.hero.imageSrc);
    setPastorName(settings.pastor.name);
    setPastorImageSrc(settings.pastor.imageSrc);
    setWelcomeHeading(settings.pastor.welcomeHeading);
    setP1(settings.pastor.p1);
    setP3(settings.pastor.p3);
    setErrors({});
    setStatus('clean');
    setSaveError(null);
  };

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-pine">Pastor & Homepage</h2>
        <p className="text-sm text-ink/70 mt-1">
          Change the pastor's portrait photo, homepage banner, church name, and welcome letter. Photos resize automatically so they load quickly on phones.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-ink/10 p-4 sm:p-6 space-y-4 shadow-sm">
        <h3 className="font-display text-lg font-bold text-pine">Pastor's portrait & welcome</h3>

        <ImageUploadControl
          id="pastor-photo-upload"
          label="Pastor's portrait photo"
          buttonLabel="Change pastor's photo"
          helper="Choose a photo from your phone or computer — it updates the website immediately."
          previewSrc={pastorPreview}
          portrait
          currentUrl={pastorImageSrc}
          onUploaded={(url) => handleImmediatePhotoSave({ pastorSrc: url })}
          onUrlChange={(url) => {
            setPastorImageSrc(url);
            markDirty();
          }}
          onResetDefault={() => handleImmediatePhotoSave({ pastorSrc: DEFAULT_PASTOR_IMAGE })}
        />

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="pastor-name" label="Pastor's name" error={errors.pastorName} required>
            <input
              id="pastor-name"
              type="text"
              value={pastorName}
              onChange={(e) => {
                setPastorName(e.target.value);
                markDirty();
              }}
              className={inputCls}
            />
          </Field>

          <Field id="pastor-heading" label="Welcome heading" error={errors.welcomeHeading} required>
            <input
              id="pastor-heading"
              type="text"
              value={welcomeHeading}
              onChange={(e) => {
                setWelcomeHeading(e.target.value);
                markDirty();
              }}
              className={inputCls}
            />
          </Field>
        </div>

        <Field id="pastor-p1" label="First paragraph" error={errors.p1} required>
          <textarea
            id="pastor-p1"
            rows={3}
            value={p1}
            onChange={(e) => {
              setP1(e.target.value);
              markDirty();
            }}
            className={textareaCls}
          />
        </Field>

        <Field id="pastor-p3" label="Second paragraph" helper="Shown right below the first paragraph">
          <textarea
            id="pastor-p3"
            rows={3}
            value={p3}
            onChange={(e) => {
              setP3(e.target.value);
              markDirty();
            }}
            className={textareaCls}
          />
        </Field>
      </div>

      <div className="bg-white rounded-2xl border border-ink/10 p-4 sm:p-6 space-y-4 shadow-sm">
        <h3 className="font-display text-lg font-bold text-pine">Homepage banner & theme</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="home-church-name" label="Church name" error={errors.churchName} required>
            <input
              id="home-church-name"
              type="text"
              value={churchName}
              onChange={(e) => {
                setChurchName(e.target.value);
                markDirty();
              }}
              className={inputCls}
            />
          </Field>

          <Field id="home-theme" label="Year theme" helper="Shown at the bottom of the website">
            <input
              id="home-theme"
              type="text"
              value={annualTheme}
              onChange={(e) => {
                setAnnualTheme(e.target.value);
                markDirty();
              }}
              className={inputCls}
            />
          </Field>
        </div>

        <ImageUploadControl
          id="hero-photo-upload"
          label="Homepage banner photo"
          buttonLabel="Change banner photo"
          helper="Best as a wide landscape photo. Updates immediately after upload."
          previewSrc={heroPreview}
          currentUrl={heroImageSrc}
          onUploaded={(url) => handleImmediatePhotoSave({ heroSrc: url })}
          onUrlChange={(url) => {
            setHeroImageSrc(url);
            markDirty();
          }}
          onResetDefault={() => handleImmediatePhotoSave({ heroSrc: DEFAULT_HERO_IMAGE })}
        />
      </div>

      <SaveBar status={status} errorMessage={saveError} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
};

export default PastorHomeTab;
