import type { DiscussionMeta } from './types'

/** Comment ids in the snapshot signed by `user` (DiscussionTools markers). */
export function commentIdsForUser(user: string, meta: DiscussionMeta): string[] {
  return meta.comments.filter((c) => c.author === user).map((c) => c.id)
}
