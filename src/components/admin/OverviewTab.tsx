import React from 'react';
import { Calendar, HandHeart, ImagePlus, Music2, Plus, Radio, Upload, Video } from 'lucide-react';
import type { ChurchSettings } from '../../types/church';
import type { AdminTabId } from './AdminShared';

interface OverviewTabProps {
  adminName: string;
  settings: ChurchSettings;
  musicCount: number | null;
  newPrayerCount: number | null;
  onNavigate: (tab: AdminTabId, quickAction?: 'add') => void;
}

export const OverviewTab: React.FC<OverviewTabProps> = ({
  adminName,
  settings,
  musicCount,
  newPrayerCount,
  onNavigate,
}) => {
  const firstName = adminName.split(/\s+/)[0] || 'Leader';

  const stats = [
    {
      label: 'Uploaded songs',
      value: musicCount === null ? '—' : String(musicCount),
      tab: 'music' as AdminTabId,
      icon: Music2,
    },
    {
      label: 'Sermons',
      value: String(settings.sermons.length),
      tab: 'sermons' as AdminTabId,
      icon: Video,
    },
    {
      label: 'Upcoming events',
      value: String(settings.events.length),
      tab: 'events' as AdminTabId,
      icon: Calendar,
    },
    {
      label: 'New prayer requests',
      value: newPrayerCount === null ? '—' : String(newPrayerCount),
      tab: 'prayer' as AdminTabId,
      icon: HandHeart,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-pine text-white p-5 sm:p-6">
        <p className="font-hand text-2xl text-gold">Karibu, {firstName}</p>
        <h2 className="font-display text-2xl sm:text-3xl font-bold mt-1">
          {settings.churchName}
        </h2>
        <p className="mt-2 text-sm sm:text-base text-white/80 max-w-xl">
          Update worship music, service times, sermons, events, and prayer requests. Every change you save appears straight away on the church website.
        </p>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-pine mb-3">Quick shortcuts</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('live')}
            className="min-h-14 flex items-center justify-center gap-2.5 rounded-2xl bg-pine text-white px-5 py-3.5 font-bold text-base hover:bg-clay transition shadow-sm"
          >
            <Radio size={20} />
            <span>Watch Live setup</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('music', 'add')}
            className="min-h-14 flex items-center justify-center gap-2.5 rounded-2xl bg-clay text-white px-5 py-3.5 font-bold text-base hover:bg-[#a05a37] transition shadow-sm"
          >
            <Upload size={20} />
            <span>Upload a song</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('pastor')}
            className="min-h-14 flex items-center justify-center gap-2.5 rounded-2xl bg-white border-2 border-pine text-pine px-5 py-3.5 font-bold text-base hover:bg-sand transition"
          >
            <ImagePlus size={20} />
            <span>Change pastor photo</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('sermons', 'add')}
            className="min-h-14 flex items-center justify-center gap-2.5 rounded-2xl bg-white border-2 border-pine text-pine px-5 py-3.5 font-bold text-base hover:bg-sand transition"
          >
            <Plus size={20} />
            <span>Add a sermon</span>
          </button>
          <button
            type="button"
            onClick={() => onNavigate('events', 'add')}
            className="min-h-14 flex items-center justify-center gap-2.5 rounded-2xl bg-white border-2 border-pine text-pine px-5 py-3.5 font-bold text-base hover:bg-sand transition"
          >
            <Plus size={20} />
            <span>Add an event</span>
          </button>
        </div>
      </div>

      <div>
        <h3 className="font-display text-lg font-bold text-pine mb-3">At a glance</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                onClick={() => onNavigate(item.tab)}
                className="text-left rounded-2xl bg-white border border-ink/10 p-4 hover:border-clay transition shadow-sm min-h-24 flex flex-col justify-between"
              >
                <div className="flex items-center justify-between text-ink/60">
                  <span className="text-xs font-bold uppercase tracking-wide">{item.label}</span>
                  <Icon size={18} className="text-clay shrink-0" />
                </div>
                <p className="font-display text-3xl font-bold text-pine mt-2">{item.value}</p>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;
