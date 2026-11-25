import React, { useEffect, useState } from 'react';
import { FaFacebook, FaTiktok, FaXTwitter, FaYoutube } from 'react-icons/fa6';
import type { ChurchSettings, SocialLinksData } from '../../types/church';
import { initialChurchSettings } from '../../data/defaultChurchData';
import { cleanSocialUrl, type SocialPlatform } from '../../lib/social';
import {
  Field,
  SaveBar,
  formatAdminError,
  inputCls,
  textareaCls,
  type SaveStatus,
} from './AdminShared';

const SOCIAL_FIELDS: {
  key: SocialPlatform;
  label: string;
  placeholder: string;
  domainHint: string;
  brandColorClass: string;
  Icon: React.ComponentType<{ size?: number; className?: string; 'aria-hidden'?: boolean }>;
}[] = [
  {
    key: 'youtube',
    label: 'YouTube',
    placeholder: 'https://www.youtube.com/@yourchannel',
    domainHint: 'youtube.com / youtu.be',
    brandColorClass: 'text-[#FF0000]',
    Icon: FaYoutube,
  },
  {
    key: 'facebook',
    label: 'Facebook',
    placeholder: 'https://www.facebook.com/yourpage',
    domainHint: 'facebook.com / fb.com',
    brandColorClass: 'text-[#1877F2]',
    Icon: FaFacebook,
  },
  {
    key: 'x',
    label: 'X (Twitter)',
    placeholder: 'https://x.com/yourhandle',
    domainHint: 'x.com / twitter.com',
    brandColorClass: 'text-[#000000]',
    Icon: FaXTwitter,
  },
  {
    key: 'tiktok',
    label: 'TikTok',
    placeholder: 'https://www.tiktok.com/@yourhandle',
    domainHint: 'tiktok.com',
    brandColorClass: 'text-[#000000]',
    Icon: FaTiktok,
  },
];

interface ContactGivingTabProps {
  settings: ChurchSettings;
  onSaveSettings: (next: ChurchSettings) => Promise<void>;
  onDirtyChange: (dirty: boolean) => void;
}

export const ContactGivingTab: React.FC<ContactGivingTabProps> = ({
  settings,
  onSaveSettings,
  onDirtyChange,
}) => {
  const [mpesa, setMpesa] = useState(settings.mpesa);
  const [social, setSocial] = useState<SocialLinksData>(settings.social ?? initialChurchSettings.social);
  const [givingQuote, setGivingQuote] = useState(settings.giving.quote);
  const [givingCitation, setGivingCitation] = useState(settings.giving.quoteCitation);
  const [directions, setDirections] = useState(settings.directions);

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<SaveStatus>('clean');
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (status === 'clean' || status === 'saved') {
      setMpesa(settings.mpesa);
      setSocial(settings.social ?? initialChurchSettings.social);
      setGivingQuote(settings.giving.quote);
      setGivingCitation(settings.giving.quoteCitation);
      setDirections(settings.directions);
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

  const handleSave = async () => {
    const errs: Record<string, string> = {};
    if (!mpesa.number.trim()) errs.number = 'Please enter the Paybill or Till number.';
    if (mpesa.type === 'paybill' && !mpesa.accountName.trim()) {
      errs.accountName = 'Please enter the M-Pesa account name or number.';
    }
    if (!mpesa.businessName.trim()) errs.businessName = 'Please enter the M-Pesa confirmation name.';
    if (!mpesa.pastorContactPhone.trim()) errs.phone = 'Please enter a church phone number.';
    if (!mpesa.whatsappNumber.trim()) errs.whatsapp = 'Please enter a WhatsApp number.';
    if (!directions.addressTitle.trim()) errs.addressTitle = 'Please enter the church address heading.';

    const cleanedSocial: SocialLinksData = {
      youtube: cleanSocialUrl('youtube', social.youtube),
      facebook: cleanSocialUrl('facebook', social.facebook),
      x: cleanSocialUrl('x', social.x),
      tiktok: cleanSocialUrl('tiktok', social.tiktok),
    };
    for (const f of SOCIAL_FIELDS) {
      if (social[f.key].trim() && !cleanedSocial[f.key]) {
        errs[`social_${f.key}`] = `Enter an https:// ${f.domainHint} link or @handle, or leave empty.`;
      }
    }

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
      await onSaveSettings({
        ...settings,
        mpesa: {
          ...mpesa,
          number: mpesa.number.trim(),
          accountName: mpesa.accountName.trim(),
          businessName: mpesa.businessName.trim(),
          pastorContactPhone: mpesa.pastorContactPhone.trim(),
          whatsappNumber: mpesa.whatsappNumber.replace(/[^\d]/g, ''),
          email: mpesa.email.trim(),
        },
        social: cleanedSocial,
        giving: {
          ...settings.giving,
          quote: givingQuote.trim(),
          quoteCitation: givingCitation.trim(),
        },
        directions: {
          ...directions,
          addressTitle: directions.addressTitle.trim(),
          addressDetails: directions.addressDetails.trim(),
          drivingDirections: directions.drivingDirections.trim(),
          matatuDirections: directions.matatuDirections.trim(),
          arrivalAdvice: directions.arrivalAdvice.trim(),
          mapsQuery: directions.mapsQuery.trim(),
        },
      });
      setSocial(cleanedSocial);
      setStatus('saved');
    } catch (err) {
      setStatus('error');
      setSaveError(formatAdminError(err));
    }
  };

  const handleDiscard = () => {
    setMpesa(settings.mpesa);
    setSocial(settings.social ?? initialChurchSettings.social);
    setGivingQuote(settings.giving.quote);
    setGivingCitation(settings.giving.quoteCitation);
    setDirections(settings.directions);
    setErrors({});
    setStatus('clean');
    setSaveError(null);
  };

  return (
    <div className="space-y-6 pb-4">
      <div>
        <h2 className="font-display text-2xl font-bold text-pine">Contact, Directions & Giving</h2>
        <p className="text-sm text-ink/70 mt-1">
          Keep M-Pesa details, phone numbers, and travel directions accurate for visitors and members.
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-ink/10 p-4 sm:p-6 space-y-4 shadow-sm">
        <h3 className="font-display text-lg font-bold text-pine">M-Pesa Giving</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="mpesa-type" label="M-Pesa option">
            <select
              id="mpesa-type"
              value={mpesa.type}
              onChange={(e) => {
                setMpesa({ ...mpesa, type: e.target.value as 'paybill' | 'till' });
                markDirty();
              }}
              className={inputCls}
            >
              <option value="paybill">Paybill</option>
              <option value="till">Buy Goods (Till)</option>
            </select>
          </Field>

          <Field
            id="mpesa-number"
            label={mpesa.type === 'paybill' ? 'Paybill business number' : 'Till number'}
            error={errors.number}
            required
          >
            <input
              id="mpesa-number"
              type="text"
              value={mpesa.number}
              onChange={(e) => {
                setMpesa({ ...mpesa, number: e.target.value });
                markDirty();
              }}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {mpesa.type === 'paybill' && (
            <Field
              id="mpesa-account"
              label="Account number / name"
              helper="What givers enter as the Account on M-Pesa"
              error={errors.accountName}
              required
            >
              <input
                id="mpesa-account"
                type="text"
                value={mpesa.accountName}
                onChange={(e) => {
                  setMpesa({ ...mpesa, accountName: e.target.value });
                  markDirty();
                }}
                className={inputCls}
              />
            </Field>
          )}

          <Field
            id="mpesa-business-name"
            label="Name shown on M-Pesa screen"
            helper="e.g. KAG EMMANUEL CHURCH WITIMA"
            error={errors.businessName}
            required
          >
            <input
              id="mpesa-business-name"
              type="text"
              value={mpesa.businessName}
              onChange={(e) => {
                setMpesa({ ...mpesa, businessName: e.target.value });
                markDirty();
              }}
              className={inputCls}
            />
          </Field>
        </div>

        <Field id="giving-quote" label="Bible verse on giving">
          <textarea
            id="giving-quote"
            rows={2}
            value={givingQuote}
            onChange={(e) => {
              setGivingQuote(e.target.value);
              markDirty();
            }}
            className={textareaCls}
          />
        </Field>

        <Field id="giving-citation" label="Scripture reference" helper="e.g. 2 Corinthians 9:7">
          <input
            id="giving-citation"
            type="text"
            value={givingCitation}
            onChange={(e) => {
              setGivingCitation(e.target.value);
              markDirty();
            }}
            className={inputCls}
          />
        </Field>
      </div>

      <div className="bg-white rounded-2xl border border-ink/10 p-4 sm:p-6 space-y-4 shadow-sm">
        <h3 className="font-display text-lg font-bold text-pine">Phone, WhatsApp & Email</h3>

        <div className="grid sm:grid-cols-3 gap-4">
          <Field id="contact-phone" label="Phone number" helper="e.g. +254 712 345 678" error={errors.phone} required>
            <input
              id="contact-phone"
              type="tel"
              value={mpesa.pastorContactPhone}
              onChange={(e) => {
                setMpesa({ ...mpesa, pastorContactPhone: e.target.value });
                markDirty();
              }}
              className={inputCls}
            />
          </Field>

          <Field
            id="contact-whatsapp"
            label="WhatsApp number"
            helper="Country code + digits, e.g. 254712345678"
            error={errors.whatsapp}
            required
          >
            <input
              id="contact-whatsapp"
              type="text"
              value={mpesa.whatsappNumber}
              onChange={(e) => {
                setMpesa({ ...mpesa, whatsappNumber: e.target.value });
                markDirty();
              }}
              className={inputCls}
            />
          </Field>

          <Field id="contact-email" label="Church email">
            <input
              id="contact-email"
              type="email"
              value={mpesa.email}
              onChange={(e) => {
                setMpesa({ ...mpesa, email: e.target.value });
                markDirty();
              }}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-ink/10 p-4 sm:p-6 space-y-4 shadow-sm">
        <div>
          <h3 className="font-display text-lg font-bold text-pine">Social media</h3>
          <p className="text-xs text-ink/65 mt-0.5">
            Leave empty to hide. Paste an https:// profile link or type an @handle.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {SOCIAL_FIELDS.map(({ key, label, placeholder, domainHint, brandColorClass, Icon }) => {
            const raw = social[key] ?? '';
            const trimmed = raw.trim();
            const cleaned = cleanSocialUrl(key, raw);
            const liveInvalid = Boolean(trimmed && !cleaned);
            const fieldError =
              errors[`social_${key}`] ||
              (liveInvalid ? `Must be a valid https:// ${domainHint} link or @handle.` : undefined);

            return (
              <div key={key} className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor={`social-${key}`} className="inline-flex items-center gap-2 text-sm font-bold text-pine">
                    <Icon size={17} aria-hidden className={brandColorClass} />
                    <span>{label}</span>
                  </label>
                  <span
                    className={`size-9 rounded-full inline-flex items-center justify-center shrink-0 transition ${
                      cleaned
                        ? `bg-sand ${brandColorClass}`
                        : 'bg-ink/5 text-ink/25'
                    }`}
                    title={cleaned ? `Preview: ${cleaned}` : `${label} hidden`}
                    aria-hidden="true"
                  >
                    <Icon size={16} aria-hidden />
                  </span>
                </div>

                <input
                  id={`social-${key}`}
                  type="text"
                  value={raw}
                  placeholder={placeholder}
                  onChange={(e) => {
                    setSocial({ ...social, [key]: e.target.value });
                    markDirty();
                  }}
                  className={inputCls}
                />

                {fieldError ? (
                  <p className="text-xs font-semibold text-red-700">{fieldError}</p>
                ) : cleaned && trimmed.startsWith('@') ? (
                  <p className="text-xs text-pine/80 truncate">Links to: {cleaned}</p>
                ) : (
                  <p className="text-xs text-ink/60">Leave empty to hide</p>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-ink/10 p-4 sm:p-6 space-y-4 shadow-sm">
        <h3 className="font-display text-lg font-bold text-pine">Directions & Google Map</h3>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="dir-title" label="Location title" error={errors.addressTitle} required>
            <input
              id="dir-title"
              type="text"
              value={directions.addressTitle}
              onChange={(e) => {
                setDirections({ ...directions, addressTitle: e.target.value });
                markDirty();
              }}
              className={inputCls}
            />
          </Field>

          <Field id="dir-details" label="Town & county" helper="e.g. Witima, Othaya, Nyeri County">
            <input
              id="dir-details"
              type="text"
              value={directions.addressDetails}
              onChange={(e) => {
                setDirections({ ...directions, addressDetails: e.target.value });
                markDirty();
              }}
              className={inputCls}
            />
          </Field>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field id="dir-arrival" label="Best time to arrive" helper="e.g. 9:45 AM for morning tea & welcome">
            <input
              id="dir-arrival"
              type="text"
              value={directions.arrivalAdvice}
              onChange={(e) => {
                setDirections({ ...directions, arrivalAdvice: e.target.value });
                markDirty();
              }}
              className={inputCls}
            />
          </Field>

          <Field id="dir-map" label="Map search text" helper="Used by the Google Map pin on the Visit section">
            <input
              id="dir-map"
              type="text"
              value={directions.mapsQuery}
              onChange={(e) => {
                setDirections({ ...directions, mapsQuery: e.target.value });
                markDirty();
              }}
              className={inputCls}
            />
          </Field>
        </div>
      </div>

      <SaveBar status={status} errorMessage={saveError} onSave={handleSave} onDiscard={handleDiscard} />
    </div>
  );
};

export default ContactGivingTab;
