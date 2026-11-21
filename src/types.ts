export interface ManifestEntry {
  id: string
  page: string
  section: string
  anchor: string
  sectionIndex: number
  oldid: number
  source: string
  /** Tab selected when the discussion opens. Falls back to the first tab. */
  defaultUser?: string
}

export interface Manifest {
  discussions: ManifestEntry[]
}

export interface Participant {
  name: string
  isIP: boolean
  comments: number
}

export interface CommentRef {
  id: string
  author: string
}

export interface DiscussionMeta {
  id: string
  page: string
  section: string
  oldid: number
  source: string | null
  commentCount: number
  participants: Participant[]
  comments: CommentRef[]
}

export type { LevelsFile } from './levels'
