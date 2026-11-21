/**
 * Shape of public/data/users/<User_name>_levels.json (from project1-extraction).
 * Fields are optional where a level can instead carry a { note } (empty data).
 */

export type RowKey = 'user_page' | 'article_edit_history' | 'article_talk_history' | 'user_talk_history' | 'in_the_discussion'

export const ROWS: { key: RowKey; label: string }[] = [
  { key: 'user_page', label: 'User page' },
  { key: 'article_edit_history', label: 'Article activity (since 2025-01-01)' },
  { key: 'article_talk_history', label: 'Talk activity (since 2025-01-01)' },
  { key: 'user_talk_history', label: 'User talk activity (since 2025-01-01)' },
  { key: 'in_the_discussion', label: 'In this discussion' },
]

export interface BlockEntry {
  started: string
  ended: string | null
  reason: string // wikitext
  duration: string
}

export interface AsIs {
  username: string
  account_created: string
  total_edit_count: number
  recent_edit_count: number
  currently_blocked: boolean
  block_history: BlockEntry[]
  ever_blocked: boolean
}

export interface PageItem {
  n: number
  kind: string // sentence, heading, image, list line, component, table, ...
  text: string
}

export interface Change {
  /** Context with "[removed: …]" / "[added: …]" markers. */
  text: string
  /** Removed pieces, joined with " … " in the order they appear in `text`. */
  removed: string
  added: string
}

export interface EditItem {
  n: number
  article: string
  revid: number
  changes?: Change[] | null
}

export interface PostItem {
  n: number
  page?: string
  timestamp?: string
  post_text: string
  /** Name of the standard template message this post is, if any. */
  template?: string
  /** Level-2 heading of the discussion the post is in (null if not found). */
  discussion_title?: string | null
}

export interface Note {
  note?: string
}

export interface TopicGroup {
  count: number
  pages: string[]
}

export interface SelectTopic extends Note {
  pages?: { page: string; count: number }[]
  description?: string
  based_on?: string
}

export interface SelectKind<T> extends Note {
  description?: string
  examples?: T[]
  based_on?: string
}

/** Loosely typed by level; accessors below narrow per row. */
export interface LevelsFile {
  meta: { username: string; window_start: string }
  as_is: AsIs
  extract?: Record<string, any>
  prioritize?: Record<string, any>
  select?: Record<string, any>
  connect?: Record<string, any>
  judge?: Record<string, any>
}

export type Unit = 'edit' | 'post'

export const plural = (n: number, unit: Unit) => `${n.toLocaleString('en-US')} ${unit}${n === 1 ? '' : 's'}`

/** "single item, shown as is" etc.: a note that accompanies items, not one that replaces them. */
export const EMPTY_NOTE = (unit: Unit) => `No ${unit}s since January 1, 2025`
