// Severity values mirror the backend (see utils/integrity.py). Keeping
// the client list in sync makes our local toast / banner copy correct
// before the round-trip completes, but the authoritative severity is
// always assigned server-side.
export type IntegritySeverity = 'high' | 'medium' | 'low' | 'info';

export type IntegrityEventType =
  | 'policy_accepted'
  | 'fullscreen_entered'
  | 'fullscreen_exit'
  | 'fullscreen_request_denied'
  | 'tab_blur'
  | 'tab_hidden'
  | 'tab_hidden_long'
  | 'window_blur'
  | 'copy_blocked'
  | 'paste_blocked'
  | 'right_click_blocked'
  | 'selection_blocked'
  | 'drag_blocked'
  | 'screenshot_keyshortcut'
  | 'keyboard_shortcut_blocked'
  | 'devtools_suspected'
  | 'page_unload_attempt'
  | 'network_offline'
  | 'multiple_displays_suspected'
  | 'face_not_detected';

export const EVENT_SEVERITY_HINT: Record<string, IntegritySeverity> = {
  fullscreen_exit: 'high',
  devtools_suspected: 'high',
  tab_hidden_long: 'high',
  page_unload_attempt: 'high',
  multiple_displays_suspected: 'high',
  tab_blur: 'medium',
  tab_hidden: 'medium',
  window_blur: 'medium',
  paste_blocked: 'medium',
  copy_blocked: 'medium',
  right_click_blocked: 'medium',
  screenshot_keyshortcut: 'medium',
  network_offline: 'medium',
  selection_blocked: 'low',
  drag_blocked: 'low',
  keyboard_shortcut_blocked: 'low',
  policy_accepted: 'low',
  fullscreen_entered: 'low',
  fullscreen_request_denied: 'low',
  face_not_detected: 'high',
};

export const HUMAN_LABELS: Record<string, string> = {
  fullscreen_exit: 'Exited fullscreen',
  devtools_suspected: 'Developer tools detected',
  tab_hidden_long: 'Left the test tab for too long',
  page_unload_attempt: 'Tried to leave the page',
  multiple_displays_suspected: 'Multiple displays detected',
  tab_blur: 'Switched away from the tab',
  tab_hidden: 'Tab hidden',
  window_blur: 'Window lost focus',
  paste_blocked: 'Paste blocked',
  copy_blocked: 'Copy blocked',
  right_click_blocked: 'Right-click blocked',
  screenshot_keyshortcut: 'Screenshot shortcut blocked',
  network_offline: 'Network went offline',
  selection_blocked: 'Text selection blocked',
  drag_blocked: 'Drag blocked',
  keyboard_shortcut_blocked: 'Keyboard shortcut blocked',
  policy_accepted: 'Integrity policy accepted',
  fullscreen_entered: 'Entered fullscreen',
  fullscreen_request_denied: 'Fullscreen request denied',
  face_not_detected: 'No face detected in camera',
};
