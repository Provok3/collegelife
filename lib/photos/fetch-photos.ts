import type { SupabaseClient } from '@supabase/supabase-js'

interface ProfileRef {
  id: string
  display_name: string | null
  avatar_url: string | null
}

export interface GalleryPhoto {
  id: string
  owner_id: string
  blob_pathname: string
  caption: string | null
  created_at: string
  owner?: {
    display_name: string | null
    avatar_url: string | null
  }
  comments: Array<{
    id: string
    content: string
    created_at: string
    parent_id?: string | null
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
  reactions: Array<{
    id: string
    emoji: string
    user_id: string
  }>
}

const COMMENT_USER =
  'user:profiles!photo_comments_user_id_fkey(id, display_name, avatar_url)'
const PHOTO_REACTIONS = 'reactions:photo_reactions(id, emoji, user_id)'

/** Comment nested selects from most to least dependent on optional migrations */
const COMMENT_FIELD_VARIANTS = [
  `parent_id, reactions:photo_comment_reactions(id, emoji, user_id),`,
  'parent_id,',
  '',
] as const

function buildPhotoSelect(ownerJoin: string, commentFields: string) {
  return `
    *,
    ${ownerJoin}
    comments:photo_comments(
      id,
      content,
      created_at,
      ${commentFields}
      ${COMMENT_USER}
    ),
    ${PHOTO_REACTIONS}
  `
}

type PhotoRow = Record<string, unknown>

function normalizePhoto(photo: PhotoRow) {
  const comments =
    (photo.comments as Array<Record<string, unknown>> | null | undefined) ?? []
  return {
    ...photo,
    comments: comments.map((comment) => ({
      ...comment,
      parent_id: (comment.parent_id as string | null | undefined) ?? null,
      reactions: (comment.reactions as unknown[] | undefined) ?? [],
    })),
  }
}

/**
 * Minimal structural view of the PostgREST builder returned by
 * `.from('photos').select(...)`. The dynamic select strings below defeat
 * Supabase's generic inference, so we describe just the methods we use.
 */
type FilterBuilder = {
  eq: (column: string, value: string) => FilterBuilder
  in: (column: string, values: readonly string[]) => FilterBuilder
  order: (
    column: string,
    options: { ascending: boolean },
  ) => PromiseLike<{ data: PhotoRow[] | null; error: { message: string } | null }>
}

async function runPhotoQuery(
  supabase: SupabaseClient,
  select: string,
  filter: (query: FilterBuilder) => FilterBuilder,
) {
  const base = supabase.from('photos').select(select) as unknown as FilterBuilder
  return filter(base).order('created_at', { ascending: false })
}

/**
 * Loads photos with comments/reactions, falling back when optional schema
 * (parent_id, photo_comment_reactions) is not migrated yet.
 */
export async function fetchPhotosForGallery(
  supabase: SupabaseClient,
  options: { ownerId: string } | { ownerIds: string[] },
): Promise<GalleryPhoto[]> {
  const ownerJoin =
    'ownerIds' in options
      ? 'owner:profiles!photos_owner_id_fkey(display_name, avatar_url),'
      : ''

  const applyFilter = (query: FilterBuilder): FilterBuilder => {
    if ('ownerId' in options) {
      return query.eq('owner_id', options.ownerId)
    }
    return query.in('owner_id', options.ownerIds)
  }

  for (const commentFields of COMMENT_FIELD_VARIANTS) {
    const { data, error } = await runPhotoQuery(
      supabase,
      buildPhotoSelect(ownerJoin, commentFields),
      applyFilter,
    )

    if (!error && data) {
      return data.map(normalizePhoto) as unknown as GalleryPhoto[]
    }

    if (process.env.NODE_ENV === 'development') {
      console.warn('[fetchPhotosForGallery] query failed, trying fallback:', error?.message)
    }
  }

  // Last resort: photos + reactions only (no comments join)
  const { data, error } = await runPhotoQuery(
    supabase,
    `*, ${ownerJoin} ${PHOTO_REACTIONS}`,
    applyFilter,
  )

  if (error) {
    if (process.env.NODE_ENV === 'development') {
      console.error('[fetchPhotosForGallery] all queries failed:', error.message)
    }
    return []
  }

  return (data ?? []).map((photo) =>
    normalizePhoto({ ...photo, comments: [] }),
  ) as unknown as GalleryPhoto[]
}
