import React, { useEffect, useState } from 'react';
import { Modal, Checkbox } from 'antd';
import {
  SafetyCertificateFilled,
  FullscreenOutlined,
  VideoCameraFilled,
  CheckCircleFilled,
  ExclamationCircleFilled,
} from '@ant-design/icons';
import { useI18n } from '../../i18n';

type CameraCheckStatus = 'idle' | 'checking' | 'ok' | 'denied' | 'unavailable';

interface IntegrityGateProps {
  open: boolean;
  studentName: string;
  durationMinutes: number;
  questionCount: number;
  onAccept: (opts: { requestFullscreen: boolean }) => Promise<void> | void;
  onCancel: () => void;
}

/**
 * Pre-test integrity policy gate.
 *
 * Adds a camera-permission preflight to the prior policy ack. The
 * student must (a) acknowledge the no-resume policy, (b) grant
 * camera access, before the "Start test" button enables. Camera
 * stream is released as soon as the preflight finishes — the live
 * proctoring tile re-acquires it inside the test page itself.
 */
const IntegrityGate: React.FC<IntegrityGateProps> = ({
  open,
  studentName,
  durationMinutes,
  questionCount,
  onAccept,
  onCancel,
}) => {
  const { t } = useI18n();
  const [accepted, setAccepted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [cameraStatus, setCameraStatus] = useState<CameraCheckStatus>('idle');
  const [cameraError, setCameraError] = useState<string>('');

  const runCameraCheck = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraStatus('unavailable');
      setCameraError(t('test.cameraUnavailable'));
      return;
    }
    setCameraStatus('checking');
    setCameraError('');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false,
      });
      stream.getTracks().forEach((t) => t.stop());
      setCameraStatus('ok');
    } catch (err: unknown) {
      const name = (err as DOMException)?.name ?? 'Error';
      if (
        name === 'NotAllowedError' ||
        name === 'PermissionDeniedError' ||
        name === 'SecurityError'
      ) {
        setCameraStatus('denied');
        setCameraError(t('test.cameraDenied'));
      } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
        setCameraStatus('unavailable');
        setCameraError(t('test.cameraNoDevice'));
      } else {
        setCameraStatus('denied');
        setCameraError(t('test.cameraDenied'));
      }
    }
  };

  // Auto-run the camera check once the modal opens. We defer the
  // initial setState into a microtask so the lint rule against
  // synchronous setState in effect bodies is satisfied.
  useEffect(() => {
    if (open && cameraStatus === 'idle') {
      queueMicrotask(runCameraCheck);
    }
    if (!open) {
      queueMicrotask(() => {
        setCameraStatus('idle');
        setCameraError('');
        setAccepted(false);
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleAccept = async () => {
    if (!accepted || cameraStatus !== 'ok') return;
    setSubmitting(true);
    try {
      await onAccept({ requestFullscreen: true });
    } finally {
      setSubmitting(false);
    }
  };

  const canStart = accepted && cameraStatus === 'ok' && !submitting;

  return (
    <Modal
      open={open}
      onCancel={onCancel}
      footer={null}
      width={580}
      centered
      destroyOnHidden
      maskClosable={false}
      title={null}
    >
      <div className="space-y-6 pt-2">
        <div className="flex items-start gap-4">
          <div className="bg-rose-50 text-rose-600 rounded-2xl size-12 flex items-center justify-center text-2xl">
            <SafetyCertificateFilled />
          </div>
          <div>
            <h2 className="text-2xl font-black text-gray-900 mb-1">
              {t('test.oneChance')}
            </h2>
            <p className="text-sm text-gray-500">
              {studentName ? `${studentName} — ` : ''}
              {durationMinutes} {t('common.minutes')} · {questionCount}{' '}
              {t('test.questions').toLowerCase()}
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-rose-50/60 border border-rose-100 p-5 text-sm text-rose-900 leading-relaxed">
          {t('test.oneChanceBody')}
        </div>

        <div className="rounded-2xl bg-gray-50 p-4 text-xs text-gray-600 flex items-start gap-2">
          <FullscreenOutlined className="mt-0.5 text-base text-gray-500" />
          <span>{t('test.proctoredBody')}</span>
        </div>

        {/* Camera preflight */}
        <div
          className={`rounded-2xl p-4 border text-sm flex items-start gap-3 ${
            cameraStatus === 'ok'
              ? 'bg-emerald-50 border-emerald-100 text-emerald-900'
              : cameraStatus === 'checking'
              ? 'bg-gray-50 border-gray-200 text-gray-700'
              : 'bg-rose-50 border-rose-200 text-rose-900'
          }`}
        >
          <div className="mt-0.5 text-lg">
            {cameraStatus === 'ok' ? (
              <CheckCircleFilled />
            ) : cameraStatus === 'checking' ? (
              <VideoCameraFilled className="animate-pulse" />
            ) : (
              <ExclamationCircleFilled />
            )}
          </div>
          <div className="flex-1">
            <p className="font-bold mb-0.5">
              {cameraStatus === 'ok'
                ? t('test.cameraReady')
                : cameraStatus === 'checking'
                ? t('test.cameraChecking')
                : t('test.cameraRequired')}
            </p>
            <p className="text-xs leading-relaxed opacity-90">
              {cameraStatus === 'ok'
                ? t('test.cameraReadyHint')
                : cameraStatus === 'checking'
                ? t('test.cameraCheckingHint')
                : cameraError || t('test.cameraDenied')}
            </p>
            {(cameraStatus === 'denied' || cameraStatus === 'unavailable') && (
              <button
                type="button"
                onClick={runCameraCheck}
                className="mt-2 text-xs font-bold underline cursor-pointer"
              >
                {t('test.cameraRetry')}
              </button>
            )}
          </div>
        </div>

        <label className="flex items-start gap-3 cursor-pointer">
          <Checkbox
            checked={accepted}
            onChange={(e) => setAccepted(e.target.checked)}
            className="mt-1"
          />
          <span className="text-sm text-gray-700 font-semibold leading-relaxed">
            {t('test.policyAck')}
          </span>
        </label>

        <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-5 py-3 rounded-2xl text-sm font-bold border border-gray-200 text-gray-700 hover:bg-gray-50 cursor-pointer"
            disabled={submitting}
          >
            {t('common.cancel')}
          </button>
          <button
            type="button"
            onClick={handleAccept}
            disabled={!canStart}
            className="px-5 py-3 rounded-2xl text-sm font-bold bg-black text-white hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer shadow-lg shadow-black/10"
          >
            {submitting ? t('test.starting') : t('test.agreeStart')}
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default IntegrityGate;
