import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../lib/api';
import type { IntegrityEventType, IntegritySeverity } from '../types/integrity';
import { EVENT_SEVERITY_HINT } from '../types/integrity';

// Backend severity enum is `info | warn | critical`. The local hint
// uses `high | medium | low | info` to drive client penalty math; we
// collapse it down to the wire enum here.
const WIRE_SEVERITY: Record<IntegritySeverity, 'info' | 'warn' | 'critical'> = {
  high: 'critical',
  medium: 'warn',
  low: 'info',
  info: 'info',
};

export interface IntegrityViolation {
  id: string;
  type: IntegrityEventType | string;
  severity: IntegritySeverity;
  at: number;
  metadata?: Record<string, unknown>;
}

export interface UseAntiCheatOptions {
  sessionId?: string;
  enabled: boolean;
  // When true (default), copy/paste/right-click/keyboard shortcuts call
  // `preventDefault()`. When false, events are logged only — use this
  // for non-graded practice mode.
  strict?: boolean;
  // Threshold (penalty points) at which we hard-stop the session and tell
  // the parent to auto-submit. Mirrors the backend's flag threshold.
  hardStopPenalty?: number;
  // Threshold (penalty points) at which we show a stern warning banner.
  warnPenalty?: number;
  // Called when penalty crosses hardStopPenalty so the parent can auto-
  // submit. Called at most once per session.
  onHardStop?: (violations: IntegrityViolation[]) => void;
  // Called on every recorded violation so the parent can show a toast.
  onViolation?: (violation: IntegrityViolation) => void;
}

const PENALTY: Record<IntegritySeverity, number> = {
  high: 20,
  medium: 5,
  low: 1,
  info: 0,
};

const safeRandomId = () => {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
};

/**
 * Browser-side anti-cheat / integrity hook used by the test page.
 *
 * What this does in strict mode (the default for live tests):
 *  - BLOCKS copy / cut / paste / right-click / drag / text-selection
 *    via `preventDefault()` and logs the attempt,
 *  - BLOCKS Ctrl/Cmd+C/V/X/P/S/U/A, F12, Ctrl+Shift+I/J/C, and
 *    PrintScreen,
 *  - listens to visibility / window blur to detect tab switching
 *    (which the backend treats as a hard policy failure),
 *  - runs a lightweight devtools-open heuristic and a multi-display
 *    heuristic (also hard policy failures on the server),
 *  - mirrors every event up to the backend so admins can audit flagged
 *    sessions,
 *  - tracks a local penalty score so the UI can warn before the backend
 *    flags or zero-scores.
 *
 * What it explicitly does NOT do:
 *  - it does not stop a second device / phone / OCR — the watermark in
 *    TestPage and the server-side question shuffle handle those instead,
 *  - it does not stop remote-control software.
 *
 * Pass `strict={false}` for a logging-only mode (e.g. for the
 * `/practice` page where students aren't being graded).
 */
export const useAntiCheat = (options: UseAntiCheatOptions) => {
  const {
    sessionId,
    enabled,
    strict = true,
    hardStopPenalty = 40,
    warnPenalty = 20,
    onHardStop,
    onViolation,
  } = options;

  const [violations, setViolations] = useState<IntegrityViolation[]>([]);
  const [penalty, setPenalty] = useState(0);
  const [warning, setWarning] = useState<string | null>(null);
  const hardStopFiredRef = useRef(false);
  const queueRef = useRef<IntegrityViolation[]>([]);
  const flushTimerRef = useRef<number | null>(null);
  const hiddenAtRef = useRef<number | null>(null);

  const flushQueue = () => {
    if (!sessionId) return;
    const batch = queueRef.current.splice(0, queueRef.current.length);
    if (!batch.length) return;
    // Send sequentially-ish; we don't await because the test UI shouldn't
    // wait on integrity reporting. Errors are swallowed because a flaky
    // network shouldn't block the student. The backend may respond with
    // `{finished: true}` on a strike threshold breach — if so we trip
    // the hard-stop callback so the parent can navigate away.
    batch.forEach((v) => {
      apiFetch<{ finished?: boolean; reason?: string; strikes?: number }>(
        `/testing/sessions/${sessionId}/events`,
        {
          method: 'POST',
          body: JSON.stringify({
            event_type: v.type,
            severity: WIRE_SEVERITY[v.severity],
            payload: v.metadata ?? {},
          }),
        },
      )
        .then((response) => {
          if (response?.finished && !hardStopFiredRef.current) {
            hardStopFiredRef.current = true;
            setWarning(response.reason ?? 'Session ended by anti-cheat policy.');
            setTimeout(() => onHardStop?.(violations), 0);
          }
        })
        .catch(() => {
          // swallow — integrity reporting is best-effort.
        });
    });
  };

  const reportEvent = (
    type: IntegrityEventType | string,
    metadata?: Record<string, unknown>,
  ) => {
    if (!enabled) return;
    const severity: IntegritySeverity = EVENT_SEVERITY_HINT[type] ?? 'info';
    const violation: IntegrityViolation = {
      id: safeRandomId(),
      type,
      severity,
      at: Date.now(),
      metadata,
    };
    setViolations((prev) => [...prev, violation]);
    setPenalty((prev) => {
      const next = prev + PENALTY[severity];
      if (next >= hardStopPenalty && !hardStopFiredRef.current) {
        hardStopFiredRef.current = true;
        setWarning(
          'You have exceeded the allowed number of integrity violations. Your test will be submitted automatically.',
        );
        // Defer to next tick so React state updates settle first.
        setTimeout(() => onHardStop?.([...violations, violation]), 0);
      } else if (next >= warnPenalty && severity !== 'info' && severity !== 'low') {
        setWarning(
          'Multiple integrity warnings detected. The next major violation will auto-submit your test.',
        );
      }
      return next;
    });
    onViolation?.(violation);
    if (sessionId) {
      queueRef.current.push(violation);
      if (flushTimerRef.current) {
        window.clearTimeout(flushTimerRef.current);
      }
      // Batch sends so a noisy event (e.g. paste spam) doesn't fire a
      // request per keystroke.
      flushTimerRef.current = window.setTimeout(flushQueue, 250);
    }
  };

  // We need a stable closure inside the effect; this ref always points
  // to the latest reportEvent so listeners don't go stale.
  const reportEventRef = useRef(reportEvent);
  useEffect(() => {
    reportEventRef.current = reportEvent;
  });

  useEffect(() => {
    if (!enabled) return;

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenAtRef.current = Date.now();
        reportEventRef.current('tab_hidden');
      } else if (hiddenAtRef.current) {
        const awayMs = Date.now() - hiddenAtRef.current;
        hiddenAtRef.current = null;
        if (awayMs > 10_000) {
          reportEventRef.current('tab_hidden_long', { away_ms: awayMs });
        }
      }
    };

    const handleBlur = () => {
      reportEventRef.current('window_blur');
    };
    const handleFocus = () => {
      // not a violation; useful in metadata only.
    };

    const handleCopy = (e: ClipboardEvent) => {
      if (strict) e.preventDefault();
      reportEventRef.current('copy_blocked');
    };
    const handleCut = (e: ClipboardEvent) => {
      if (strict) e.preventDefault();
      reportEventRef.current('copy_blocked', { variant: 'cut' });
    };
    const handlePaste = (e: ClipboardEvent) => {
      // Allow paste inside text inputs that opt-in via the
      // `data-allow-paste` attribute (e.g. AI interview chat input).
      const target = e.target as HTMLElement | null;
      const allowPaste = target?.closest?.('[data-allow-paste]');
      if (strict && !allowPaste) e.preventDefault();
      reportEventRef.current('paste_blocked');
    };
    const handleContextMenu = (e: MouseEvent) => {
      if (strict) e.preventDefault();
      reportEventRef.current('right_click_blocked');
    };
    const handleSelectStart = (e: Event) => {
      // Selection is still allowed inside form inputs / chat boxes so
      // students can edit their own answers; we only block when the
      // selection starts on a non-editable surface.
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);
      if (strict && !isEditable) e.preventDefault();
      reportEventRef.current('selection_blocked');
    };
    const handleDragStart = (e: DragEvent) => {
      if (strict) e.preventDefault();
      reportEventRef.current('drag_blocked');
    };
    const handleBeforeUnload = () => {
      // No `preventDefault` here — the no-resume policy means leaving
      // the page just ends the test. The parent component fires the
      // /abandon beacon in its own beforeunload handler.
      reportEventRef.current('page_unload_attempt');
    };
    const handleOffline = () => {
      reportEventRef.current('network_offline');
    };
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        reportEventRef.current('fullscreen_exit');
      } else {
        reportEventRef.current('fullscreen_entered');
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      const ctrlOrMeta = e.ctrlKey || e.metaKey;
      const target = e.target as HTMLElement | null;
      const isEditable =
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'TEXTAREA' ||
          target.isContentEditable);

      if (
        key === 'f12' ||
        (ctrlOrMeta && e.shiftKey && ['i', 'j', 'c'].includes(key))
      ) {
        if (strict) e.preventDefault();
        reportEventRef.current('devtools_suspected', { key });
        return;
      }
      if (key === 'printscreen') {
        reportEventRef.current('screenshot_keyshortcut');
        return;
      }
      // `Escape` exits fullscreen which the backend treats as a hard
      // policy failure. We can't truly preventDefault the browser's
      // ESC-to-exit-fullscreen, but we log the attempt so the report
      // shows the cause clearly.
      if (key === 'escape' && document.fullscreenElement) {
        reportEventRef.current('fullscreen_exit_attempt');
      }
      // Block view-source / print / save / select-all. Allow Ctrl+C / V
      // / X inside text inputs so students can still edit their own
      // answers.
      if (ctrlOrMeta && ['s', 'u', 'p'].includes(key)) {
        if (strict) e.preventDefault();
        reportEventRef.current('keyboard_shortcut_blocked', { key });
        return;
      }
      if (ctrlOrMeta && ['c', 'x', 'v', 'a'].includes(key)) {
        if (strict && !isEditable) e.preventDefault();
        reportEventRef.current('keyboard_shortcut_blocked', { key });
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('copy', handleCopy);
    document.addEventListener('cut', handleCut);
    document.addEventListener('paste', handlePaste);
    document.addEventListener('contextmenu', handleContextMenu);
    document.addEventListener('selectstart', handleSelectStart);
    document.addEventListener('dragstart', handleDragStart);
    window.addEventListener('beforeunload', handleBeforeUnload);
    window.addEventListener('offline', handleOffline);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('keydown', handleKeyDown, true);

    // Detect mobile / touch-only devices. The backend also blocks
    // these at session-start (see SMALL BUG FIXES on backend), but we
    // emit the event so the audit log records the attempted device.
    const isMobile = /android|iphone|ipod|ipad|mobile|windows phone|opera mini/i.test(
      navigator.userAgent,
    );
    if (isMobile) {
      reportEventRef.current('mobile_device_blocked', {
        user_agent: navigator.userAgent,
      });
    }

    // Devtools-open heuristic: the difference between outerWidth and
    // innerWidth (or outerHeight / innerHeight) jumps when the panel
    // docks. False positives exist (split-view browsers); we keep the
    // threshold generous and only fire once per minute.
    let devtoolsAt = 0;
    const devtoolsTimer = window.setInterval(() => {
      const widthDelta = window.outerWidth - window.innerWidth;
      const heightDelta = window.outerHeight - window.innerHeight;
      if (widthDelta > 200 || heightDelta > 200) {
        if (Date.now() - devtoolsAt > 60_000) {
          devtoolsAt = Date.now();
          reportEventRef.current('devtools_suspected', {
            width_delta: widthDelta,
            height_delta: heightDelta,
          });
        }
      }
    }, 2_500);

    // Multi-display heuristic — only available behind a permissions
    // prompt in some browsers, so we just inspect window.screen.isExtended
    // when present. Same one-per-minute throttle.
    let displaysAt = 0;
    const displaysTimer = window.setInterval(() => {
      const screenAny = window.screen as Screen & { isExtended?: boolean };
      if (screenAny.isExtended) {
        if (Date.now() - displaysAt > 60_000) {
          displaysAt = Date.now();
          reportEventRef.current('multiple_displays_suspected', {
            available_width: window.screen.availWidth,
            available_height: window.screen.availHeight,
          });
        }
      }
    }, 5_000);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('copy', handleCopy);
      document.removeEventListener('cut', handleCut);
      document.removeEventListener('paste', handlePaste);
      document.removeEventListener('contextmenu', handleContextMenu);
      document.removeEventListener('selectstart', handleSelectStart);
      document.removeEventListener('dragstart', handleDragStart);
      window.removeEventListener('beforeunload', handleBeforeUnload);
      window.removeEventListener('offline', handleOffline);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('keydown', handleKeyDown, true);
      window.clearInterval(devtoolsTimer);
      window.clearInterval(displaysTimer);
      if (flushTimerRef.current) window.clearTimeout(flushTimerRef.current);
      flushQueue();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [enabled, strict]);

  // Make sure pending events flush when the session id arrives after
  // the listeners are already running.
  useEffect(() => {
    if (sessionId && queueRef.current.length) {
      flushQueue();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  return {
    violations,
    penalty,
    warning,
    reportEvent,
    integrityScore: Math.max(0, 100 - penalty),
  };
};
