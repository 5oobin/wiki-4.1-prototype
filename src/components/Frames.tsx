import { useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode, type RefObject } from 'react'
import type { EditItem, LevelsFile, PageItem, PostItem, RowKey, SelectKind, SelectTopic, Unit } from '../levels'
import { EMPTY_NOTE } from '../levels'
import { CountedPages, GroupList, ItemList, NameList, PageItemView, PostView, EditView } from './Items'

/** ⓘ notes on Prioritize lists (Google Doc, data tab). */
const INFO = {
  user_page:
    'Ordered by how much each part matters for understanding this editor, most first. Among very similar parts, the order reflects little or no difference.',
  edits:
    'Ordered from the most to the least typical of this editor’s edits. Among very similar edits, the order reflects little or no difference.',
  talk: 'Ordered from the most to the least typical of this editor’s posts. Among very similar posts (for example, the same template message sent many times), the order reflects little or no difference.',
  discussion:
    'Ordered from the most to the least typical of how this editor behaved in this discussion. Among very similar posts, the order reflects little or no difference.',
}

/** Frame 1 lists: order stated explicitly (oldest first). */
const OLDEST_FIRST = 'Listed from oldest to newest, since 2025-01-01.'

const NO_CONNECTIONS = 'No connections found with other information about this editor.'
const NOT_YET = 'Not available yet.'
const EDIT_CAP = 100
const POST_CAP = 500

export type FrameNo = 1 | 2 | 3 | 4 | 5

/* ---- Layout pieces ---- */

function Box({
  title,
  sub,
  info,
  infoInline,
  fixed,
  foldable,
  open: openProp,
  onToggle,
  boxRef,
  style,
  children,
}: {
  title?: ReactNode
  sub?: string
  info?: string
  infoInline?: boolean // short note: on the title line instead of below it
  fixed?: boolean // size to content instead of sharing the height
  foldable?: boolean // ▸/▾ and the title open and close it (state held by FoldPair)
  open?: boolean
  onToggle?: () => void
  boxRef?: RefObject<HTMLDivElement | null>
  style?: CSSProperties
  children: ReactNode
}) {
  const open = foldable ? !!openProp : true
  const cls = 'frame-box' + (fixed ? ' fixed' : '') + (foldable ? ' foldable' + (open ? ' open' : ' folded') : '')
  return (
    <div className={cls} ref={boxRef} style={style}>
      {(title || sub || info) && (
        <div className="box-head">
          {title && (
            <div className="box-title-row">
              {foldable ? (
                <button className="box-title fold-toggle" onClick={onToggle} aria-expanded={open}>
                  <span className="fold-caret" aria-hidden="true">
                    {open ? '▾' : '▸'}
                  </span>
                  {title}
                </button>
              ) : (
                <div className="box-title">{title}</div>
              )}
              {info && infoInline && (
                <div className="box-sub info inline">
                  <span className="info-icon" aria-hidden="true">
                    ⓘ
                  </span>{' '}
                  {info}
                </div>
              )}
            </div>
          )}
          {sub && <div className="box-sub">{sub}</div>}
          {info && !(infoInline && title) && (
            <div className="box-sub info">
              <span className="info-icon" aria-hidden="true">
                ⓘ
              </span>{' '}
              {info}
            </div>
          )}
        </div>
      )}
      {open && <div className="box-body">{children}</div>}
    </div>
  )
}

type BoxProps = Omit<Parameters<typeof Box>[0], 'foldable' | 'open' | 'onToggle' | 'boxRef' | 'style'>

const GAP = 12 // .frame-boxes gap

/**
 * Two foldable boxes, both folded at first. One open box fills the space the
 * other's title bar leaves. When the second one opens, the first keeps that
 * same height (it doesn't grow) and the blue panel scrolls to the second.
 */
function FoldPair({ first, second }: { first: BoxProps; second: BoxProps }) {
  const [open, setOpen] = useState<[boolean, boolean]>([false, false])
  const refs = [useRef<HTMLDivElement>(null), useRef<HTMLDivElement>(null)]
  const folded = useRef<[number, number]>([0, 0]) // height of each box when folded
  const [maxH, setMaxH] = useState<[number | null, number | null]>([null, null])

  useLayoutEffect(() => {
    refs.forEach((r, i) => {
      if (!open[i] && r.current) folded.current[i] = r.current.offsetHeight
    })
    const panel = refs[0].current?.parentElement
    if (open[0] && open[1] && panel) {
      const h = panel.clientHeight
      setMaxH([h - folded.current[1] - GAP, h - folded.current[0] - GAP])
    } else {
      setMaxH([null, null])
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open[0], open[1]])

  const toggle = (i: 0 | 1) => setOpen((o) => (i === 0 ? [!o[0], o[1]] : [o[0], !o[1]]))
  const style = (i: 0 | 1): CSSProperties | undefined => (maxH[i] != null ? { maxHeight: maxH[i]! } : undefined)
  return (
    <>
      <Box {...first} foldable open={open[0]} onToggle={() => toggle(0)} boxRef={refs[0]} style={style(0)} />
      <Box {...second} foldable open={open[1]} onToggle={() => toggle(1)} boxRef={refs[1]} style={style(1)} />
    </>
  )
}

const Muted = ({ children }: { children: ReactNode }) => <p className="muted">{children}</p>
const Para = ({ children }: { children: ReactNode }) => <p className="frame-para">{children}</p>
const BasedOn = ({ text }: { text?: string }) => (text ? <p className="based-on">{text}</p> : null)

/* ---- Shared pieces for Frames 3–5 ---- */

/** "(Based on …)" at the end of the description, then a folded "show examples". */
function Described({ description, basedOn, examples }: { description?: string; basedOn?: string; examples: ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="described">
      <p className="frame-para">
        {description}
        {basedOn && <span className="based-on-inline"> ({basedOn.replace(/\.$/, '')})</span>}{' '}
        {examples != null && (
          <button className="link-btn examples-toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? 'hide examples' : 'show examples'}
          </button>
        )}
      </p>
      {open && examples}
    </div>
  )
}

function SelectKindBody({
  k,
  unit,
  compact,
}: {
  k: SelectKind<EditItem | PostItem> | undefined
  unit: Unit
  compact?: boolean // description (Based on …) + folded examples
}) {
  if (!k) return <Muted>{NOT_YET}</Muted>
  if (k.note) return <Muted>{k.note}</Muted>
  if (compact) {
    const ex = k.examples?.length ? (
      <div className="examples">
        {k.examples.map((e) =>
          unit === 'edit' ? <EditView key={e.n} edit={e as EditItem} /> : <PostView key={e.n} post={e as PostItem} />,
        )}
      </div>
    ) : null
    return <Described description={k.description} basedOn={k.based_on} examples={ex} />
  }
  return (
    <>
      {k.description && <Para>{k.description}</Para>}
      {k.examples?.length ? (
        <div className="examples">
          {k.examples.map((e) =>
            unit === 'edit' ? <EditView key={e.n} edit={e as EditItem} /> : <PostView key={e.n} post={e as PostItem} />,
          )}
        </div>
      ) : null}
      <BasedOn text={k.based_on} />
    </>
  )
}

function SelectTopicBody({ t, unit, compact }: { t: SelectTopic | undefined; unit: Unit; compact?: boolean }) {
  if (!t) return <Muted>{NOT_YET}</Muted>
  if (t.note) return <Muted>{t.note}</Muted>
  if (compact) {
    const ex = t.pages?.length ? (
      <div className="examples">
        <CountedPages pages={t.pages} unit={unit} />
      </div>
    ) : null
    return <Described description={t.description} basedOn={t.based_on} examples={ex} />
  }
  return (
    <>
      {t.pages?.length ? <CountedPages pages={t.pages} unit={unit} /> : null}
      {t.description && <Para>{t.description}</Para>}
      <BasedOn text={t.based_on} />
    </>
  )
}

/** Frame 4 and 5 additions. Rows with no data (a note) add nothing. */
function Additions({ levels, row, frame }: { levels: LevelsFile; row: RowKey; frame: FrameNo }) {
  if (frame < 4) return null
  const c = levels.connect?.[row]
  const j = levels.judge?.[row]
  const out: ReactNode[] = []
  if (!c) out.push(<Muted key="c">{NOT_YET}</Muted>)
  else if (!c.note) out.push(<Para key="c">{c.connections?.trim() ? c.connections : NO_CONNECTIONS}</Para>)
  if (frame === 5) {
    if (!j) out.push(<Muted key="j">{NOT_YET}</Muted>)
    else if (!j.note && j.judgment) {
      // Code-added thin-data note ("Note: this is based on only 7 posts.") shown like "(Based on …)"
      const m = /\s*(Note: this is based on only [^.]*)\.?\s*$/.exec(j.judgment)
      const main = m ? j.judgment.slice(0, m.index) : j.judgment
      out.push(
        <Para key="j">
          {main}
          {m && <span className="based-on-inline"> ({m[1]})</span>}
        </Para>,
      )
    }
  }
  return <>{out}</>
}

/**
 * Box title for the edits/posts list: "Edits (most recent 100)" when the cap
 * was applied, otherwise the actual count, e.g. "Edits (20)". Count not bold.
 */
function kindTitle(label: string, total: number, shown: number, cap: number): ReactNode {
  // A full list (exactly the cap) means the cap was applied: the stored talk lists are already cut to 500
  const n = total >= cap || shown >= cap ? `most recent ${cap}` : shown.toLocaleString('en-US')
  return (
    <>
      {label} <span className="box-title-light">({n})</span>
    </>
  )
}

/** Total edits/posts since 2025-01-01 (before the 100/500 cap), from the Extract data. */
function totalCount(levels: LevelsFile, row: RowKey): number {
  const d = levels.extract?.[row]
  if (row === 'article_edit_history') return (d?.topic ?? []).length
  return (d?.kind ?? []).length
}

/* ---- Rows ---- */

function UserPageRow({ levels, frame }: { levels: LevelsFile; frame: FrameNo }) {
  if (frame === 1 || frame === 2) {
    const d = frame === 1 ? levels.extract?.user_page : levels.prioritize?.user_page
    const items: PageItem[] = d?.items ?? []
    return (
      <Box info={frame === 2 && items.length > 1 ? INFO.user_page : undefined}>
        {!d ? (
          <Muted>{NOT_YET}</Muted>
        ) : d.note && !items.length ? (
          <Muted>{d.note}</Muted>
        ) : (
          items.map((it) => <PageItemView key={it.n} item={it} />)
        )}
      </Box>
    )
  }
  const s = levels.select?.user_page
  return (
    <Box>
      {!s ? <Muted>{NOT_YET}</Muted> : s.note ? <Muted>{s.note}</Muted> : <Para>{s.description}</Para>}
      {s && !s.note && <Additions levels={levels} row="user_page" frame={frame} />}
    </Box>
  )
}

const ACTIVITY = {
  article_edit_history: { unit: 'edit' as Unit, topicTitle: 'Edited articles', topicCount: 'unique article count', kindLabel: 'Edits', cap: EDIT_CAP, info: INFO.edits, compact: true },
  article_talk_history: { unit: 'post' as Unit, topicTitle: 'Edited talks', topicCount: 'unique talk count', kindLabel: 'Posts', cap: POST_CAP, info: INFO.talk, compact: true },
}

function ActivityRow({ levels, row, frame }: { levels: LevelsFile; row: 'article_edit_history' | 'article_talk_history'; frame: FrameNo }) {
  const spec = ACTIVITY[row]
  const { unit } = spec
  if (frame === 1) {
    const d = levels.extract?.[row]
    const names: string[] = d?.topic ?? []
    const items: (EditItem | PostItem)[] = (d?.kind ?? []).slice(-spec.cap)
    // No edits/posts at all: just the note, no box titles
    if (d && !names.length && !items.length) return <Box><Muted>{EMPTY_NOTE(unit)}</Muted></Box>
    return (
      <FoldPair
        first={{
          title: (
            <>
              {spec.topicTitle}
              {d && names.length > 0 && <span className="box-title-light"> ({names.length.toLocaleString('en-US')})</span>}
            </>
          ),
          info: OLDEST_FIRST,
          infoInline: true,
          children: !d ? <Muted>{NOT_YET}</Muted> : names.length ? <NameList names={names} /> : <Muted>{EMPTY_NOTE(unit)}</Muted>,
        }}
        second={{
          title: kindTitle(spec.kindLabel, totalCount(levels, row), items.length, spec.cap),
          info: OLDEST_FIRST,
          infoInline: true,
          children: !d ? <Muted>{NOT_YET}</Muted> : items.length ? <ItemList items={items} unit={unit} /> : <Muted>{EMPTY_NOTE(unit)}</Muted>,
        }}
      />
    )
  }
  if (frame === 2) {
    const d = levels.prioritize?.[row]
    const groups = d?.topic?.groups ?? []
    const unique = groups.reduce((n: number, g: { pages: string[] }) => n + g.pages.length, 0)
    const items: (EditItem | PostItem)[] = d?.kind?.items ?? []
    if (d && !groups.length && !items.length)
      return <Box><Muted>{d.kind?.note ?? d.topic?.note ?? EMPTY_NOTE(unit)}</Muted></Box>
    return (
      <FoldPair
        first={{
          title: (
            <>
              {spec.topicTitle} <span className="box-title-light">({spec.topicCount}: {unique.toLocaleString('en-US')})</span>
            </>
          ),
          children: !d ? <Muted>{NOT_YET}</Muted> : groups.length ? <GroupList groups={groups} unit={unit} /> : <Muted>{d.topic?.note ?? EMPTY_NOTE(unit)}</Muted>,
        }}
        second={{
          title: kindTitle(spec.kindLabel, totalCount(levels, row), items.length, spec.cap),
          info: items.length > 1 ? spec.info : undefined,
          children: !d ? <Muted>{NOT_YET}</Muted> : items.length ? <ItemList items={items} unit={unit} /> : <Muted>{d.kind?.note ?? EMPTY_NOTE(unit)}</Muted>,
        }}
      />
    )
  }
  const s = levels.select?.[row]
  const empty = !!s && !!s.topic?.note && !!s.kind?.note
  return (
    <Box>
      {!s ? (
        <Muted>{NOT_YET}</Muted>
      ) : empty ? (
        <Muted>{s.kind.note}</Muted>
      ) : (
        <>
          <SelectTopicBody t={s.topic} unit={unit} compact={spec.compact} />
          <SelectKindBody k={s.kind} unit={unit} compact={spec.compact} />
          <Additions levels={levels} row={row} frame={frame} />
        </>
      )}
    </Box>
  )
}

function UserTalkRow({ levels, frame }: { levels: LevelsFile; frame: FrameNo }) {
  if (frame === 1 || frame === 2) {
    const d = frame === 1 ? levels.extract?.user_talk_history : levels.prioritize?.user_talk_history
    const items: PostItem[] = frame === 1 ? (d?.kind ?? []).slice(-POST_CAP) : (d?.kind?.items ?? [])
    if (d && !items.length) return <Box><Muted>{d.kind?.note ?? EMPTY_NOTE('post')}</Muted></Box>
    return (
      <Box
        title={kindTitle('Posts', totalCount(levels, 'user_talk_history'), items.length, POST_CAP)}
        info={frame === 1 ? OLDEST_FIRST : items.length > 1 ? INFO.talk : undefined}
        infoInline={frame === 1}
      >
        {!d ? <Muted>{NOT_YET}</Muted> : items.length ? <ItemList items={items} unit="post" /> : <Muted>{d.kind?.note ?? EMPTY_NOTE('post')}</Muted>}
      </Box>
    )
  }
  const s = levels.select?.user_talk_history
  return (
    <Box>
      {!s ? (
        <Muted>{NOT_YET}</Muted>
      ) : s.kind?.note ? (
        <Muted>{s.kind.note}</Muted>
      ) : (
        <>
          <SelectKindBody k={s.kind} unit="post" compact />
          <Additions levels={levels} row="user_talk_history" frame={frame} />
        </>
      )}
    </Box>
  )
}

/** Wording for the as-is violation item ("violation" = conduct that led to a block).
 *  The `true` wording is a placeholder; 수빈 will give the final display. */
const violationText = (v: unknown) =>
  v === true ? 'Was blocked for conduct in this discussion.' : v === false ? 'No blocked conduct in this discussion.' : NOT_YET

function DiscussionRow({ levels, frame }: { levels: LevelsFile; frame: FrameNo }) {
  const violation = levels.extract?.in_the_discussion?.violation
  if (frame <= 3) {
    let posts: ReactNode
    let info: string | undefined
    if (frame === 3) {
      const s = levels.select?.in_the_discussion
      posts = <SelectKindBody k={s?.kind} unit="post" compact />
    } else {
      const d = frame === 1 ? levels.extract?.in_the_discussion : levels.prioritize?.in_the_discussion
      const items: PostItem[] = frame === 1 ? (d?.kind ?? []) : (d?.kind?.items ?? [])
      if (frame === 1) info = 'Listed from oldest to newest.'
      if (frame === 2 && items.length > 1) info = INFO.discussion
      posts = !d ? <Muted>{NOT_YET}</Muted> : items.length ? <ItemList items={items} unit="post" /> : <Muted>{d.kind?.note ?? EMPTY_NOTE('post')}</Muted>
    }
    return (
      <>
        {violation === false ? (
          // No blocked conduct: one line, so the box stays as small as possible
          <Box fixed>
            <p className="violation-line">
              <b>Violation</b>: {violationText(violation)}
            </p>
          </Box>
        ) : (
          <Box title="Violation" fixed>
            <p className="frame-para">{violationText(violation)}</p>
          </Box>
        )}
        <Box title={frame === 3 ? undefined : 'Posts'} info={info} infoInline={frame === 1}>
          {posts}
        </Box>
      </>
    )
  }
  const s = levels.select?.in_the_discussion
  return (
    <Box>
      <Para>{violationText(violation)}</Para>
      <SelectKindBody k={s?.kind} unit="post" compact />
      <Additions levels={levels} row="in_the_discussion" frame={frame} />
    </Box>
  )
}

export default function FrameContent({ levels, row, frame }: { levels: LevelsFile; row: RowKey; frame: FrameNo }) {
  switch (row) {
    case 'user_page':
      return <UserPageRow levels={levels} frame={frame} />
    case 'article_edit_history':
    case 'article_talk_history':
      return <ActivityRow levels={levels} row={row} frame={frame} />
    case 'user_talk_history':
      return <UserTalkRow levels={levels} frame={frame} />
    case 'in_the_discussion':
      return <DiscussionRow levels={levels} frame={frame} />
  }
}
