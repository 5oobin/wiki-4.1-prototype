import { useState } from 'react'
import type { EditItem, PageItem, PostItem, TopicGroup, Unit } from '../levels'
import { plural } from '../levels'
import { ChangeText, Wikitext, firstLine, renderInline } from '../wikitext'
import { formatDateTime } from '../format'

/* ---- User page items ---- */

export function PageItemView({ item }: { item: PageItem }) {
  if (item.kind === 'heading') return <div className="page-item wt-heading">{renderInline(item.text)}</div>
  return <Wikitext className="page-item" text={item.text} />
}

/* ---- Article edits ---- */

export function EditView({ edit }: { edit: EditItem }) {
  const changes = edit.changes ?? []
  return (
    <div className="item">
      <div className="item-head">{edit.article}</div>
      {changes.length ? (
        changes.map((c, j) => <ChangeText key={j} text={c.text} removed={c.removed} added={c.added} />)
      ) : (
        <div className="muted small">Only spacing or line-break changes</div>
      )}
    </div>
  )
}

/* ---- Talk posts (article talk, user talk, discussion) ---- */

/** Heading text without markup, for comparing a post's "== title ==" line with its discussion title. */
const norm = (t: string) => t.replace(/\[\[(?:[^\]|]*\|)?([^\]]*)\]\]/g, '$1').replace(/'{2,}/g, '').replace(/\s+/g, ' ').trim().toLowerCase()

/**
 * A discussion's first post starts with its "== title ==" line. The title is
 * now shown above every post, so that line is dropped when it repeats it.
 */
function withoutTitleLine(text: string, title: string | null | undefined): string {
  if (!title) return text
  const lines = text.split('\n')
  const i = lines.findIndex((l) => l.trim())
  const m = i >= 0 ? /^(={2,6})\s*(.*?)\s*\1\s*$/.exec(lines[i]) : null
  if (!m || norm(m[2]) !== norm(title)) return text
  let j = i + 1
  while (j < lines.length && !lines[j].trim()) j++
  return lines.slice(j).join('\n')
}

export function PostView({ post }: { post: PostItem }) {
  const [open, setOpen] = useState(false)
  const title = post.discussion_title
  const text = withoutTitleLine(post.post_text, title)
  const hasHead = !!(post.page || title || post.timestamp)
  return (
    <div className="item">
      {hasHead && (
        <div className="post-head">
          {/* page name on its own small line, then the discussion title with its timestamp */}
          {post.page && title && <div className="post-page">{post.page}</div>}
          <div className="item-head">
            {(title || post.page) && <span>{title ? renderInline(title) : post.page}</span>}
            {post.timestamp && <span className="item-time">{formatDateTime(post.timestamp)}</span>}
          </div>
        </div>
      )}
      {post.template ? (
        <>
          <div className="template-tag">[Template: {post.template}]</div>
          {open ? <Wikitext text={text} /> : <Wikitext text={firstLine(text)} />}
          <button className="link-btn fold-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? 'Hide full message ▴' : 'Show full message ▾'}
          </button>
        </>
      ) : (
        <Wikitext text={text} />
      )}
    </div>
  )
}

/* ---- Lists ---- */

export function ItemList({ items, unit }: { items: (EditItem | PostItem)[]; unit: Unit }) {
  return (
    <div className="item-list">
      {items.map((it) =>
        unit === 'edit' ? <EditView key={it.n} edit={it as EditItem} /> : <PostView key={it.n} post={it as PostItem} />,
      )}
    </div>
  )
}

/** Frame 1 topic: one page name per edit/post, chronological. */
export function NameList({ names }: { names: string[] }) {
  return (
    <ol className="name-list">
      {names.map((n, i) => (
        <li key={i}>{n}</li>
      ))}
    </ol>
  )
}

/** Frame 2 topic: groups of pages with the same count; pages listed alphabetically inside a group. */
export function GroupList({ groups, unit }: { groups: TopicGroup[]; unit: Unit }) {
  return (
    <div className="group-list">
      {groups.map((g, i) => (
        <div key={i} className="group">
          <div className="group-count">{plural(g.count, unit)}</div>
          {/* alphabetical, so the order inside a group doesn't read as a ranking */}
          <ul className="group-pages">
            {[...g.pages].sort((x, y) => x.localeCompare(y, 'en', { sensitivity: 'base' })).map((p, j) => (
              <li key={j}>{p}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  )
}

/** Select topic: the pages the LLM chose, with counts. */
export function CountedPages({ pages, unit }: { pages: { page: string; count: number }[]; unit: Unit }) {
  return (
    <ul className="counted-pages">
      {pages.map((p, i) => (
        <li key={i}>
          {p.page} ({plural(p.count, unit)})
        </li>
      ))}
    </ul>
  )
}
