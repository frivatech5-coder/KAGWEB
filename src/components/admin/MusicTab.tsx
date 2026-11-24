import React, { useEffect, useRef, useState } from 'react';
import { Check, Music2, Pause, Pencil, Play, Upload, X, AlertCircle } from 'lucide-react';
import {
  deleteTrack,
  subscribeToMusic,
  updateTrack,
  uploadTrack,
  type MusicTrack,
} from '../../lib/firebase';
import { ConfirmDeleteButton, Field, formatAdminError, inputCls } from './AdminShared';

const MAX_AUDIO_BYTES = 40 * 1024 * 1024;
const formatMB = (bytes: number) => `${(bytes / 1048576).toFixed(1)} MB`;

export const MusicTab: React.FC = () => {
  const [tracks, setTracks] = useState<MusicTrack[] | null>(null);
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  const [uploadPct, setUploadPct] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState<string | null>(null);
  const [titleError, setTitleError] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);

  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editArtist, setEditArtist] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const cancelUploadRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const unsub = subscribeToMusic(setTracks, () => setTracks([]));
    return () => {
      unsub();
      audioRef.current?.pause();
    };
  }, []);

  const pickFile = (picked: File | null) => {
    setFileError(null);
    setUploadSuccess(null);
    setUploadError(null);
    if (!picked) {
      setFile(null);
      return;
    }
    const isAudioMime = picked.type.startsWith('audio/');
    const isAudioExt = /\.(mp3|m4a|wav|aac|ogg)$/i.test(picked.name);
    if (!isAudioMime && !isAudioExt) {
      setFileError('Please choose an audio file (MP3, M4A, WAV, or AAC).');
      return;
    }
    if (picked.size > MAX_AUDIO_BYTES) {
      setFileError('That file is larger than 40 MB. Please choose a smaller audio file.');
      return;
    }
    setFile(picked);
    if (!title.trim()) {
      const cleanName = picked.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
      setTitle(cleanName);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    setTitleError(null);
    setFileError(null);
    setUploadError(null);
    setUploadSuccess(null);

    let hasErr = false;
    if (!title.trim()) {
      setTitleError('Please enter a song title.');
      hasErr = true;
    }
    if (!file) {
      setFileError('Please choose an audio file to upload.');
      hasErr = true;
    }
    if (hasErr || !file) return;

    setUploadPct(0);
    try {
      await uploadTrack(
        file,
        { title: title.trim(), artist: artist.trim() },
        setUploadPct,
        (cancel) => {
          cancelUploadRef.current = cancel;
        }
      );
      setUploadSuccess(`"${title.trim()}" is now live on the website.`);
      setTitle('');
      setArtist('');
      setFile(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
    } catch (err) {
      const code = (err as { code?: string })?.code ?? '';
      if (code === 'storage/canceled') {
        setUploadError('Upload cancelled.');
      } else {
        setUploadError(formatAdminError(err));
      }
    } finally {
      cancelUploadRef.current = null;
      setUploadPct(null);
    }
  };

  const togglePlay = (track: MusicTrack) => {
    const audio = audioRef.current;
    if (!audio || !track.url?.trim()) return;
    if (playingId === track.id) {
      audio.pause();
      setPlayingId(null);
      return;
    }
    audio.src = track.url.trim();
    audio.play().then(() => setPlayingId(track.id)).catch(() => setPlayingId(null));
  };

  const startEdit = (track: MusicTrack) => {
    setEditingId(track.id);
    setEditTitle(track.title);
    setEditArtist(track.artist || '');
    setEditError(null);
  };

  const saveEdit = async (id: string) => {
    if (!editTitle.trim()) {
      setEditError('Song title cannot be empty.');
      return;
    }
    setSavingEdit(true);
    setEditError(null);
    try {
      await updateTrack(id, { title: editTitle.trim(), artist: editArtist.trim() });
      setEditingId(null);
    } catch (err) {
      setEditError(formatAdminError(err));
    } finally {
      setSavingEdit(false);
    }
  };

  const handleDelete = async (track: MusicTrack) => {
    setDeletingId(track.id);
    try {
      if (playingId === track.id) {
        audioRef.current?.pause();
        setPlayingId(null);
      }
      await deleteTrack(track);
    } catch (err) {
      setUploadError(formatAdminError(err));
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-8">
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} preload="none" />

      <div>
        <h2 className="font-display text-2xl font-bold text-pine">Worship & Choir Music</h2>
        <p className="text-sm text-ink/70 mt-1">
          Upload MP3, M4A, WAV, or AAC recordings (up to 40 MB). Visitors can listen and download them for free.
        </p>
      </div>

      <form onSubmit={handleUpload} noValidate className="bg-white rounded-2xl border border-ink/10 p-4 sm:p-6 space-y-4 shadow-sm">
        <h3 className="font-display text-lg font-bold text-pine">Upload a new song</h3>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragActive(true);
          }}
          onDragLeave={() => setDragActive(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragActive(false);
            const dropped = e.dataTransfer.files?.[0] ?? null;
            pickFile(dropped);
          }}
          className={`rounded-2xl border-2 border-dashed p-5 text-center transition ${
            dragActive ? 'border-clay bg-clay/5' : 'border-gold/70 bg-paper/60'
          }`}
        >
          <input
            ref={fileInputRef}
            id="music-file-input"
            type="file"
            accept="audio/*,.mp3,.m4a,.wav,.aac"
            onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
            className="sr-only"
          />
          <Music2 size={28} className="mx-auto text-pine/70 mb-2" />
          {file ? (
            <div className="space-y-1">
              <p className="font-bold text-pine break-all">{file.name}</p>
              <p className="text-xs text-ink/65">{formatMB(file.size)} · Ready to upload</p>
            </div>
          ) : (
            <p className="text-sm text-ink/75">
              Drag an audio file here, or tap the button below to choose from your phone or computer.
            </p>
          )}
          <label
            htmlFor="music-file-input"
            className="mt-3 inline-flex items-center justify-center gap-2 min-h-12 px-5 rounded-full bg-pine text-white text-sm font-bold cursor-pointer hover:bg-clay transition"
          >
            <Upload size={18} />
            <span>{file ? 'Choose a different file' : 'Choose audio file'}</span>
          </label>
          {fileError && (
            <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
              {fileError}
            </p>
          )}
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          <Field
            id="music-title"
            label="Song title"
            helper="Shown on the website, e.g. Bwana U Sehemu Yangu"
            error={titleError ?? undefined}
            required
          >
            <input
              id="music-title"
              type="text"
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                setTitleError(null);
              }}
              placeholder="Enter song title"
              className={inputCls}
            />
          </Field>

          <Field
            id="music-artist"
            label="Singer or choir"
            helper="Optional. Leave blank to show KAG Emmanuel Witima"
          >
            <input
              id="music-artist"
              type="text"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              placeholder="e.g. Witima Church Choir"
              className={inputCls}
            />
          </Field>
        </div>

        {uploadPct !== null && (
          <div className="space-y-2 rounded-xl bg-sand p-3">
            <div className="flex items-center justify-between text-sm font-bold text-pine">
              <span>Uploading song... {uploadPct}%</span>
              <button
                type="button"
                onClick={() => cancelUploadRef.current?.()}
                className="min-h-10 px-3 rounded-lg bg-white border border-ink/20 text-ink text-xs font-bold hover:bg-red-50 hover:text-red-700"
              >
                Cancel upload
              </button>
            </div>
            <div className="h-2.5 rounded-full bg-white overflow-hidden">
              <div className="h-full bg-clay transition-all" style={{ width: `${uploadPct}%` }} />
            </div>
          </div>
        )}

        {uploadError && (
          <div role="alert" className="rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-800 flex items-start gap-2">
            <AlertCircle size={18} className="shrink-0 mt-0.5" />
            <span>{uploadError}</span>
          </div>
        )}

        {uploadSuccess && (
          <div role="status" className="rounded-xl bg-pine/10 border border-pine/20 p-3 text-sm font-semibold text-pine flex items-center gap-2">
            <Check size={18} className="shrink-0" />
            <span>{uploadSuccess}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={uploadPct !== null}
          className="w-full sm:w-auto min-h-12 px-6 rounded-full bg-clay text-white font-bold text-sm hover:bg-[#a05a37] disabled:opacity-50 transition inline-flex items-center justify-center gap-2"
        >
          <Upload size={18} />
          <span>{uploadPct !== null ? `Uploading ${uploadPct}%...` : 'Upload song'}</span>
        </button>
      </form>

      <div className="space-y-3">
        <h3 className="font-display text-lg font-bold text-pine">
          Uploaded songs {tracks !== null ? `(${tracks.length})` : ''}
        </h3>

        {tracks === null && <p className="text-sm text-ink/60">Loading uploaded songs...</p>}
        {tracks?.length === 0 && (
          <div className="rounded-2xl border-2 border-dashed border-gold/60 p-6 text-center text-ink/70 bg-white/50">
            No songs uploaded yet. Use the form above to add your first song.
          </div>
        )}

        <ul className="space-y-3">
          {tracks?.map((track) => {
            const isEditing = editingId === track.id;
            return (
              <li key={track.id} className="bg-white rounded-2xl border border-ink/10 p-4 shadow-sm space-y-3">
                <div className="flex items-start sm:items-center gap-3">
                  <button
                    type="button"
                    onClick={() => togglePlay(track)}
                    aria-label={`${playingId === track.id ? 'Pause' : 'Play'} ${track.title}`}
                    className="shrink-0 size-12 rounded-full bg-pine text-white grid place-items-center hover:bg-clay transition"
                  >
                    {playingId === track.id ? <Pause size={20} /> : <Play size={20} className="ml-0.5" />}
                  </button>

                  <div className="min-w-0 flex-1">
                    <p className="font-bold text-pine truncate">{track.title}</p>
                    <p className="text-sm text-ink/65 truncate">
                      {track.artist || 'KAG Emmanuel Witima'} · {formatMB(track.size)}
                    </p>
                  </div>
                </div>

                {isEditing ? (
                  <div className="pt-2 border-t border-ink/10 space-y-3">
                    <div className="grid sm:grid-cols-2 gap-3">
                      <Field id={`edit-title-${track.id}`} label="Song title" required>
                        <input
                          id={`edit-title-${track.id}`}
                          type="text"
                          value={editTitle}
                          onChange={(e) => setEditTitle(e.target.value)}
                          className={inputCls}
                        />
                      </Field>
                      <Field id={`edit-artist-${track.id}`} label="Singer or choir">
                        <input
                          id={`edit-artist-${track.id}`}
                          type="text"
                          value={editArtist}
                          onChange={(e) => setEditArtist(e.target.value)}
                          placeholder="KAG Emmanuel Witima"
                          className={inputCls}
                        />
                      </Field>
                    </div>
                    {editError && <p role="alert" className="text-xs font-semibold text-red-700">{editError}</p>}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={savingEdit}
                        onClick={() => saveEdit(track.id)}
                        className="min-h-11 px-4 rounded-xl bg-pine text-white text-sm font-bold hover:bg-clay disabled:opacity-50 inline-flex items-center gap-1.5"
                      >
                        <Check size={16} />
                        <span>{savingEdit ? 'Saving...' : 'Save name'}</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setEditingId(null)}
                        className="min-h-11 px-4 rounded-xl border border-ink/20 bg-paper text-ink text-sm font-semibold inline-flex items-center gap-1.5"
                      >
                        <X size={16} />
                        <span>Cancel</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => startEdit(track)}
                      className="min-h-11 px-3.5 inline-flex items-center gap-1.5 rounded-xl border border-ink/15 bg-paper text-pine text-sm font-semibold hover:bg-sand transition"
                    >
                      <Pencil size={15} />
                      <span>Rename</span>
                    </button>
                    <ConfirmDeleteButton
                      itemLabel={track.title}
                      busy={deletingId === track.id}
                      onConfirm={() => handleDelete(track)}
                    />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
};

export default MusicTab;
