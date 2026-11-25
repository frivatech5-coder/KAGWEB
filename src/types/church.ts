export interface ChurchScheduleItem {
  id: string;
  day: string;
  title: string;
  time: string;
  description: string;
  location: string;
  category: 'worship' | 'prayer' | 'fellowship' | 'youth';
}

export interface GalleryImageItem {
  id: string;
  title: string;
  caption: string;
  figure: string;
  src: string;
  category: string;
}

export interface Sermon {
  id: string;
  title: string;
  series: string;
  speaker: string;
  date: string;
  scripture: string;
  duration: string;
  youtubeId: string;
  summary: string;
  keyTakeaway: string;
}

export interface Ministry {
  id: string;
  name: string;
  lead: string;
  kicker: string;
  description: string;
  meetingTime: string;
  scripture: string;
}

export interface ChurchEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  venue: string;
  description: string;
  tag: string;
}

export interface MpesaDetails {
  type: 'paybill' | 'till';
  number: string;
  accountName: string;
  businessName: string;
  pastorContactPhone: string;
  whatsappNumber: string;
  email: string;
  physicalLocation: string;
}

export interface HeroContent {
  label: string;
  headlinePart1: string;
  headlinePart2: string;
  quote: string;
  description: string;
  ctaPrimary: string;
  ctaSecondary: string;
  imageSrc: string;
}

export interface ScriptureContent {
  label: string;
  quote: string;
  citation: string;
  pillar1Title: string;
  pillar1Desc: string;
  pillar2Title: string;
  pillar2Desc: string;
}

export interface StoryContent {
  chapter: string;
  title: string;
  subtitle: string;
  essayParagraph1: string;
  essayParagraph2: string;
  pullQuote: string;
  pullQuoteAuthor: string;
  essayParagraph3: string;
  landscapeImageSrc: string;
  pillar1Title: string;
  pillar1Desc: string;
  pillar2Title: string;
  pillar2Desc: string;
  pillar3Title: string;
  pillar3Desc: string;
  pillar4Title: string;
  pillar4Desc: string;
}

export interface PastorContent {
  chapter: string;
  title: string;
  name: string;
  subtitle: string;
  imageSrc: string;
  welcomeHeading: string;
  welcomeQuote: string;
  p1: string;
  p2: string;
  p3: string;
  officeHours: string;
}

export interface GivingContent {
  chapter: string;
  title: string;
  subtitle: string;
  quote: string;
  quoteCitation: string;
}

export interface DirectionsContent {
  chapter: string;
  title: string;
  subtitle: string;
  addressTitle: string;
  addressDetails: string;
  drivingDirections: string;
  matatuDirections: string;
  arrivalAdvice: string;
  mapsQuery: string;
}

export interface FooterContent {
  summary: string;
  motto: string;
  grandHeadline: string;
}

export interface SocialLinksData {
  youtube: string;
  facebook: string;
  x: string;
  tiktok: string;
}

export interface ChurchSettings {
  churchName: string;
  pastorName: string;
  locationString: string;
  annualTheme: string;
  themeScripture: string;
  mpesa: MpesaDetails;
  social: SocialLinksData;
  hero: HeroContent;
  scripture: ScriptureContent;
  story: StoryContent;
  pastor: PastorContent;
  schedules: ChurchScheduleItem[];
  sermons: Sermon[];
  ministries: Ministry[];
  events: ChurchEvent[];
  gallery: GalleryImageItem[];
  giving: GivingContent;
  directions: DirectionsContent;
  footer: FooterContent;
  updatedAt?: string;
}

export type LiveMode = 'off' | 'youtube' | 'youtube_channel' | 'meet';

export interface LiveStatus {
  mode: LiveMode;
  title: string;
  message: string;
  youtubeVideoId: string;
  youtubeChannelId: string;
  meetUrl: string;
  showMeetButton: boolean;
  isLive: boolean;
  nextStartsAt: string;
  updatedAt: string;
}
