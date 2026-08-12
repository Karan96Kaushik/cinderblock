import type { ProgramDocument } from '@/lib/program-json'
import type { ProgramVersionSource } from '@/lib/program-version'
import { supabase } from '@/utils/supabase'

export type ProgramVersionRecord = {
  id: string
  userId: string
  programId: string
  version: string
  program: ProgramDocument
  source: string
  note: string | null
  createdAt: string
}

export type InsertProgramVersionInput = {
  programId: string
  version: string
  program: ProgramDocument
  source?: ProgramVersionSource
  note?: string | null
}

/**
 * Append a program version snapshot. Idempotent on (user, programId, version).
 */
export async function insertProgramVersion(
  userId: string,
  input: InsertProgramVersionInput,
): Promise<ProgramVersionRecord | null> {
  const row = {
    user_id: userId,
    program_id: input.programId,
    version: input.version.trim(),
    program: input.program,
    source: input.source ?? 'cloud-sync',
    note: input.note ?? null,
  }

  const { data, error } = await supabase
    .from('user_program_versions')
    .upsert(row, {
      onConflict: 'user_id,program_id,version',
      ignoreDuplicates: true,
    })
    .select('id, user_id, program_id, version, program, source, note, created_at')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    id: data.id,
    userId: data.user_id,
    programId: data.program_id,
    version: data.version,
    program: data.program as ProgramDocument,
    source: data.source,
    note: data.note,
    createdAt: data.created_at,
  }
}

/** Newest-first history for one program lineage (or all programs if programId omitted). */
export async function listProgramVersions(
  userId: string,
  opts?: { programId?: string; limit?: number },
): Promise<ProgramVersionRecord[]> {
  let query = supabase
    .from('user_program_versions')
    .select('id, user_id, program_id, version, program, source, note, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(opts?.limit ?? 50)

  if (opts?.programId) {
    query = query.eq('program_id', opts.programId)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    programId: row.program_id,
    version: row.version,
    program: row.program as ProgramDocument,
    source: row.source,
    note: row.note,
    createdAt: row.created_at,
  }))
}

export async function fetchLatestProgramVersion(
  userId: string,
  programId: string,
): Promise<ProgramVersionRecord | null> {
  const { data, error } = await supabase
    .from('user_program_versions')
    .select('id, user_id, program_id, version, program, source, note, created_at')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    id: data.id,
    userId: data.user_id,
    programId: data.program_id,
    version: data.version,
    program: data.program as ProgramDocument,
    source: data.source,
    note: data.note,
    createdAt: data.created_at,
  }
}

/** Fetch a specific program version by version string. */
export async function fetchProgramVersion(
  userId: string,
  programId: string,
  version: string,
): Promise<ProgramVersionRecord | null> {
  const { data, error } = await supabase
    .from('user_program_versions')
    .select('id, user_id, program_id, version, program, source, note, created_at')
    .eq('user_id', userId)
    .eq('program_id', programId)
    .eq('version', version)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return {
    id: data.id,
    userId: data.user_id,
    programId: data.program_id,
    version: data.version,
    program: data.program as ProgramDocument,
    source: data.source,
    note: data.note,
    createdAt: data.created_at,
  }
}
