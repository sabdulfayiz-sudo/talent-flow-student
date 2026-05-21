import React, { useRef, useState } from 'react';
import {
  CheckCircleFilled,
  CloudUploadOutlined,
  FilePdfFilled,
  WarningFilled,
} from '@ant-design/icons';
import { Spin, message } from 'antd';
import {
  useLatestResumeReview,
  useUploadResumeReview,
} from '../hooks/useCandidatePortal';
import { useI18n } from '../i18n';

const ResumeReviewPage: React.FC = () => {
  const { t } = useI18n();
  const latest = useLatestResumeReview();
  const upload = useUploadResumeReview();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const handleFiles = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file) return;
    if (!/\.pdf$/i.test(file.name)) {
      message.error('Only PDF files are accepted.');
      return;
    }
    try {
      await upload.mutateAsync(file);
      message.success(t('resumeReview.title'));
    } catch (error) {
      message.error(error instanceof Error ? error.message : t('errors.generic'));
    }
  };

  const review = latest.data;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <div>
        <p className="text-xs font-black text-gray-400 uppercase tracking-widest mb-3">
          {t('resumeReview.title')}
        </p>
        <h1 className="text-4xl font-black tracking-tighter text-gray-900 mb-2">
          {t('resumeReview.title')}
        </h1>
        <p className="text-gray-500 max-w-180">{t('resumeReview.subtitle')}</p>
      </div>

      <section
        className={`rounded-3xl border-2 border-dashed p-10 text-center transition-all ${
          dragOver
            ? 'border-black bg-gray-50'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          void handleFiles(e.dataTransfer.files);
        }}
      >
        <div className="size-14 bg-gray-100 text-gray-500 rounded-2xl mx-auto mb-4 flex items-center justify-center text-2xl">
          <CloudUploadOutlined />
        </div>
        <p className="text-gray-700 font-bold mb-1">{t('resumeReview.upload')}</p>
        <p className="text-xs text-gray-400 mb-4">PDF, up to 5MB</p>
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => {
            void handleFiles(e.target.files);
            // Reset so the same file can be re-uploaded later.
            if (e.target.value) e.target.value = '';
          }}
        />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="bg-black text-white px-5 py-2.5 rounded-2xl text-sm font-bold hover:bg-gray-800 disabled:opacity-50 cursor-pointer shadow-lg shadow-black/10"
        >
          {upload.isPending ? t('resumeReview.uploading') : t('resumeReview.upload')}
        </button>
      </section>

      <section className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
        {latest.isLoading ? (
          <div className="flex items-center justify-center py-10">
            <Spin />
          </div>
        ) : !review ? (
          <p className="text-sm text-gray-400 text-center py-6">
            {t('resumeReview.noReview')}
          </p>
        ) : (
          <div className="space-y-5">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-3">
              <div className="flex items-center gap-3">
                <div className="size-12 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center text-2xl">
                  <FilePdfFilled />
                </div>
                <div>
                  <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                    {t('resumeReview.filename')}
                  </p>
                  <p className="font-black text-gray-900">{review.filename}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs font-black text-gray-400 uppercase tracking-widest">
                  {t('resumeReview.lastScore')}
                </p>
                <p className="text-3xl font-black text-emerald-600">
                  {review.score.toFixed(1)}
                  <span className="text-sm text-emerald-500 font-bold ml-1">
                    / 100
                  </span>
                </p>
              </div>
            </div>

            {review.analysis_summary && (
              <p className="rounded-2xl bg-gray-50 p-4 text-sm text-gray-700 leading-relaxed">
                {review.analysis_summary}
              </p>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-2xl border border-emerald-100 bg-emerald-50/50 p-4">
                <p className="text-xs font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <CheckCircleFilled /> {t('resumeReview.strengths')}
                </p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  {review.strengths.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
              <div className="rounded-2xl border border-amber-100 bg-amber-50/50 p-4">
                <p className="text-xs font-black text-amber-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                  <WarningFilled /> {t('resumeReview.suggestions')}
                </p>
                <ul className="text-sm text-gray-700 space-y-1 list-disc pl-5">
                  {review.suggestions.map((s, idx) => (
                    <li key={idx}>{s}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
};

export default ResumeReviewPage;
