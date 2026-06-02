import type { SupabaseClient } from '@supabase/supabase-js'

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

function normalizePhoto<T extends { comments?: Array<Record<string, unknown>> | null }>(
  photo: T,
) {
  return {
    ...photo,
    comments: (photo.comments ?? []).map((comment) => ({
      ...comment,
      parent_id: (comment.parent_id as string | null | undefined) ?? null,
      reactions: (comment.reactions as unknown[] | undefined) ?? [],
    })),
  }
}

type PhotosQuery = {
  order: (
    column: string,
    options: { ascending: boolean },
  ) => Promise<{ data: unknown[] | null; error: { message: string } | null }>
}

async function runPhotoQuery(
  supabase: SupabaseClient,
  select: string,
  filter: (query: PhotosQuery) => PhotosQuery,
) {
  const base = supabase.from('photos').select(select) as unknown as PhotosQuery
  const query = filter(base)
  return query.order('created_at', { ascending: false })
}

/**
 * Loads photos with comments/reactions, falling back when optional schema
 * (parent_id, photo_comment_reactions) is not migrated yet.
 */
export async function fetchPhotosForGallery(
  supabase: SupabaseClient,
  options: { ownerId: string } | { ownerIds: string[] },
) {
  const ownerJoin =
    'ownerIds' in options
      ? 'owner:profiles!photos_owner_id_fkey(display_name, avatar_url),'
      : ''

  const applyFilter = (query: ReturnType<SupabaseClient['from']>) => {
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
      return data.map(normalizePhoto)
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

  return (data ?? []).map((photo) => normalizePhoto({ ...photo, comments: [] }))
}
