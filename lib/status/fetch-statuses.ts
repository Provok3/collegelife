import type { SupabaseClient } from '@supabase/supabase-js'

interface ProfileRef {
  id: string
  display_name: string | null
  avatar_url: string | null
}

export interface FeedStatus {
  id: string
  owner_id: string
  content: string
  mood: string | null
  studying_for: string | null
  created_at: string
  owner?: {
    display_name: string | null
    avatar_url: string | null
  }
  comments: Array<{
    id: string
    content: string
    created_at: string
    user: ProfileRef
    replies?: Array<{
      id: string
      content: string
      created_at: string
      user: ProfileRef
    }>
    reactions?: Array<{
      id: string
      emoji: string
      user_id: string
    }>
  }>
}

const STATUS_SELECT = `
  *,
  owner:profiles!statuses_owner_id_fkey(display_name, avatar_url),
  comments:status_comments(
    id,
    content,
    created_at,
    parent_id,
    reactions:status_comment_reactions(id, emoji, user_id),
    user:profiles!status_comments_user_id_fkey(id, display_name, avatar_url)
  )
`

type StatusRow = Record<string, unknown>

interface RawComment {
  id: string
  content: string
  created_at: string
  parent_id?: string | null
  user?: unknown
  reactions?: unknown[] | null
}

/** Supabase types to-one embeds as arrays; coerce to a single profile. */
function coerceUser(user: unknown): ProfileRef {
  const value = Array.isArray(user) ? user[0] : user
  return (value as ProfileRef | undefined) ?? {
    id: '',
    display_name: null,
    avatar_url: null,
  }
}

const byCreatedAsc = (a: RawComment, b: RawComment) =>
  new Date(a.created_at).getTime() - new Date(b.created_at).getTime()

function normalizeStatus(status: StatusRow) {
  const raw = (status.comments as RawComment[] | null | undefined) ?? []

  // Nest replies (parent_id set) under their parent comment.
  const repliesByParent = new Map<string, RawComment[]>()
  for (const c of raw) {
    if (c.parent_id) {
      const list = repliesByParent.get(c.parent_id) ?? []
      list.push(c)
      repliesByParent.set(c.parent_id, list)
    }
  }

  const comments = raw
    .filter((c) => !c.parent_id)
    .sort(byCreatedAsc)
    .map((c) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      user: coerceUser(c.user),
      reactions: (c.reactions as unknown[] | undefined) ?? [],
      replies: (repliesByParent.get(c.id) ?? []).sort(byCreatedAsc).map((r) => ({
        id: r.id,
        content: r.content,
        created_at: r.created_at,
        user: coerceUser(r.user),
      })),
    }))

  const owner = Array.isArray(status.owner) ? status.owner[0] : status.owner
  return { ...status, owner, comments }
}

type FilterBuilder = {
  eq: (column: string, value: string) => FilterBuilder
  in: (column: string, values: readonly string[]) => FilterBuilder
  order: (
    column: string,
    options: { ascending: boolean },
  ) => PromiseLike<{ data: StatusRow[] | null; error: { message: string } | null }>
}

export async function fetchStatusesForFeed(
  supabase: SupabaseClient,
  options: { ownerId: string } | { ownerIds: string[] },
): Promise<FeedStatus[]> {
  const base = supabase
    .from('statuses')
    .select(STATUS_SELECT) as unknown as FilterBuilder
  const filtered =
    'ownerId' in options
      ? base.eq('owner_id', options.ownerId)
      : base.in('owner_id', options.ownerIds)

  const { data, error } = await filtered.order('created_at', { ascending: false })

  if (error || !data) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[fetchStatusesForFeed] query failed:', error?.message)
    }
    return []
  }

  return data.map(normalizeStatus) as unknown as FeedStatus[]
}
