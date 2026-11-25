import React, { useEffect, useRef, useState } from 'react';
import { Menu, X, MapPin, Phone, Copy, Check, Play, Clock, HandHeart, Share2 } from 'lucide-react';
import { FaWhatsapp } from 'react-icons/fa6';
import type { ChurchSettings } from '../types/church';
import { hasAnySocialLink } from '../lib/social';
import { SocialLinks } from './Social';

type S = { settings: ChurchSettings };
const links = [['Visit', '#visit'], ['Times', '#times'], ['Sermons', '#sermons'], ['Music', '#music'], ['Events', '#events'], ['Give', '#give']];

/** Fades + slides content in as it scrolls into view (instant for reduced-motion users). */
export const Reveal: React.FC<{ children: React.ReactNode; className?: string; delay?: number }> = ({
  children,
  className = '',
  delay = 0,
}) => {
  const el = useRef<HTMLDivElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const node = el.current;
    if (
      !node ||
      typeof IntersectionObserver === 'undefined' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.05 }
    );
    io.observe(node);
    return () => io.disconnect();
  }, []);

  return (
    <div
      ref={el}
      style={{ transitionDelay: shown ? `${delay}ms` : '0ms' }}
      className={`transition-all duration-700 ease-out ${
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
      } ${className}`}
    >
      {children}
    </div>
  );
};

export const ShareSectionButton: React.FC<{
  anchor: string;
  title: string;
  text: string;
  label?: string;
}> = ({ anchor, title, text, label = 'Share' }) => {
  const [copied, setCopied] = useState(false);

  const handleShare = async () => {
    const url = `${window.location.origin}/${anchor}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, text: `${text} ${url}`, url });
        return;
      } catch (err) {
        if ((err as { name?: string })?.name === 'AbortError') return;
      }
    }
    try {
      await navigator.clipboard?.writeText(url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2400);
    } catch {
      // Ignore clipboard failure
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={handleShare}
        className="btn btn-line text-pine !min-h-11 !px-4 !py-2 text-sm shrink-0"
        aria-label={`${label} ${title}`}
      >
        {copied ? <Check size={16} /> : <Share2 size={16} />}
        <span>{copied ? 'Link copied' : label}</span>
      </button>
      {copied && (
        <div
          role="status"
          className="fixed bottom-5 inset-x-5 sm:left-auto sm:right-6 z-50 px-4 py-3 rounded-xl bg-pine text-white text-sm font-semibold shadow-xl"
        >
          Link copied
        </div>
      )}
    </>
  );
};

const Heading: React.FC<{ hand: string; title: string; light?: boolean; action?: React.ReactNode }> = ({
  hand,
  title,
  light,
  action,
}) => (
  <div className="mb-8 md:mb-12 flex flex-wrap items-end justify-between gap-4">
    <div>
      <p className={`font-hand text-2xl ${light ? 'text-gold' : 'text-clay'}`}>{hand}</p>
      <h2 className={`text-3xl md:text-5xl font-bold ${light ? 'text-white' : 'text-pine'}`}>{title}</h2>
    </div>
    {action}
  </div>
);
const Wrap: React.FC<{ id: string; className?: string; children: React.ReactNode }> = ({ id, className = '', children }) => (
  <section id={id} className={`py-12 md:py-20 ${className}`}>
    <div className="mx-auto max-w-5xl px-5">
      <Reveal>{children}</Reveal>
    </div>
  </section>
);

export const Header: React.FC<S & { onPrayer: () => void; isLive?: boolean }> = ({
  settings,
  onPrayer,
  isLive = false,
}) => {
  const [open, setOpen] = useState(false);
  return (
    <header className="sticky top-0 z-40 bg-paper/95 backdrop-blur border-b border-ink/10">
      <div className="mx-auto max-w-5xl px-5 h-16 flex items-center justify-between">
        <a href="#top" className="flex items-center gap-2.5 font-display font-bold text-pine leading-tight">
          <img
            src="/assets/aistudio/Screenshot_2026-11-06_4.43.00_PM_71c4dc47.png"
            alt="Kenya Assemblies of God logo"
            width={40}
            height={40}
            className="h-10 w-10 object-contain shrink-0 brightness-110 contrast-125 mix-blend-multiply"
          />
          <span>KAG Emmanuel <span className="block text-xs font-sans font-semibold text-ink/60 -mt-0.5">Witima · Othaya</span></span>
        </a>
        <nav className="hidden lg:flex items-center gap-6 text-sm font-semibold">
          {isLive && (
            <a href="#live" className="inline-flex items-center gap-1.5 text-red-700 font-bold hover:text-clay">
              <span className="size-2 rounded-full bg-red-600 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
              <span>Live</span>
            </a>
          )}
          {links.map(([l, h]) => <a key={h} href={h} className="hover:text-clay">{l}</a>)}
          <button onClick={onPrayer} className="btn btn-clay !min-h-10 !py-1.5 !px-4 text-sm">Prayer request</button>
        </nav>
        <button className="lg:hidden p-2 -mr-2" aria-label="Menu" aria-expanded={open} onClick={() => setOpen(!open)}>{open ? <X /> : <Menu />}</button>
      </div>
      {open && (
        <nav className="lg:hidden border-t border-ink/10 bg-paper px-5 py-3 grid gap-1">
          {isLive && (
            <a href="#live" onClick={() => setOpen(false)} className="py-3 text-lg font-display font-bold text-red-700 border-b border-ink/5 flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-red-600 animate-pulse motion-reduce:animate-none" aria-hidden="true" />
              <span>Live now</span>
            </a>
          )}
          {links.map(([l, h]) => <a key={h} href={h} onClick={() => setOpen(false)} className="py-3 text-lg font-display border-b border-ink/5">{l}</a>)}
          <button onClick={() => { setOpen(false); onPrayer(); }} className="btn btn-clay mt-3">Send a prayer request</button>
        </nav>
      )}
    </header>
  );
};

const HERO_CROSS_IMAGE = '/assets/aistudio/image_e19d4965.png';

export const Hero: React.FC<S & { onPrayer: () => void }> = ({ settings, onPrayer }) => {
  const rawHeroSrc = settings.hero?.imageSrc?.trim();
  const heroSrc = !rawHeroSrc || rawHeroSrc === '/images/hero_worship_witima.webp' ? HERO_CROSS_IMAGE : rawHeroSrc;

  return (
    <section id="top" className="relative bg-pine min-h-[calc(100svh-4rem)] flex items-end text-white overflow-hidden">
      <img
        src={heroSrc}
        alt="Cross on a hill at sunset behind KAG Emmanuel Church Witima"
        className="absolute inset-x-0 top-0 w-full h-[340px] sm:h-[380px] md:h-full object-cover object-[4%_65%] md:object-left-bottom"
        fetchPriority="high"
      />
      <div className="absolute inset-x-0 top-0 h-[340px] sm:h-[380px] md:h-full bg-gradient-to-t from-pine via-pine/25 to-black/10 md:via-pine/45 md:to-black/20" />
      <div className="relative mx-auto max-w-5xl w-full px-5 pb-12 pt-60 sm:pt-68 md:pt-32 rise">
        <p className="font-hand text-3xl text-gold">Karibu! You are welcome here.</p>
        <h1 className="text-4xl sm:text-6xl font-bold mt-2 max-w-2xl leading-[1.05]">{settings.churchName}</h1>
        <p className="mt-4 max-w-xl text-lg text-white/90">A friendly Pentecostal family in Witima, Othaya. Come as you are, and leave encouraged.</p>
        <p className="mt-5 inline-flex items-center gap-2 bg-white/15 backdrop-blur rounded-full px-4 py-2 text-sm font-semibold">
          <Clock size={16} /> Sundays · 10:00 AM – 01:00 PM
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <a href="#visit" className="btn btn-clay">Plan your visit</a>
          <button onClick={onPrayer} className="btn btn-line text-white"><HandHeart size={18} /> Ask us to pray</button>
        </div>
      </div>
    </section>
  );
};

export const Welcome: React.FC<S> = ({ settings }) => {
  const p = settings.pastor, st = settings.story;
  const pastorImg = p.imageSrc?.trim() || '/images/pastor_sarah_waweru.webp';
  const pillars = [[st.pillar1Title, st.pillar1Desc], [st.pillar2Title, st.pillar2Desc], [st.pillar3Title, st.pillar3Desc], [st.pillar4Title, st.pillar4Desc]];
  return (
    <Wrap id="welcome">
      <div className="grid md:grid-cols-5 gap-10 items-center">
        <figure className="md:col-span-2 relative mx-auto max-w-xs rotate-[-2deg]">
          <span className="absolute -top-3 left-1/2 -translate-x-1/2 w-24 h-6 bg-gold/50 rotate-2 z-10" />
          <div className="bg-white p-3 pb-10 shadow-xl">
            <img src={pastorImg} alt={p.name} loading="lazy" className="w-full aspect-[4/5] object-cover object-top" />
            <figcaption className="font-hand text-2xl text-center mt-3 text-ink/80 absolute bottom-2 inset-x-0">{p.name}</figcaption>
          </div>
        </figure>
        <div className="md:col-span-3">
          <p className="font-hand text-2xl text-clay">A word from our pastor</p>
          <h2 className="text-3xl md:text-4xl font-bold text-pine">{p.welcomeHeading}</h2>
          <p className="mt-5 text-lg leading-relaxed">{p.p1}</p>
          <p className="mt-4 leading-relaxed text-ink/80">{p.p3}</p>
          <p className="font-hand text-3xl text-pine mt-5">— {p.name}</p>
        </div>
      </div>
      <div className="mt-16 grid sm:grid-cols-2 gap-x-10 gap-y-6">
        {pillars.map(([t, d]) => (
          <div key={t} className="border-l-4 border-gold pl-4">
            <h3 className="font-bold text-lg text-pine">{t.replace(/^\d+\.\s*/, '')}</h3>
            <p className="text-ink/75">{d}</p>
          </div>
        ))}
      </div>
    </Wrap>
  );
};

export const Times: React.FC<S> = ({ settings }) => (
  <Wrap id="times" className="bg-pine text-white">
    <Heading light hand="Join us any time" title="When we meet" />
    <ul className="divide-y divide-white/15">
      {settings.schedules.map((s) => (
        <li key={s.id} className="py-5 grid sm:grid-cols-[9rem_1fr] gap-1 sm:gap-6">
          <div><p className="font-display text-xl text-gold">{s.day}</p><p className="text-sm text-white/80">{s.time}</p></div>
          <div><p className="font-bold text-lg">{s.title}</p><p className="text-white/70">{s.description} <span className="text-white/50">· {s.location}</span></p></div>
        </li>
      ))}
    </ul>
  </Wrap>
);

export const Sermons: React.FC<S> = ({ settings }) => {
  const [active, setActive] = useState<string | null>(null);
  return (
    <Wrap id="sermons">
      <Heading
        hand="Hear the Word"
        title="Recent sermons"
        action={
          <ShareSectionButton
            anchor="#sermons"
            title="Sermons · KAG Emmanuel Church Witima"
            text="Watch recent sermons from KAG Emmanuel Witima:"
          />
        }
      />
      <div className="grid sm:grid-cols-2 gap-6">
        {settings.sermons.slice(0, 4).map((s, i) => (
          <Reveal key={s.id} delay={i * 90}>
            <article className="bg-white rounded-2xl overflow-hidden shadow-sm h-full">
              <div className="relative aspect-video bg-black">
                {active === s.id && s.youtubeId?.trim() ? (
                  <iframe className="absolute inset-0 size-full" title={s.title} allowFullScreen allow="autoplay; encrypted-media"
                    src={`https://www.youtube-nocookie.com/embed/${s.youtubeId.trim()}?autoplay=1&rel=0`} />
                ) : (
                  <button onClick={() => s.youtubeId?.trim() && setActive(s.id)} aria-label={'Play ' + s.title} className="group absolute inset-0">
                    {s.youtubeId?.trim() && <img loading="lazy" alt="" src={`https://i.ytimg.com/vi/${s.youtubeId.trim()}/hqdefault.jpg`} className="size-full object-cover opacity-80" />}
                    <span className="absolute inset-0 grid place-items-center"><span className="grid place-items-center size-14 rounded-full bg-clay text-white group-hover:scale-110 transition"><Play className="ml-1" /></span></span>
                  </button>
                )}
              </div>
              <div className="p-5">
                <p className="text-xs font-bold uppercase tracking-wide text-clay">{s.series} · {s.date.replace(/^\w+,\s*/, '')}</p>
                <h3 className="font-bold text-xl text-pine mt-1">{s.title}</h3>
                <p className="text-sm text-ink/60 mt-1">{s.speaker} · {s.scripture}</p>
                <p className="mt-3 text-ink/80 italic">“{s.keyTakeaway}”</p>
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </Wrap>
  );
};

export const Events: React.FC<S> = ({ settings }) => (
  <Wrap id="events" className="bg-sand">
    <Heading hand="Save the date" title="Coming up" />
    <div className="grid md:grid-cols-3 gap-5">
      {settings.events.map((e, i) => (
        <article key={e.id} className={`bg-paper rounded-2xl p-6 shadow-sm ${i % 2 ? 'md:rotate-[.6deg]' : 'md:-rotate-[.6deg]'}`}>
          <p className="font-hand text-2xl text-clay">{e.date}</p>
          <h3 className="font-bold text-xl text-pine mt-1">{e.title}</h3>
          <p className="text-sm text-ink/60 mt-2">{e.time} · {e.venue}</p>
          <p className="mt-3 text-ink/80">{e.description}</p>
        </article>
      ))}
    </div>
    <h3 className="mt-16 mb-6 font-display text-2xl font-bold text-pine">Find your place in our family</h3>
    <div className="grid sm:grid-cols-2 gap-3">
      {settings.ministries.map((m) => (
        <div key={m.id} className="bg-paper rounded-xl p-4">
          <p className="font-bold text-pine">{m.name}</p>
          <p className="text-sm text-clay font-semibold">{m.meetingTime}</p>
          <p className="text-sm text-ink/70 mt-1">{m.kicker} · led by {m.lead}</p>
        </div>
      ))}
    </div>
  </Wrap>
);

const Copy1: React.FC<{ text: string; label: string }> = ({ text, label }) => {
  const [ok, setOk] = useState(false);
  return (
    <button onClick={() => navigator.clipboard?.writeText(text).then(() => { setOk(true); setTimeout(() => setOk(false), 2000); })}
      className="w-full flex items-center justify-between gap-3 bg-white/10 hover:bg-white/20 rounded-xl px-4 py-3 text-left transition" aria-label={`Copy ${label}`}>
      <span><span className="block text-xs uppercase tracking-wide text-white/60">{label}</span><span className="font-display text-2xl">{text}</span></span>
      {ok ? <Check className="text-gold" /> : <Copy size={18} className="text-white/60" />}
    </button>
  );
};

export const Give: React.FC<S> = ({ settings }) => {
  const m = settings.mpesa, g = settings.giving;
  return (
    <Wrap id="give" className="bg-pine text-white">
      <div className="grid md:grid-cols-2 gap-10 items-center">
        <div>
          <p className="font-hand text-2xl text-gold">Give with a glad heart</p>
          <h2 className="text-3xl md:text-5xl font-bold">Tithes & offerings</h2>
          <p className="mt-5 text-lg italic text-white/85">“{g.quote}”</p>
          <p className="text-gold mt-1">— {g.quoteCitation}</p>
        </div>
        <div className="space-y-3">
          <p className="font-semibold">M-Pesa → Lipa na M-Pesa → {m.type === 'paybill' ? 'Pay Bill' : 'Buy Goods (Till)'}</p>
          <Copy1 text={m.number} label={m.type === 'paybill' ? 'Business number' : 'Till number'} />
          {m.type === 'paybill' && <Copy1 text={m.accountName} label="Account number" />}
          <p className="text-sm text-white/60">Name that appears: {m.businessName}</p>
        </div>
      </div>
    </Wrap>
  );
};

export const Visit: React.FC<S> = ({ settings }) => {
  const d = settings.directions, m = settings.mpesa;
  const q = encodeURIComponent(d.mapsQuery);
  const waDigits = m.whatsappNumber?.replace(/[^\d]/g, '');
  return (
    <Wrap id="visit">
      <Heading hand="We'd love to see you" title="Visit us this Sunday" />
      <div className="grid md:grid-cols-2 gap-8">
        <div className="space-y-5">
          <p className="flex gap-3"><MapPin className="text-clay shrink-0 mt-1" /><span><b>{d.addressTitle}</b><br />{d.addressDetails}</span></p>
          <p className="bg-sand rounded-xl p-4"><b>Tip:</b> arrive around {d.arrivalAdvice}</p>
          <div className="flex flex-wrap gap-3 pt-2">
            <a className="btn btn-clay" target="_blank" rel="noreferrer" href={`https://www.google.com/maps/dir/?api=1&destination=${q}`}>Get directions</a>
            <a className="btn btn-line text-pine" href={`tel:${m.pastorContactPhone.replace(/\s/g, '')}`}><Phone size={18} /> Call</a>
            {waDigits && (
              <a className="btn btn-line text-pine" target="_blank" rel="noopener noreferrer" href={`https://wa.me/${waDigits}`}>
                <FaWhatsapp size={19} aria-hidden="true" /> WhatsApp
              </a>
            )}
          </div>
          <SocialLinks social={settings.social} churchName={settings.churchName} size="sm" variant="color" className="pt-1" />
        </div>
        <iframe title="Map to the church" loading="lazy" className="w-full h-72 md:h-full min-h-72 rounded-2xl border-0 shadow-md"
          src={`https://maps.google.com/maps?q=${q}&output=embed`} />
      </div>
    </Wrap>
  );
};

export const Footer: React.FC<S & { onPrayer: () => void; onAdmin: () => void }> = ({ settings, onPrayer, onAdmin }) => {
  const showSocial = hasAnySocialLink(settings.social);
  return (
    <footer className="bg-ink text-white/80 py-12">
      <div className="mx-auto max-w-5xl px-5 grid sm:grid-cols-2 gap-8">
        <div>
          <div className="flex items-center gap-3">
            <div className="bg-paper rounded-lg p-1 shrink-0">
              <img
                src="/assets/aistudio/Screenshot_2026-11-06_4.43.00_PM_71c4dc47.png"
                alt="Kenya Assemblies of God logo"
                loading="lazy"
                width={40}
                height={40}
                className="h-10 w-10 object-contain brightness-110 contrast-125 mix-blend-multiply"
              />
            </div>
            <p className="font-display text-2xl text-white">{settings.churchName}</p>
          </div>
          <p className="mt-2">{settings.footer.summary}</p>
          <p className="mt-3 font-hand text-xl text-gold">{settings.annualTheme}</p>
        </div>
        <div className="sm:text-right space-y-1">
          <p>{settings.mpesa.email}</p><p>{settings.mpesa.pastorContactPhone}</p>
          <button onClick={onPrayer} className="underline underline-offset-4 hover:text-white">Send a prayer request</button>
        </div>
      </div>

      {showSocial && (
        <div className="mx-auto max-w-5xl px-5 mt-8 pt-6 border-t border-white/10 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 text-center sm:text-left">
          <div>
            <p className="font-hand text-2xl text-gold leading-none">Stay connected</p>
            <p className="text-sm text-white/65 mt-1">Follow us</p>
          </div>
          <SocialLinks
            social={settings.social}
            churchName={settings.churchName}
            size="md"
            variant="light"
            className="justify-center sm:justify-end"
          />
        </div>
      )}

      <div className="mx-auto max-w-5xl px-5 mt-8 pt-5 border-t border-white/10 text-sm flex justify-between text-white/50">
        <span>© {new Date().getFullYear()} KAG Emmanuel Witima</span>
        <button onClick={onAdmin} className="hover:text-white">Admin</button>
      </div>
    </footer>
  );
};
