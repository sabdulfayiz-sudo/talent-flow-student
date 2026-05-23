import React, { useEffect, useRef, useState } from 'react';
import { VideoCameraFilled, ExclamationCircleFilled } from '@ant-design/icons';

export type CameraStatus =
  | 'idle'
  | 'requesting'
  | 'live'
  | 'denied'
  | 'unavailable'
  | 'error';

interface CameraTileProps {
  enabled: boolean;
  onStatusChange?: (status: CameraStatus, error?: string) => void;
}

/**
 * Live webcam preview pinned to the top-left of the test viewport.
 *
 * The tile is intentionally small (192x144) — the goal is proctoring
 * presence, not high-resolution video. We never record or upload the
 * stream; this is a UX trust signal for the student that the test is
 * being observed.
 *
 * Behaviour:
 *  - On mount with `enabled=true`, we request `getUserMedia({video})`.
 *  - On permission denial / no camera / hardware error we surface a
 *    descriptive status so the parent can refuse to start the test.
 *  - On unmount we stop every track.
 */
const CameraTile: React.FC<CameraTileProps> = ({ enabled, onStatusChange }) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    onStatusChange?.(status, error);
  }, [status, error, onStatusChange]);

  useEffect(() => {
    let cancelled = false;
    const stopTracks = () => {
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };

    if (!enabled) {
      stopTracks();
      queueMicrotask(() => {
        if (!cancelled) setStatus('idle');
      });
      return () => {
        cancelled = true;
        stopTracks();
      };
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      queueMicrotask(() => {
        if (cancelled) return;
        setStatus('unavailable');
        setError('Camera API is not available in this browser.');
      });
      return () => {
        cancelled = true;
        stopTracks();
      };
    }

    queueMicrotask(() => {
      if (!cancelled) setStatus('requesting');
    });
    navigator.mediaDevices
      .getUserMedia({ video: { width: 320, height: 240 }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
        }
        setStatus('live');
        setError('');
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = (err as DOMException)?.name ?? 'Error';
        const message = (err as Error)?.message ?? String(err);
        if (
          name === 'NotAllowedError' ||
          name === 'PermissionDeniedError' ||
          name === 'SecurityError'
        ) {
          setStatus('denied');
          setError('Camera access was denied. Allow camera and reload.');
        } else if (name === 'NotFoundError' || name === 'OverconstrainedError') {
          setStatus('unavailable');
          setError('No camera detected on this device.');
        } else {
          setStatus('error');
          setError(message);
        }
      });

    return () => {
      cancelled = true;
      stopTracks();
    };
  }, [enabled]);

  if (!enabled || status === 'idle') return null;

  return (
    <div className="fixed top-4 left-4 z-50 select-none">
      <div className="relative rounded-2xl overflow-hidden border border-gray-800 bg-black shadow-xl shadow-black/40 ring-2 ring-rose-500/60 w-48 h-36">
        {status === 'live' ? (
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full flex flex-col items-center justify-center px-3 text-center bg-gradient-to-br from-rose-900 to-rose-700">
            {status === 'requesting' ? (
              <>
                <VideoCameraFilled className="text-3xl text-white mb-2 animate-pulse" />
                <p className="text-[11px] font-bold text-white uppercase tracking-widest">
                  Requesting camera…
                </p>
              </>
            ) : (
              <>
                <ExclamationCircleFilled className="text-3xl text-rose-100 mb-2" />
                <p className="text-[11px] font-bold text-white uppercase tracking-widest mb-1">
                  Camera {status === 'denied' ? 'denied' : 'unavailable'}
                </p>
                <p className="text-[10px] text-rose-100 leading-snug">{error}</p>
              </>
            )}
          </div>
        )}

        {status === 'live' && (
          <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur-sm px-2 py-0.5 rounded-full">
            <span className="size-1.5 rounded-full bg-rose-500 animate-pulse" />
            <span className="text-[9px] font-bold text-white uppercase tracking-widest">
              Proctored
            </span>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraTile;
