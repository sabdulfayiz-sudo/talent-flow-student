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
  // A6: fired when no face has been visible for a sustained window, and
  // re-fired periodically while the face stays absent so prolonged
  // absence escalates toward the anti-cheat hard-stop.
  onPresenceLost?: (absentForMs: number) => void;
  // Fired once when a face reappears after an absence.
  onPresenceRestored?: () => void;
}

// Presence-detection tuning (A6).
const DETECT_INTERVAL_MS = 2000;
const ABSENCE_THRESHOLD_MS = 10_000;
const REFIRE_INTERVAL_MS = 15_000;

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
const CameraTile: React.FC<CameraTileProps> = ({
  enabled,
  onStatusChange,
  onPresenceLost,
  onPresenceRestored,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [status, setStatus] = useState<CameraStatus>('idle');
  const [error, setError] = useState<string>('');
  // null = unknown / detection unsupported; true/false once detection runs.
  const [facePresent, setFacePresent] = useState<boolean | null>(null);

  // Keep the latest callbacks in refs so the detection loop never needs to
  // restart when the parent re-renders with new closures.
  const presenceLostRef = useRef(onPresenceLost);
  const presenceRestoredRef = useRef(onPresenceRestored);
  useEffect(() => {
    presenceLostRef.current = onPresenceLost;
    presenceRestoredRef.current = onPresenceRestored;
  });

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
        // NB: do not attach to the <video> here — it isn't mounted until
        // status flips to 'live'. A dedicated effect attaches the stream
        // once the element exists (fixes the black-feed bug).
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

  // Attach the stream to the <video> once it is actually mounted (status
  // === 'live'), and kick off autoplay. Without this the srcObject was set
  // before the element existed, leaving a black tile.
  useEffect(() => {
    if (status !== 'live' || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    if (video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
    }
    // Autoplay can reject (e.g. policy); muted+playsInline makes it reliable.
    void video.play().catch(() => undefined);
  }, [status]);

  // Face presence detection (A6) using the browser FaceDetector API where
  // available. Absence beyond a sustained window raises an anti-cheat
  // event via onPresenceLost. Unsupported browsers skip detection silently
  // (camera presence is still required to start the test).
  useEffect(() => {
    if (status !== 'live') return;
    const Detector = typeof window !== 'undefined' ? window.FaceDetector : undefined;
    // Detection unsupported — leave facePresent as-is (the camera-present
    // requirement still gates test start).
    if (!Detector) return;

    let detector: FaceDetector;
    try {
      detector = new Detector({ fastMode: true, maxDetectedFaces: 1 });
    } catch {
      return;
    }

    let stopped = false;
    let busy = false;
    let noFaceSince: number | null = null;
    let lastFiredAt: number | null = null;

    const tick = async () => {
      const video = videoRef.current;
      if (stopped || busy || !video || video.readyState < 2) return;
      busy = true;
      try {
        const faces = await detector.detect(video);
        if (stopped) return;
        const now = Date.now();
        if (faces.length > 0) {
          if (noFaceSince !== null) presenceRestoredRef.current?.();
          noFaceSince = null;
          lastFiredAt = null;
          setFacePresent(true);
        } else {
          if (noFaceSince === null) noFaceSince = now;
          const absentFor = now - noFaceSince;
          if (absentFor >= ABSENCE_THRESHOLD_MS) {
            setFacePresent(false);
            if (lastFiredAt === null || now - lastFiredAt >= REFIRE_INTERVAL_MS) {
              lastFiredAt = now;
              presenceLostRef.current?.(absentFor);
            }
          }
        }
      } catch {
        // Detection errors are non-fatal — skip this tick.
      } finally {
        busy = false;
      }
    };

    const interval = window.setInterval(tick, DETECT_INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearInterval(interval);
    };
  }, [status]);

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

        {status === 'live' && facePresent === false && (
          <div className="absolute inset-x-0 bottom-0 bg-rose-600/90 px-2 py-1">
            <p className="text-[10px] font-bold text-white uppercase tracking-widest text-center">
              No face detected
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default CameraTile;
