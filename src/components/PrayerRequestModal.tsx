import React, { useState } from 'react';
import { X, Send, Heart, ShieldCheck, CheckCircle2, MessageCircle } from 'lucide-react';
import { ChurchSettings } from '../types/church';
import { submitPrayerPetitionToFirebase } from '../lib/firebase';

interface PrayerRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ChurchSettings;
}

export const PrayerRequestModal: React.FC<PrayerRequestModalProps> = ({
  isOpen,
  onClose,
  settings,
}) => {
  const [name, setName] = useState('');
  const [contact, setContact] = useState('');
  const [category, setCategory] = useState('Healing & Health');
  const [requestText, setRequestText] = useState('');
  const [isConfidential, setIsConfidential] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!requestText.trim()) return;

    const petitionData = {
      name: name.trim() || 'Anonymous Seeker',
      contact: contact.trim(),
      category,
      requestText: requestText.trim(),
      isConfidential,
      prayedFor: false,
    };

    // Store in localStorage for parish prayer ledger
    const existingPetitions = JSON.parse(localStorage.getItem('witima_prayer_petitions') || '[]');
    const newPetition = {
      id: Date.now().toString(),
      ...petitionData,
      timestamp: new Date().toISOString(),
    };
    localStorage.setItem('witima_prayer_petitions', JSON.stringify([newPetition, ...existingPetitions]));

    // Persist to Firebase Firestore
    submitPrayerPetitionToFirebase(petitionData).catch((err) => {
      console.warn('Firebase petition persistence warning:', err);
    });

    setSubmitted(true);
  };

  const handleReset = () => {
    setName('');
    setContact('');
    setRequestText('');
    setSubmitted(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="relative w-full max-w-xl bg-[#F3EFE6] text-[#171916] border border-[#171916]/20 p-5 sm:p-8 shadow-2xl overflow-y-auto max-h-[90vh]">
        
        {/* Header */}
        <div className="flex items-start justify-between border-b border-[#171916]/10 pb-4 mb-6">
          <div>
            <span className="font-sans text-[10px] uppercase tracking-[0.3em] text-[#B66A43] font-bold block">
              Altar of Intercession · Witima Sanctuary
            </span>
            <h3 className="font-serif text-2xl sm:text-3xl font-normal text-[#171916] mt-1">
              Private Prayer Petition
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-[#171916]/60 hover:text-[#183D32] transition-colors"
            aria-label="Close prayer modal"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {submitted ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 mx-auto rounded-none bg-[#183D32] text-[#F3EFE6] flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#B69A62]" />
            </div>
            <h4 className="font-serif text-2xl font-bold text-[#183D32]">
              Your Petition Has Been Placed on the Altar
            </h4>
            <p className="font-sans text-sm text-[#171916]/80 max-w-md mx-auto leading-relaxed">
              Pastor Sarah Waweru and the prayer intercessors of KAG Emmanuel Church Witima will hold this prayer in sacred confidence before the Lord during dawn intercession.
            </p>
            <div className="p-4 bg-[#183D32]/5 border border-[#183D32]/15 text-xs font-serif italic text-[#183D32]">
              “The prayer of a righteous person is powerful and effective.” — James 5:16
            </div>
            <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
              <a
                href={`https://wa.me/${settings.mpesa.whatsappNumber}?text=Praise%20God%20Pastor%20Sarah,%20I%20have%20submitted%20a%20prayer%20request%20regarding%20${encodeURIComponent(category)}.`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-5 py-2.5 bg-[#183D32] text-[#F3EFE6] font-sans text-xs uppercase tracking-wider font-semibold hover:bg-[#171916] flex items-center justify-center gap-2"
              >
                <MessageCircle className="w-3.5 h-3.5" />
                <span>Notify Pastor Sarah on WhatsApp</span>
              </a>
              <button
                onClick={handleReset}
                className="w-full sm:w-auto px-5 py-2.5 border border-[#171916]/20 font-sans text-xs uppercase tracking-wider font-medium text-[#171916]"
              >
                Close Window
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <p className="font-sans text-xs text-[#171916]/70 leading-relaxed">
              No matter what burden you are bearing, you do not have to carry it alone. Submit your request below; Pastor Sarah reviews petitions personally.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-sans font-semibold text-[#171916]/80 mb-1">
                  Your Name (Optional / May be Anonymous)
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Grace Nyambura"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#171916]/20 focus:border-[#183D32] focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-sans font-semibold text-[#171916]/80 mb-1">
                  Contact Phone or Email (Optional)
                </label>
                <input
                  type="text"
                  value={contact}
                  onChange={(e) => setContact(e.target.value)}
                  placeholder="e.g. 0712 345 678"
                  className="w-full px-3 py-2 text-sm bg-white border border-[#171916]/20 focus:border-[#183D32] focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-sans font-semibold text-[#171916]/80 mb-1">
                Prayer Focus / Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-[#171916]/20 focus:border-[#183D32] focus:outline-none font-sans"
              >
                <option value="Healing & Health">Physical Healing & Health</option>
                <option value="Family & Children">Family Peace & Restoration</option>
                <option value="Financial & Harvest">Financial Provision, Jobs & Harvest</option>
                <option value="Deliverance & Peace">Deliverance & Inner Peace</option>
                <option value="Spiritual Renewal">Spiritual Hunger & Holy Spirit Baptism</option>
                <option value="Thanksgiving">Thanksgiving for Answered Prayer</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-sans font-semibold text-[#171916]/80 mb-1">
                Your Prayer Petition *
              </label>
              <textarea
                rows={4}
                required
                value={requestText}
                onChange={(e) => setRequestText(e.target.value)}
                placeholder="Share your heart openly. God hears every quiet sigh..."
                className="w-full px-3 py-2 text-sm bg-white border border-[#171916]/20 focus:border-[#183D32] focus:outline-none"
              />
            </div>

            <div className="flex items-center gap-2 pt-1">
              <input
                type="checkbox"
                id="confidentialCheck"
                checked={isConfidential}
                onChange={(e) => setIsConfidential(e.target.checked)}
                className="rounded-none border-[#171916]/30 text-[#183D32] focus:ring-0"
              />
              <label htmlFor="confidentialCheck" className="text-xs font-sans text-[#171916]/80">
                Keep strictly confidential (for Pastor Sarah Waweru's eyes only)
              </label>
            </div>

            <div className="pt-4 border-t border-[#171916]/10 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-sans text-[#171916]/70 hover:text-[#171916]"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 bg-[#183D32] text-[#F3EFE6] font-sans text-xs uppercase tracking-widest font-semibold hover:bg-[#171916] transition-colors flex items-center gap-2"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Submit to Altar</span>
              </button>
            </div>
          </form>
        )}

      </div>
    </div>
  );
};
