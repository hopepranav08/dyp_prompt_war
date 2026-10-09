import { Camera, Crosshair, Mic, Phone, Send, Square, Trash2 } from 'lucide-react';
import { motion } from 'motion/react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { api, blobToBase64, compressImage, type MediaPayload } from '../lib/api';
import { usePrefs } from '../lib/prefs';
import { useSession } from './Controls';
import { prettyCategory, STATUS_STYLE } from '../lib/format';
import type { LatLng, Report } from '../lib/types';
import { LiveReports } from './LiveReports';
import { ErrorNote, ScoreBadge, SectionTitle, Spinner } from './ui';

interface Props {
  location: LatLng;
  reports: Report[];
  onLocate: (p: LatLng) => void;
  onCreated: (r: Report) => void;
}

const MAX_RECORD_MS = 30_000;

export function ReportPanel({ location, reports, onLocate, onCreated }: Props) {
  const { t } = usePrefs();
  const session = useSession();
  const [text, setText] = useState('');
  const [image, setImage] = useState<{ payload: MediaPayload; preview: string } | null>(null);
  const [audio, setAudio] = useState<{ payload: MediaPayload; url: string } | null>(null);
  const [recording, setRecording] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState<Report | null>(null);
  const recorder = useRef<MediaRecorder | null>(null);

  useEffect(() => () => recorder.current?.stream.getTracks().forEach((t) => t.stop()), []);

  function locate() {
    if (!navigator.geolocation) return setError('Location is not available in this browser. Tap the map instead.');
    navigator.geolocation.getCurrentPosition(
      (pos) => onLocate({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => setError('Could not get your location. Tap the map to pin it instead.'),
      { enableHighAccuracy: true, timeout: 8000 },
    );
  }

  async function onPhoto(file: File | undefined) {
    if (!file) return;
    try {
      const payload = await compressImage(file);
      setImage({ payload, preview: `data:${payload.mimeType};base64,${payload.data}` });
    } catch {
      setError('Could not read that photo. Try a JPG or PNG.');
    }
  }

  async function toggleRecording() {
    if (recording) {
      recorder.current?.stop();
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const rec = new MediaRecorder(stream, { mimeType });
      const chunks: Blob[] = [];
      rec.ondataavailable = (e) => chunks.push(e.data);
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        setRecording(false);
        const blob = new Blob(chunks, { type: mimeType });
        setAudio({ payload: { mimeType, data: await blobToBase64(blob) }, url: URL.createObjectURL(blob) });
      };
      recorder.current = rec;
      rec.start();
      setRecording(true);
      window.setTimeout(() => rec.state === 'recording' && rec.stop(), MAX_RECORD_MS);
    } catch {
      setError('Microphone permission denied. You can type or add a photo instead.');
    }
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const { report: r } = await api.report({ text: text.trim() || undefined, image: image?.payload, audio: audio?.payload, location });
      setReport(r);
      onCreated(r);
      setText('');
      setImage(null);
      setAudio(null);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  const canSend = Boolean(text.trim() || image || audio) && !loading && !recording;

  return (
    <div>
      <SectionTitle kicker={t('report.kicker')} title={t('report.title')}>
        {t('report.sub')}
      </SectionTitle>

      <form onSubmit={submit} className="space-y-3">
        <label htmlFor="rep-text" className="block text-sm font-semibold">
          {t('report.what')}
        </label>
        <textarea
          id="rep-text"
          className="field min-h-24"
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={1000}
          placeholder={t('report.placeholder')}
        />

        <div className="flex flex-wrap gap-2">
          <label className="btn cursor-pointer bg-surface has-[:focus-visible]:outline-3">
            <Camera className="size-4" aria-hidden /> {t('report.photo')}
            <input type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" onChange={(e) => void onPhoto(e.target.files?.[0])} />
          </label>
          <button type="button" className={`btn ${recording ? 'bg-danger text-on-primary' : 'bg-surface'}`} onClick={() => void toggleRecording()} aria-pressed={recording}>
            {recording ? <Square className="size-4" aria-hidden /> : <Mic className="size-4" aria-hidden />}
            {recording ? t('report.stop') : t('report.voice')}
          </button>
          <button type="button" className="btn bg-surface" onClick={locate}>
            <Crosshair className="size-4" aria-hidden /> {t('report.locate')}
          </button>
        </div>

        <p className="font-mono text-xs text-muted">
          📍 {location.lat.toFixed(4)}, {location.lng.toFixed(4)} · {t('report.pinHint')}
        </p>

        <p className="text-xs text-muted">
          {session ? `${t('auth.as')} ${session.email ?? t('auth.guestUser')}` : `${t('auth.guestUser')} · ${t('auth.signIn')} → +trust`}
        </p>

        {(image || audio) && (
          <div className="flex flex-wrap items-center gap-3">
            {image && (
              <div className="relative">
                <img src={image.preview} alt="Attached photo preview" className="h-20 w-28 rounded-2xl border border-ink/10 object-cover" />
                <button type="button" onClick={() => setImage(null)} className="absolute -top-2 -right-2 rounded-full border border-ink/10 bg-surface p-1" aria-label="Remove photo">
                  <Trash2 className="size-3" aria-hidden />
                </button>
              </div>
            )}
            {audio && (
              <div className="flex items-center gap-2">
                <audio controls src={audio.url} className="h-10" aria-label="Recorded voice note" />
                <button type="button" onClick={() => setAudio(null)} className="rounded-full border border-ink/10 bg-surface p-1" aria-label="Remove voice note">
                  <Trash2 className="size-3" aria-hidden />
                </button>
              </div>
            )}
          </div>
        )}

        <button className="btn btn-primary w-full " disabled={!canSend}>
          <Send className="size-4" aria-hidden /> {t('report.submit')}
        </button>
      </form>

      <div className="mt-5 space-y-3" aria-live="polite">
        {loading && <Spinner label={t('report.loading')} />}
        {error && <ErrorNote message={error} />}
        {report && !loading && (
          <motion.article initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="card p-4">
            <div className="flex items-start gap-3">
              <ScoreBadge score={report.trustScore} label="Trust score" size={64} />
              <div className="min-w-0 flex-1">
                <span className={`chip ${STATUS_STYLE[report.status].className}`}>{STATUS_STYLE[report.status].label}</span>
                <h3 className="mt-1 text-lg font-bold">{report.title}</h3>
                <p className="text-xs text-muted">
                  {prettyCategory(report.category)} · severity {report.severity}/5 · reported in {report.language}
                </p>
              </div>
            </div>
            <p className="mt-3 text-sm">{report.summary}</p>
            {report.transcript && <p className="mt-2 border-l-4 border-sun pl-3 text-sm italic">“{report.transcript}”</p>}

            <h4 className="mt-4 text-sm font-bold">{t('report.why')}</h4>
            <ul className="mt-1 space-y-1 text-xs">
              {report.signals.map((s) => (
                <li key={s.label} className="flex justify-between gap-2">
                  <span>{s.label}</span>
                  <span className={`font-mono font-bold ${s.delta >= 0 ? 'text-ok' : 'text-danger'}`}>
                    {s.delta >= 0 ? '+' : ''}
                    {s.delta}
                  </span>
                </li>
              ))}
            </ul>

            <h4 className="mt-4 text-sm font-bold">{t('report.now')}</h4>
            <ul className="mt-1 list-disc space-y-1 pl-5 text-sm">
              {report.actions.map((a) => (
                <li key={a}>{a}</li>
              ))}
            </ul>
            <p className="mt-3 flex items-center gap-2 rounded-2xl border border-ink/10 bg-cream p-2 text-sm font-semibold">
              <Phone className="size-4" aria-hidden /> {report.authority}
            </p>
          </motion.article>
        )}
        <LiveReports reports={reports} />
      </div>
    </div>
  );
}
