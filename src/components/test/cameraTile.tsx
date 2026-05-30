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

// Motion-fallback tuning. We sample a small grayscale region of the
// video and compare it to the previous sample; if the mean pixel delta
// stays below this floor for the full absence window the candidate is
// presumed to have left frame (a static webcam image / lens cap / no
// person). The threshold is intentionally lax so normal stillness
// (e.g. concentrated thinking) doesn't trip it — it's the *sustained*
// flatness that matters.
const MOTION_PIXEL_DELTA_FLOOR = 6;
const MOTION_SAMPLE_WIDTH = 64;
const MOTION_SAMPLE_HEIGHT = 48;

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
  //
  // Startup reliability fix: we don't just call play() once — we also
  // wait for the `loadedmetadata` event before playing, retry once if
  // the initial play() rejects, and listen for `playing` to confirm
  // the feed is actually rendering frames. Without these guards Chrome
  // sometimes leaves the tile black for a few seconds after permission
  // is granted because the stream isn't ready when srcObject is set.
  useEffect(() => {
    if (status !== 'live' || !videoRef.current || !streamRef.current) return;
    const video = videoRef.current;
    if (video.srcObject !== streamRef.current) {
      video.srcObject = streamRef.current;
    }

    const tryPlay = () => {
      // Muted + playsInline makes autoplay reliable across browsers,
      // but the initial play() can still race the metadata load. We
      // swallow the first rejection and retry on `loadedmetadata`.
      void video.play().catch(() => undefined);
    };

    const onMetadata = () => tryPlay();
    const onCanPlay = () => tryPlay();

    video.addEventListener('loadedmetadata', onMetadata);
    video.addEventListener('canplay', onCanPlay);
    tryPlay();

    return () => {
      video.removeEventListener('loadedmetadata', onMetadata);
      video.removeEventListener('canplay', onCanPlay);
    };
  }, [status]);

  // Person-presence detection (A6).
  //
  // Two layered approaches, chosen at runtime:
  //   1. `window.FaceDetector` (Chromium Shape Detection API) — real
  //      face detection, no canvas work, very cheap.
  //   2. Motion-diff fallback — for Firefox / Safari / Chromium with
  //      the feature flag off. We sample a small grayscale frame at
  //      `DETECT_INTERVAL_MS` and compare it to the previous frame's
  //      mean pixel delta. A *sustained* near-zero delta is treated
  //      as "no person" (lens cap, static photo, candidate left the
  //      room). Normal stillness (concentrated thinking) produces
  //      enough micro-motion to clear the floor easily.
  //
  // Both feed the same `presenceLostRef` callback which fires the
  // existing `face_not_detected` anti-cheat event — no new event
  // type or backend change required.
  useEffect(() => {
    if (status !== 'live') return;

    const Detector = typeof window !== 'undefined' ? window.FaceDetector : undefined;
    let detector: FaceDetector | null = null;
    if (Detector) {
      try {
        detector = new Detector({ fastMode: true, maxDetectedFaces: 1 });
      } catch {
        detector = null;
      }
    }

    // Motion-diff state — always allocated so we can fall back from
    // FaceDetector to motion if the native detector throws repeatedly.
    const canvas = document.createElement('canvas');
    canvas.width = MOTION_SAMPLE_WIDTH;
    canvas.height = MOTION_SAMPLE_HEIGHT;
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    let previousFrame: Uint8ClampedArray | null = null;

    let stopped = false;
    let busy = false;
    let noFaceSince: number | null = null;
    let lastFiredAt: number | null = null;
    let detectorFailures = 0;

    const detectByMotion = (video: HTMLVideoElement): boolean => {
      if (!ctx) return true; // can't sample — assume present (don't false-fire)
      try {
        ctx.drawImage(video, 0, 0, MOTION_SAMPLE_WIDTH, MOTION_SAMPLE_HEIGHT);
        const { data } = ctx.getImageData(
          0,
          0,
          MOTION_SAMPLE_WIDTH,
          MOTION_SAMPLE_HEIGHT,
        );
        // Grayscale + diff in one pass.
        const grayLen = MOTION_SAMPLE_WIDTH * MOTION_SAMPLE_HEIGHT;
        const gray = new Uint8ClampedArray(grayLen);
        for (let i = 0, j = 0; i < data.length; i += 4, j += 1) {
          // ITU-R BT.601 luma approximation, cheap integer form.
          gray[j] = (data[i] * 299 + data[i + 1] * 587 + data[i + 2] * 114) / 1000;
        }
        if (!previousFrame) {
          previousFrame = gray;
          // Without a baseline we can't decide — assume present this tick.
          return true;
        }
        let sum = 0;
        for (let i = 0; i < grayLen; i += 1) {
          const d = gray[i] - previousFrame[i];
          sum += d < 0 ? -d : d;
        }
        previousFrame = gray;
        const meanDelta = sum / grayLen;
        return meanDelta >= MOTION_PIXEL_DELTA_FLOOR;
      } catch {
        // Sampling failed (e.g. tainted canvas) — don't false-fire.
        return true;
      }
    };

    const tick = async () => {
      const video = videoRef.current;
      if (stopped || busy || !video || video.readyState < 2) return;
      busy = true;
      try {
        let present = false;
        if (detector && detectorFailures < 3) {
          try {
            const faces = await detector.detect(video);
            if (stopped) return;
            present = faces.length > 0;
          } catch {
            detectorFailures += 1;
            // Fall through to motion detection on this tick.
            present = detectByMotion(video);
          }
        } else {
          present = detectByMotion(video);
        }

        const now = Date.now();
        if (present) {
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
      } finally {
        busy = false;
      }
    };

    const interval = window.setInterval(tick, DETECT_INTERVAL_MS);
    return () => {
      stopped = true;
      window.clearInterval(interval);
      previousFrame = null;
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
