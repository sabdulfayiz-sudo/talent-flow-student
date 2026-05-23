import React, { useEffect, useRef, useState } from 'react';
import { Modal, message } from 'antd';
import {
  CopyOutlined,
  DownloadOutlined,
  LinkedinFilled,
  ShareAltOutlined,
  TrophyOutlined,
} from '@ant-design/icons';
import type { ReportResponse } from '../../types/portal';

interface ShareCardModalProps {
  open: boolean;
  onClose: () => void;
  data: ReportResponse;
  studentName: string;
  linkedinUrl?: string | null;
}

/**
 * Mobile-first "Strava-style" share modal for a finished test result.
 *
 * Renders an iPhone-shaped 9:16 preview that the student can show off
 * to friends. The same composition is hand-painted to a 1080x1920
 * canvas for the Download-as-image action so the exported image
 * matches the on-screen preview exactly. The Share button uses the
 * Web Share API (with file payload when the browser supports it),
 * falling back to clipboard.
 */
const ShareCardModal: React.FC<ShareCardModalProps> = ({
  open,
  onClose,
  data,
  studentName,
  linkedinUrl,
}) => {
  const [downloading, setDownloading] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [scoreAnim, setScoreAnim] = useState(0);
  const animRef = useRef<number | null>(null);

  // Animated score count-up when the modal opens.
  useEffect(() => {
    if (!open) {
      // Reset is async-deferred so the lint rule against synchronous
      // setState in effect bodies is satisfied.
      queueMicrotask(() => setScoreAnim(0));
      return;
    }
    const target = data.score;
    const duration = 900;
    const start = performance.now();
    const step = (t: number) => {
      const progress = Math.min(1, (t - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setScoreAnim(Math.round(eased * target));
      if (progress < 1) {
        animRef.current = requestAnimationFrame(step);
      }
    };
    animRef.current = requestAnimationFrame(step);
    return () => {
      if (animRef.current !== null) cancelAnimationFrame(animRef.current);
    };
  }, [open, data.score]);

  const passed = data.status === 'passed';
  const topCategories = [...data.performance_by_category]
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  // Hand-paint the same composition onto a 9:16 canvas for download.
  const buildCanvas = (): HTMLCanvasElement | null => {
    const canvas = document.createElement('canvas');
    canvas.width = 1080;
    canvas.height = 1920;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const grd = ctx.createLinearGradient(0, 0, 1080, 1920);
    if (passed) {
      grd.addColorStop(0, '#0f172a');
      grd.addColorStop(0.5, '#1e293b');
      grd.addColorStop(1, '#064e3b');
    } else {
      grd.addColorStop(0, '#0f172a');
      grd.addColorStop(0.5, '#1e293b');
      grd.addColorStop(1, '#7c2d12');
    }
    ctx.fillStyle = grd;
    ctx.fillRect(0, 0, 1080, 1920);

    // Soft blobs.
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.beginPath();
    ctx.arc(900, 240, 360, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(140, 1620, 280, 0, Math.PI * 2);
    ctx.fill();

    // Header.
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 56px Inter, Arial, sans-serif';
    ctx.fillText('TalentFlow', 70, 160);

    ctx.font = '700 32px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fillText(passed ? 'Passed' : 'Attempted', 70, 220);

    // Title.
    ctx.fillStyle = '#ffffff';
    ctx.font = '900 64px Inter, Arial, sans-serif';
    const titleLines = wrap(ctx, data.title, 940);
    titleLines.slice(0, 2).forEach((line, i) => {
      ctx.fillText(line, 70, 360 + i * 72);
    });

    // Score donut.
    const cx = 540;
    const cy = 920;
    const radius = 280;
    const lineWidth = 56;

    ctx.strokeStyle = 'rgba(255,255,255,0.12)';
    ctx.lineWidth = lineWidth;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    const scoreFrac = Math.max(0, Math.min(1, data.score / 100));
    const arcGrd = ctx.createLinearGradient(cx - radius, cy, cx + radius, cy);
    arcGrd.addColorStop(0, passed ? '#34d399' : '#fb923c');
    arcGrd.addColorStop(1, passed ? '#a7f3d0' : '#fde68a');
    ctx.strokeStyle = arcGrd;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(cx, cy, radius, -Math.PI / 2, -Math.PI / 2 + scoreFrac * Math.PI * 2);
    ctx.stroke();

    // Score number.
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.font = '900 220px Inter, Arial, sans-serif';
    ctx.fillText(`${data.score}`, cx, cy + 60);
    ctx.font = '900 60px Inter, Arial, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.fillText('%', cx + 160, cy - 80);
    ctx.font = '800 36px Inter, Arial, sans-serif';
    ctx.fillStyle = passed ? '#a7f3d0' : '#fed7aa';
    ctx.fillText(data.percentile_label, cx, cy + 130);

    ctx.textAlign = 'left';

    // Stats row.
    const stats: Array<[string, string]> = [
      ['Time', data.time_taken_label],
      ['Questions', String(data.question_review.length)],
      ['Date', new Date(data.completed_at).toLocaleDateString()],
    ];
    stats.forEach(([label, value], i) => {
      const baseX = 70 + i * 320;
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      roundRect(ctx, baseX, 1320, 300, 130, 24);
      ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '900 22px Inter, Arial, sans-serif';
      ctx.fillText(label.toUpperCase(), baseX + 22, 1360);
      ctx.fillStyle = '#ffffff';
      ctx.font = '900 36px Inter, Arial, sans-serif';
      ctx.fillText(value, baseX + 22, 1410);
    });

    // Top categories.
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '900 24px Inter, Arial, sans-serif';
    ctx.fillText('TOP CATEGORIES', 70, 1530);
    topCategories.forEach((cat, i) => {
      const y = 1570 + i * 64;
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 30px Inter, Arial, sans-serif';
      ctx.fillText(cat.category.slice(0, 22), 70, y);
      ctx.fillStyle = 'rgba(255,255,255,0.55)';
      ctx.font = '800 30px Inter, Arial, sans-serif';
      ctx.textAlign = 'right';
      ctx.fillText(`${cat.score}%`, 1010, y);
      ctx.textAlign = 'left';
      // mini bar
      ctx.fillStyle = 'rgba(255,255,255,0.12)';
      roundRect(ctx, 70, y + 12, 940, 8, 4);
      ctx.fill();
      ctx.fillStyle = cat.score >= 80 ? '#34d399' : cat.score >= 60 ? '#fbbf24' : '#fb7185';
      roundRect(ctx, 70, y + 12, 940 * Math.min(1, cat.score / 100), 8, 4);
      ctx.fill();
    });

    // Footer: student name + linkedin (if any).
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.font = '900 24px Inter, Arial, sans-serif';
    ctx.fillText(studentName.toUpperCase(), 70, 1830);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.font = '900 28px Inter, Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText('talentflow.uz', 1010, 1830);
    ctx.textAlign = 'left';

    if (linkedinUrl) {
      ctx.fillStyle = '#0a66c2';
      roundRect(ctx, 70, 1860, 940, 36, 18);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.font = '800 18px Inter, Arial, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText(shortLinkedIn(linkedinUrl), 540, 1885);
      ctx.textAlign = 'left';
    }

    return canvas;
  };

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const canvas = buildCanvas();
      if (!canvas) return;
      const link = document.createElement('a');
      link.href = canvas.toDataURL('image/png');
      link.download = `talentflow-${slug(data.title)}.png`;
      link.click();
    } finally {
      setDownloading(false);
    }
  };

  const handleShare = async () => {
    setSharing(true);
    try {
      const canvas = buildCanvas();
      const text = `I scored ${data.score}% on ${data.title} in TalentFlow. ${data.percentile_label} overall.`;
      const url = window.location.href;
      // Try file-share first (Instagram, WhatsApp, etc.).
      if (canvas && typeof navigator.canShare === 'function') {
        const blob: Blob | null = await new Promise((resolve) =>
          canvas.toBlob((b) => resolve(b), 'image/png'),
        );
        if (blob) {
          const file = new File([blob], `talentflow-${slug(data.title)}.png`, {
            type: 'image/png',
          });
          if (navigator.canShare({ files: [file] })) {
            await navigator.share({
              title: 'TalentFlow Result',
              text,
              files: [file],
            });
            return;
          }
        }
      }
      if (navigator.share) {
        await navigator.share({ title: 'TalentFlow Result', text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        message.success('Result link copied.');
      }
    } catch {
      message.info('Sharing was cancelled.');
    } finally {
      setSharing(false);
    }
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      message.success('Link copied.');
    } catch {
      message.error('Could not copy.');
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width={460}
      centered
      destroyOnHidden
      title={null}
      styles={{ body: { padding: 0, background: 'transparent' } }}
    >
      <div className="p-2 pt-6">
        <div className="flex flex-col items-center gap-5">
          {/* Phone frame */}
          <div className="relative tf-phone-frame">
            <div
              className={`tf-share-card relative overflow-hidden rounded-[44px] shadow-2xl ${
                passed ? 'tf-share-card--pass' : 'tf-share-card--fail'
              }`}
            >
              {/* Notch */}
              <div className="absolute left-1/2 -translate-x-1/2 top-2 z-30 h-6 w-28 rounded-full bg-black/85" />

              <div className="relative z-10 flex flex-col p-7 pt-12 text-white h-full">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-black tracking-[0.25em] opacity-70">
                    TALENTFLOW
                  </p>
                  <div
                    className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${
                      passed
                        ? 'bg-emerald-400/20 text-emerald-200'
                        : 'bg-amber-400/20 text-amber-200'
                    }`}
                  >
                    {passed ? 'Passed' : 'Attempted'}
                  </div>
                </div>

                <h3 className="mt-4 text-xl font-black leading-tight line-clamp-2">
                  {data.title}
                </h3>

                <div className="relative mt-5 mx-auto size-44">
                  <svg viewBox="0 0 120 120" className="size-full -rotate-90">
                    <defs>
                      <linearGradient id="tfRing" x1="0" x2="1" y1="0" y2="0">
                        <stop offset="0%" stopColor={passed ? '#34d399' : '#fb923c'} />
                        <stop offset="100%" stopColor={passed ? '#a7f3d0' : '#fde68a'} />
                      </linearGradient>
                    </defs>
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="rgba(255,255,255,0.12)"
                      strokeWidth="10"
                    />
                    <circle
                      cx="60"
                      cy="60"
                      r="50"
                      fill="none"
                      stroke="url(#tfRing)"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 50}
                      strokeDashoffset={
                        2 * Math.PI * 50 * (1 - Math.max(0, Math.min(1, scoreAnim / 100)))
                      }
                      style={{ transition: 'stroke-dashoffset 80ms linear' }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-5xl font-black leading-none">{scoreAnim}<span className="text-xl opacity-70">%</span></p>
                    <p className="mt-1 text-[10px] font-black tracking-widest opacity-70">
                      {data.percentile_label.toUpperCase()}
                    </p>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2 text-center">
                  {[
                    { l: 'TIME', v: data.time_taken_label },
                    { l: 'QUESTIONS', v: String(data.question_review.length) },
                    { l: 'DATE', v: new Date(data.completed_at).toLocaleDateString() },
                  ].map((s) => (
                    <div key={s.l} className="rounded-2xl bg-white/8 px-2 py-2.5">
                      <p className="text-[9px] font-black tracking-widest opacity-60">
                        {s.l}
                      </p>
                      <p className="mt-0.5 text-[13px] font-black leading-tight">
                        {s.v}
                      </p>
                    </div>
                  ))}
                </div>

                {topCategories.length > 0 && (
                  <div className="mt-5">
                    <p className="text-[10px] font-black tracking-widest opacity-60 mb-2">
                      TOP CATEGORIES
                    </p>
                    <div className="space-y-2">
                      {topCategories.map((c) => (
                        <div key={c.category}>
                          <div className="flex items-center justify-between text-[12px] font-black mb-1">
                            <span className="truncate max-w-[180px]">{c.category}</span>
                            <span className="opacity-70">{c.score}%</span>
                          </div>
                          <div className="h-1.5 rounded-full bg-white/12 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${Math.min(100, c.score)}%`,
                                background:
                                  c.score >= 80
                                    ? '#34d399'
                                    : c.score >= 60
                                    ? '#fbbf24'
                                    : '#fb7185',
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <div className="mt-auto pt-5 flex items-center justify-between">
                  <div>
                    <p className="text-[10px] font-black tracking-widest opacity-50">
                      {studentName.toUpperCase()}
                    </p>
                    <p className="text-[11px] font-black opacity-80 mt-0.5">talentflow.uz</p>
                  </div>
                  <TrophyOutlined className={`text-3xl ${passed ? 'text-emerald-200' : 'text-amber-200'}`} />
                </div>

                {linkedinUrl && (
                  <a
                    href={normalizeLinkedIn(linkedinUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-3 flex items-center justify-center gap-2 rounded-full bg-[#0a66c2] py-2 text-[11px] font-black hover:bg-[#0a66c2]/90"
                  >
                    <LinkedinFilled />
                    <span>{shortLinkedIn(linkedinUrl)}</span>
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className="w-full grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={handleShare}
              disabled={sharing}
              className="flex items-center justify-center gap-2 rounded-2xl bg-black text-white py-3 text-[12px] font-black hover:bg-gray-800 cursor-pointer disabled:opacity-50"
            >
              <ShareAltOutlined /> Share
            </button>
            <button
              type="button"
              onClick={handleDownload}
              disabled={downloading}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white text-gray-900 py-3 text-[12px] font-black hover:bg-gray-50 cursor-pointer disabled:opacity-50"
            >
              <DownloadOutlined /> {downloading ? 'Saving' : 'Save image'}
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center justify-center gap-2 rounded-2xl border border-gray-200 bg-white text-gray-900 py-3 text-[12px] font-black hover:bg-gray-50 cursor-pointer"
            >
              <CopyOutlined /> Copy link
            </button>
          </div>

          <p className="text-[11px] text-gray-400 text-center max-w-72">
            Save the image and post it to Instagram, Telegram, or LinkedIn.
            On mobile, tap Share to post directly.
          </p>
        </div>
      </div>
    </Modal>
  );
};

const slug = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const normalizeLinkedIn = (url: string) =>
  url.startsWith('http') ? url : `https://${url}`;

const shortLinkedIn = (url: string) => {
  const stripped = url
    .replace(/^https?:\/\//, '')
    .replace(/^www\./, '')
    .replace(/\/$/, '');
  return stripped.length > 38 ? `${stripped.slice(0, 38)}…` : stripped;
};

const wrap = (ctx: CanvasRenderingContext2D, text: string, maxWidth: number) => {
  const words = text.split(' ');
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (ctx.measureText(test).width > maxWidth && cur) {
      lines.push(cur);
      cur = w;
    } else {
      cur = test;
    }
  }
  if (cur) lines.push(cur);
  return lines;
};

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
};

export default ShareCardModal;
