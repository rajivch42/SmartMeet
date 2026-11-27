/**
 * Resilient Google Meet selectors.
 * Uses ARIA labels, semantic roles, text content, and known class fallbacks.
 */

export const SELECTORS = {
  // Guest Lobby / Pre-join
  nameInput: [
    'input[aria-label*="Your name" i]',
    'input[aria-label*="name" i]',
    'input[placeholder*="Your name" i]',
    'input[type="text"]',
  ],

  // Microphone and Camera toggles before joining
  micToggle: [
    'button[aria-label*="turn off microphone" i]',
    'button[aria-label*="microphone" i]',
    'div[data-is-muted="false"][aria-label*="microphone" i]',
  ],
  cameraToggle: [
    'button[aria-label*="turn off camera" i]',
    'button[aria-label*="camera" i]',
    'div[data-is-muted="false"][aria-label*="camera" i]',
  ],

  // Join Action Buttons
  askToJoinButton: [
    'button:has-text("Ask to join")',
    'button:has-text("Ask to Join")',
    'button:has-text("Join now")',
    'button:has-text("Join Now")',
    'button[jsname="Qx7uuf"]',
  ],

  // In-call verification (elements that ONLY exist once admitted)
  inCallMarkers: [
    'button[aria-label*="Leave call" i]',
    'button[aria-label*="leave call" i]',
    'button[aria-label*="Turn off microphone" i]',
    'button[aria-label*="Turn on microphone" i]',
    'button[aria-label*="Chat with everyone" i]',
  ],

  // Denied / Ejected modals (Google Meet shows 'Return to home screen' button when denied/ended)
  deniedMarkers: [
    'button:has-text("Return to home screen")',
    'button:has-text("Return to home")',
    'a:has-text("Return to home screen")',
    'div[role="alertdialog"] button:has-text("Return")',
  ],

  // Captions button in call toolbar
  captionButton: [
    'button[aria-label*="Turn on captions" i]',
    'button[aria-label*="turn on captions" i]',
    'button[aria-label*="captions" i]',
    'button[data-tooltip*="captions" i]',
  ],

  // Captions stream containers
  captionContainers: [
    'div[aria-live="polite"]',
    'div[jsname="YSvy7"]',
    'div.nMxBNf',
    'div.iTTPOb',
  ],
};
