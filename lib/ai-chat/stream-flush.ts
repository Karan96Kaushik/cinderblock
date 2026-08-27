/**
 * Lambda Function URL RESPONSE_STREAM buffers small writes and only flushes
 * when the chunk is large (~70–100 KB) or the stream ends. Token deltas are
 * tens of bytes, so without padding the client receives the entire reply in
 * one shot — the chat bubble shows "…" and then the full message appears.
 *
 * Pad each flush with a zero-width filler the browser strips. ZWSP is 3 bytes
 * in UTF-8; ~34k of them is ~102 KB on the wire.
 */
export const STREAM_FLUSH_CHAR = '\u200b'

/** ~102 KiB UTF-8. Reused for every flush; do not rebuild per token. */
export const STREAM_FLUSH_PAD = STREAM_FLUSH_CHAR.repeat(34_000)

export function stripStreamFlushPad(chunk: string): string {
  if (!chunk.includes(STREAM_FLUSH_CHAR)) return chunk
  return chunk.replace(/\u200b/g, '')
}
