import {
  Camera,
  Calendar,
  Heart,
  MessageCircle,
  Reply,
  type LucideIcon,
} from 'lucide-react'

export type NotificationType =
  | 'new_photo'
  | 'new_status'
  | 'new_schedule'
  | 'photo_comment'
  | 'photo_reaction'
  | 'comment_reply'
  | 'comment_reaction'
  | 'status_comment'
  | 'status_comment_reply'
  | 'status_comment_reaction'

export interface AppNotification {
  id: string
  recipient_id: string
  actor_id: string | null
  type: NotificationType
  photo_id: string | null
  comment_id: string | null
  status_id: string | null
  status_comment_id: string | null
  schedule_item_id: string | null
  data: {
    caption?: string | null
    content?: string | null
    title?: string | null
    item_type?: string | null
    mood?: string | null
    emoji?: string | null
  } | null
  read_at: string | null
  created_at: string
  actor: {
    display_name: string | null
    avatar_url: string | null
  } | null
}

const EMOJI_LABEL: Record<string, string> = {
  heart: '❤️',
  like: '👍',
  star: '⭐',
  smile: '😊',
}

export interface NotificationDescriptor {
  icon: LucideIcon
  title: string
  /** Short secondary line (comment text, caption, etc.), if any. */
  detail?: string
  href: string
}

export function describeNotification(n: AppNotification): NotificationDescriptor {
  const actor = n.actor?.display_name?.trim() || 'Someone'
  const emoji = n.data?.emoji ? EMOJI_LABEL[n.data.emoji] ?? n.data.emoji : ''
  const photoHref = n.photo_id
    ? `/dashboard/photos?photo=${n.photo_id}`
    : '/dashboard/photos'

  switch (n.type) {
    case 'new_photo':
      return {
        icon: Camera,
        title: `${actor} shared a new photo`,
        detail: n.data?.caption || undefined,
        href: photoHref,
      }
    case 'new_status':
      return {
        icon: MessageCircle,
        title: `${actor} posted a new update`,
        detail: n.data?.content || undefined,
        href: '/dashboard/status',
      }
    case 'new_schedule':
      return {
        icon: Calendar,
        title: `${actor} added something to their schedule`,
        detail: n.data?.title || undefined,
        href: '/dashboard/schedule',
      }
    case 'photo_comment':
      return {
        icon: MessageCircle,
        title: `${actor} commented on your photo`,
        detail: n.data?.content || undefined,
        href: photoHref,
      }
    case 'photo_reaction':
      return {
        icon: Heart,
        title: `${actor} reacted ${emoji} to your photo`.trim(),
        href: photoHref,
      }
    case 'comment_reply':
      return {
        icon: Reply,
        title: `${actor} replied to your comment`,
        detail: n.data?.content || undefined,
        href: photoHref,
      }
    case 'comment_reaction':
      return {
        icon: Heart,
        title: `${actor} reacted ${emoji} to your comment`.trim(),
        href: photoHref,
      }
    case 'status_comment':
      return {
        icon: MessageCircle,
        title: `${actor} commented on your update`,
        detail: n.data?.content || undefined,
        href: '/dashboard/status',
      }
    case 'status_comment_reply':
      return {
        icon: Reply,
        title: `${actor} replied to your comment`,
        detail: n.data?.content || undefined,
        href: '/dashboard/status',
      }
    case 'status_comment_reaction':
      return {
        icon: Heart,
        title: `${actor} reacted ${emoji} to your comment`.trim(),
        href: '/dashboard/status',
      }
    default:
      return {
        icon: MessageCircle,
        title: 'New notification',
        href: '/dashboard',
      }
  }
}
