import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PhotoGallery } from '@/components/dashboard/photo-gallery'
import { PhotoUpload } from '@/components/dashboard/photo-upload'
import { fetchPhotosForGallery } from '@/lib/photos/fetch-photos'

export default async function PhotosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_owner')
    .eq('id', user.id)
    .single()

  const { data: ownerConnections } = await supabase
    .from('connections')
    .select('id')
    .eq('owner_id', user.id)
    .limit(1)

  const isOwner = profile?.is_owner || (ownerConnections && ownerConnections.length > 0)

  let photos = []

  if (isOwner) {
    photos = await fetchPhotosForGallery(supabase, { ownerId: user.id })
  } else {
    const { data: connections } = await supabase
      .from('connections')
      .select('owner_id')
      .eq('viewer_id', user.id)

    if (connections && connections.length > 0) {
      const ownerIds = connections.map((c) => c.owner_id)
      photos = await fetchPhotosForGallery(supabase, { ownerIds })
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Photos</h1>
          <p className="text-muted-foreground mt-1">
            {isOwner ? 'Share photos of your college life' : 'Photos from your student'}
          </p>
        </div>
        {isOwner && <PhotoUpload />}
      </div>

      <PhotoGallery photos={photos} userId={user.id} isOwner={isOwner} />
    </div>
  )
}
