# Cinderblock — AI Workout Chat Integration Plan

## Goal

Let signed-in users converse with an AI (in plain text) to understand, edit, or create their workout plan. Once the user confirms the plan, a separate structured-output call converts the finalized plaintext into the app's JSON plan schema, validates it, and saves it. On hard failure, package the session for developer review.

**Key decisions locked in:**
- LLM: **Cerebras** (reuse `lib/cerebras`), used for both the chat and the JSON extraction call.
- Chat responses: **streamed** to the UI.
- Feature requires **Supabase sign-in** (no anonymous/local-only usage).
- Context sent to the chat endpoint per turn: **last 7 turns + a running plaintext summary** (not full history).
- Draft state: **plaintext is source of truth during the chat.** JSON is only generated on Save, not every turn.

---

## 1. High-level architecture

```
Frontend (React)                    Amplify (Lambda)                  External
─────────────────                   ─────────────────                 ────────
useWorkoutAIChat hook  ──POST──►    /ai-chat (streaming)      ──►     Cerebras (stream)
  (plaintext draft,                  - verify Supabase JWT
   running summary,                  - build system prompt
   localStorage)                     - proxy SSE stream back
       │
       │ on "Save"
       ▼
Save handler          ──POST──►     /ai-extract-json          ──►     Cerebras (JSON mode)
  (plaintext + summary)              - verify Supabase JWT
                                     - force JSON output
                                     - validate against schema
                                     - 1 retry w/ validator errors
       │
       │ on hard failure
       ▼
Report button         ──POST──►     /report-issue             ──►     Supabase (service key)
  (chat history +                    - verify Supabase JWT             insert into
   drafts + errors)                  - write report row                ai_chat_reports
```

Three new Amplify functions, one shared schema/validator module, one new frontend chat surface.

---

## 2. Auth: Supabase JWT verification in Lambda

Amplify has no Cognito here, so each Lambda verifies the Supabase-issued JWT itself.

- Frontend sends `Authorization: Bearer <supabase access_token>` (from `supabase.auth.getSession()`) on every call.
- Lambda verifies the JWT using the Supabase project's JWT secret (confirm whether your project uses HS256 shared-secret or newer asymmetric signing keys — changes the verification library/config).
- Store the secret via `ampx secret set SUPABASE_JWT_SECRET`.
- Extract `sub` (user id) for logging and rate-limiting.
- Reject with 401 on missing/invalid/expired tokens. Frontend catches 401 specifically and prompts re-login rather than showing it as an AI/chat error.
- Build this once as a shared helper: `amplify/functions/_shared/verifySupabaseAuth.ts`, imported by all three functions.

---

## 3. Context management (chat turns + running summary)

Since only the last 7 turns are sent, older context must be preserved via a running summary so the model doesn't "forget" earlier decisions in a long editing session.

**Client-side state (localStorage), per session:**
```json
{
  "sessionId": "...",
  "runningSummary": "User wants a 4-day upper/lower split, prefers dumbbells only, no overhead pressing due to shoulder issue.",
  "recentTurns": [ /* last up to 7 {role, content} messages */ ],
  "plaintextDraft": "Day 1: Upper...\nDay 2: Lower...",
  "planReady": false,
  "chatHistoryFull": [ /* entire conversation, kept for report-issue payload only */ ]
}
```

**Summary update strategy:**
- When `recentTurns` would exceed 7 after appending a new turn, drop the oldest turn(s) but first fold them into `runningSummary`.
- Cheapest approach: let the **same `/ai-chat` call** maintain the summary — instruct the model, as part of its structured response, to also emit an updated one-paragraph running summary alongside its reply (e.g. wrapped in a sentinel block the frontend parses out and stores, never shown to the user). This avoids a second AI call just for summarization.
- Alternative (simpler, slightly more token cost): a lightweight separate summarization call every time turns get trimmed. Start with the inline-sentinel approach since it's a single round trip.

**What gets sent to `/ai-chat` per request:**
```json
{
  "mode": "explain" | "edit" | "create",
  "runningSummary": "...",
  "currentPlanContext": "<verbatim plaintext plan, or null; sent every turn so edits target the real plan text, not a reconstruction from summary/history>",
  "recentTurns": [ ...last up to 7... ],
  "newMessage": "user's latest message"
}
```

`chatHistoryFull` is never sent to the model — it's kept purely for the `/report-issue` payload so a failure report has full fidelity even though the model itself only saw the trimmed window + summary.

---

## 4. `/ai-chat` — streaming conversational endpoint

**Lambda config:** Node.js function, Function URL with `InvokeMode: RESPONSE_STREAM`, so Cerebras's stream can be piped through without buffering.

**System prompt responsibilities:**
- Explain the plan structure in plain terms (days, exercises, sets/reps, progression) so the model can discuss it fluently.
- On every turn where the draft plan changes, restate the **full current draft plan** in plain text (not just a diff) — this becomes the new `plaintextDraft`.
- Emit an updated running summary in a clearly delimited block, e.g.:
  ```
  <<SUMMARY>>User prefers dumbbells only, 4-day split, no overhead pressing.<<END_SUMMARY>>
  ```
  Frontend parses this out of the stream, strips it from what's rendered to the user, and stores it as `runningSummary`.
- Append an exact sentinel token, e.g. `<<PLAN_READY>>`, at the very end **only** when the draft is complete/coherent enough to save. This enables the Save button but is not the sole gate (see §7).

**Streaming mechanics:**
- Lambda calls Cerebras with `stream: true`, forwards chunks as they arrive via the streaming response body.
- Frontend reads via `ReadableStream` + `TextDecoder`, appends to the visible chat bubble live, and on stream end:
  1. Extracts and removes the `<<SUMMARY>>...<<END_SUMMARY>>` block → updates `runningSummary`.
  2. Extracts and removes `<<PLAN_READY>>` if present → sets `planReady`.
  3. Updates `plaintextDraft` from the (cleaned) response if the model restated the full plan.
  4. Pushes the cleaned message into `recentTurns` (trimming to 7, folding overflow into summary per §3) and into `chatHistoryFull`.

---

## 5. `/ai-extract-json` — structured extraction endpoint

**Non-streaming** — full JSON is needed before validation can run.

**Request body:**
```json
{ "plaintextDraft": "...", "runningSummary": "...", "schemaVersion": "1.0" }
```

**Lambda flow:**
1. Call Cerebras with a system prompt instructing conversion of the plaintext plan into JSON matching the schema exactly, output-only-JSON, no prose.
2. Use Cerebras's structured/JSON-mode output if available (check current API docs for a `response_format`/grammar-constrained option) rather than relying on prompt instructions alone.
3. Parse and validate against the **shared validator** (§6).
4. If invalid → **one retry**: re-call with the validator's error message appended ("Previous output failed validation: `<errors>`. Fix and return corrected JSON only.").
5. If still invalid → return `{ ok: false, reason: "validation_failed", attempts: [...] }`. Frontend treats this as the hard failure (§8).
6. If valid → return `{ ok: true, plan: {...} }`.

---

## 6. Shared schema/validator module

Likely already exists (used by Cerebras program generation) somewhere under `lib/programs/`. Key requirement: **one source of truth**, imported by both frontend and Amplify function — not a duplicated copy.

- Suggested location: `src/lib/programs/schema.ts` (+ validator), imported by `amplify/functions/*/resource.ts` via relative path.
- Confirm the Amplify Gen 2 esbuild config for each function isn't scoped to only bundle within `amplify/` — needs to resolve outside that directory.
- Frontend also re-runs the validator client-side on the returned JSON before merging into `user_active_plan`, as defense-in-depth against transport issues — cheap, and avoids trusting the network response blindly even though the Lambda already validated.

---

## 7. Save / confirmation UX

- Save button enabled once there's at least one assistant turn containing a full plan description (baseline gate) — **not** solely dependent on the model remembering `<<PLAN_READY>>`, since that's a soft signal that fast-tracks enabling the button but shouldn't be a hard blocker if the model forgets it.
- Clicking Save:
  1. Disable chat input (prevent races).
  2. Call `/ai-extract-json` with `plaintextDraft` + `runningSummary`.
  3. On success: client-side validate again → merge into `user_active_plan` via the existing write path used by `SupabaseCloudBridge` → show success state.
  4. On failure: go to hard-failure flow (§8).

---

## 8. `/report-issue` — hard-failure reporting

**Request body:**
```json
{
  "chatHistoryFull": [...],
  "plaintextDraft": "...",
  "runningSummary": "...",
  "jsonAttempts": [...],
  "validatorErrors": [...],
  "schemaVersion": "1.0"
}
```

- Verifies Supabase JWT, writes a row into a new Supabase table using the service-role key (server-side only, never exposed to frontend).

```sql
create table ai_chat_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users,
  created_at timestamptz default now(),
  chat_history jsonb,
  plaintext_draft text,
  running_summary text,
  json_attempts jsonb,
  validator_errors jsonb,
  schema_version text
);
```

- No RLS needed for insert (server-side, service key). Add an admin-only read policy so only you can query it via the Supabase dashboard/SQL editor.
- Frontend shows a simple "Report sent" confirmation. **Plaintext draft and running summary stay intact in localStorage** so the user can keep chatting or retry Save later without losing progress.

---

## 9. Frontend pieces

- **New hook** `hooks/useWorkoutAIChat.ts` — owns localStorage draft state (`plaintextDraft`, `runningSummary`, `recentTurns`, `chatHistoryFull`, `planReady`), the streaming fetch to `/ai-chat`, sentinel/summary parsing, and exposes `sendMessage`, `saveDraft`, `reportIssue`.
- **New component**, e.g. `components/gym/ai-chat/` — chat bubble list + input, persistent Save button (see §7 gating logic).
- **Entry points:** a "Create with AI" action on the plan-creation screen, and an "Edit with AI" action on the existing plan view — both route into the same chat component with different `mode` and `currentPlanContext` (the existing plan converted to plaintext deterministically via a template function, not AI, on first load).
- **Save handler** as described in §7.

---

## 10. Remaining open questions

1. **Cerebras JSON mode** — confirm whether their API offers a forced-JSON/grammar-constrained response format vs. relying purely on prompt instructions; affects how reliable step 3 in §5 is in practice.
2. **Rate limiting** — worth a lightweight per-user cap (e.g. N messages/hour) inside `/ai-chat` and `/ai-extract-json` even in beta, to bound cost from retry loops or bugs.
3. **Summary drift** — since the model itself maintains `runningSummary`, worth occasional manual QA on long sessions to confirm it isn't quietly losing important constraints (e.g. injuries, equipment limits) over many turns.
4. **`ai_chat_reports` retention/visibility** — do you want a lightweight internal viewer for these reports, or is querying via Supabase's SQL editor sufficient for beta?

---

## Suggested build order

1. Shared schema/validator module extraction (§6) — unblocks everything else.
2. `verifySupabaseAuth` shared helper (§2).
3. `/ai-extract-json` (simpler, non-streaming) — validate the Cerebras JSON-mode behavior early.
4. `/ai-chat` streaming endpoint + summary/sentinel parsing (§4).
5. `useWorkoutAIChat` hook + chat UI (§9).
6. Save flow wiring (§7) → merge into `user_active_plan`.
7. `/report-issue` + `ai_chat_reports` table (§8).
8. Rate limiting pass (§10.2) before wider beta rollout.