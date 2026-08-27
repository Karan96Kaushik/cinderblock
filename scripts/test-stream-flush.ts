/**
 * Verifies Lambda stream padding is stripped and does not leak into chat text.
 * Usage: npx tsx scripts/test-stream-flush.ts
 */
import { STREAM_FLUSH_PAD, stripStreamFlushPad } from '../lib/ai-chat/stream-flush'
import { parseAssistantPayload } from '../lib/ai-chat/parse-sentinels'

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

const wireSize = Buffer.byteLength(STREAM_FLUSH_PAD, 'utf8')
assert(wireSize >= 70_000, `flush pad must be >= 70KB on the wire, got ${wireSize}`)

assert(stripStreamFlushPad('Hello') === 'Hello', 'plain text is unchanged')
assert(stripStreamFlushPad(STREAM_FLUSH_PAD) === '', 'pure padding is dropped')
assert(
  stripStreamFlushPad(`Hi${STREAM_FLUSH_PAD} there`) === 'Hi there',
  'padding between tokens is dropped',
)

const decoder = new TextDecoder()
const encoder = new TextEncoder()
const mixed = encoder.encode(`Want me to apply these?${STREAM_FLUSH_PAD}`)
const mid = Math.floor(mixed.byteLength / 2)
const first = decoder.decode(mixed.slice(0, mid), { stream: true })
const second = decoder.decode(mixed.slice(mid), { stream: true }) + decoder.decode()
const assembled = stripStreamFlushPad(first) + stripStreamFlushPad(second)
assert(assembled === 'Want me to apply these?', `split UTF-8 chunks leaked padding: ${JSON.stringify(assembled)}`)

const live = parseAssistantPayload(
  'Here is the swap I recommend.\n\n<<SUMMARY>>user wants dumbbell bench<<END_SUMMARY>>',
  { streaming: true },
)
assert(
  live.displayText.includes('swap I recommend'),
  'visible reply must not wait on a trailing summary',
)

const hidden = parseAssistantPayload('<<SUMMARY>>still thinking', { streaming: true })
assert(hidden.displayText === '', 'incomplete leading summary stays hidden while streaming')

console.log('stream-flush checks passed')
