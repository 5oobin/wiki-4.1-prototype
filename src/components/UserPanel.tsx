import { useLayoutEffect, useRef, useState } from 'react'
import type { LevelsFile, RowKey } from '../levels'
import { ROWS } from '../levels'
import { formatDate, formatDateTime, formatInt } from '../format'
import { renderInline } from '../wikitext'
import Popover, { PopTable } from './Popover'
import { Caret } from './icons'
import FrameContent, { type FrameNo } from './Frames'

interface Props {
  user: string
  levels: LevelsFile | null
}

const FRAMES: FrameNo[] = [1, 2, 3, 4, 5]

export default function UserPanel({ user, levels }: Props) {
  const [row, setRow] = useState<RowKey>('user_page')
  const [frame, setFrame] = useState<FrameNo>(1)
  const boxesRef = useRef<HTMLDivElement>(null)

  // Frames 4–5: scroll to the end so the paragraph the frame adds is visible right away
  useLayoutEffect(() => {
    if (frame < 4) return
    const root = boxesRef.current
    if (!root) return
    for (const el of [root, ...Array.from(root.querySelectorAll<HTMLElement>('.box-body'))]) {
      if (el.scrollHeight > el.clientHeight) el.scrollTop = el.scrollHeight
    }
  }, [frame, row])

  if (!levels) {
    return (
      <div className="user-panel">
        <p className="panel-note">No data for {user} yet.</p>
      </div>
    )
  }

  // A new row always opens at Frame 1 (the panel is re-mounted per editor).
  const chooseRow = (r: RowKey) => {
    setRow(r)
    setFrame(1)
  }

  return (
    <div className="user-panel">
      <AsIsInfo levels={levels} />

      <label className="row-select-label">
        <span className="row-select-caption">Information source:</span>
        <select className="row-select" value={row} onChange={(e) => chooseRow(e.target.value as RowKey)}>
          {ROWS.map((r) => (
            <option key={r.key} value={r.key}>
              {r.label}
            </option>
          ))}
        </select>
      </label>

      <div className="frame-area">
        <div className="frame-tabs" role="tablist">
          {FRAMES.map((f) => (
            <button
              key={f}
              role="tab"
              aria-selected={f === frame}
              className={'frame-tab' + (f === frame ? ' active' : '')}
              onClick={() => setFrame(f)}
            >
              Frame {f}
            </button>
          ))}
        </div>
        {/* key: scroll positions and folded templates reset when the view changes */}
        <div className="frame-boxes" key={`${row}:${frame}`} ref={boxesRef}>
          <FrameContent levels={levels} row={row} frame={frame} />
        </div>
      </div>
    </div>
  )
}

function AsIsInfo({ levels }: { levels: LevelsFile }) {
  const [open, setOpen] = useState(false)
  const a = levels.as_is
  const blocks = a.block_history ?? []
  const everBlocked = a.ever_blocked || blocks.length > 0 || a.currently_blocked
  return (
    <ul className="as-is">
      <li>
        Account created on <b>{formatDate(a.account_created) ?? '–'}</b>
      </li>
      <li>
        Has made <b>{formatInt(a.total_edit_count) ?? '–'}</b> edits (<b>{formatInt(a.recent_edit_count) ?? '–'}</b> edits since
        2025-01-01)
      </li>
      <li className="pop-anchor">
        {!everBlocked ? (
          <>
            Has <b>never</b> been blocked
          </>
        ) : (
          <>
            Is {!a.currently_blocked && <b>not </b>}currently{' '}
            <button className="link-btn" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
              blocked <Caret />
            </button>
          </>
        )}
        {open && (
          <Popover title="Block history" onClose={() => setOpen(false)}>
            <PopTable
              headers={['Date', 'Duration', 'Reason']}
              rows={blocks.map((b) => [formatDateTime(b.started) ?? b.started, b.duration, renderInline(b.reason)])}
              empty="No block history"
              scroll={10}
            />
          </Popover>
        )}
      </li>
    </ul>
  )
}
