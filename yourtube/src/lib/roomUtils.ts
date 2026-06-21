/**
 * Generates a unique 8-character room ID.
 * Uses unambiguous characters (no 0/O/1/I).
 */
export function generateRoomId(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  return Array.from({ length: 8 }, () =>
    chars[Math.floor(Math.random() * chars.length)]
  ).join("");
}

/**
 * Copies the invite link to the user's clipboard.
 * @param roomId Room code to embed in the URL.
 */
export async function copyInviteLink(roomId: string): Promise<boolean> {
  const link = `${window.location.origin}/watch-together/${roomId}`;
  try {
    await navigator.clipboard.writeText(link);
    return true;
  } catch {
    return false;
  }
}

/**
 * Returns whether the current browser supports screen sharing.
 */
export function supportsScreenShare(): boolean {
  return typeof navigator?.mediaDevices?.getDisplayMedia === "function";
}

/**
 * Returns whether the current browser supports MediaRecorder.
 */
export function supportsRecording(): boolean {
  return typeof MediaRecorder !== "undefined";
}
