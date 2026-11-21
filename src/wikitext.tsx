import type { ReactNode } from 'react'

/**
 * Light wikitext rendering for posts, edits and user page items.
 *
 * Rendered (so the original markup stays visible as formatting):
 *   [[Target]] / [[Target|label]]   -> blue, underlined link to en.wikipedia.org
 *   [https://… label] / [https://…] -> external link
 *   '''bold''' / ''italic''          -> bold / italic
 *   == Heading ==                     -> bold line
 *   leading : * #                     -> indentation / bullet, as on talk pages
 * Left as raw text: {{templates}}, <ref>, HTML tags, tables, and any markup
 * that is cut off (common in edit fragments).
 */

const WIKI = 'https://en.wikipedia.org/wiki/'

export function wikiHref(target: string): string {
  const t = target.trim().replace(/^:/, '')
  const [page, ...frag] = t.split('#')
  const enc = (s: string) => encodeURIComponent(s.replace(/ /g, '_')).replace(/%3A/gi, ':').replace(/%2F/gi, '/')
  return WIKI + enc(page) + (frag.length ? '#' + enc(frag.join('#')) : '')
}

/* ---- HTML character codes: &#32; -> space, &amp; -> &, &mdash; -> — ---- */

const NAMED: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
  lsquo: '‘', rsquo: '’', ldquo: '“', rdquo: '”', laquo: '«', raquo: '»', middot: '·', bull: '•',
  times: '×', minus: '−', deg: '°', copy: '©', reg: '®', trade: '™', larr: '←', rarr: '→', thinsp: ' ',
  zwj: '‍', zwnj: '‌', shy: '­', para: '¶', sect: '§', eacute: 'é', egrave: 'è', uuml: 'ü',
}

export function decodeEntities(s: string): string {
  if (!s.includes('&')) return s
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, code: string) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
      return Number.isFinite(n) && n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : m
    }
    return NAMED[code.toLowerCase()] ?? m // unknown names stay as written
  })
}

/* ---- Inline markup ---- */

// Simple HTML formatting tags, rendered as their formatting (one line only).
const TAGS = 'small|s|del|strike|u|ins|code|sup|sub|blockquote|b|i|big'

const INLINE = new RegExp(
  [
    "'''''(.+?)'''''",
    "'''(.+?)'''",
    "''(.+?)''",
    '\\[\\[([^[\\]|]+)(?:\\|([^[\\]]*))?\\]\\]',
    '\\[(https?:\\/\\/[^\\s\\]]+)(?:\\s+([^\\]]*))?\\]',
    `<(${TAGS})(?:\\s[^>]*)?>(.*?)<\\/\\8\\s*>`,
    '<br\\s*\\/?>',
  ].join('|'),
  'gi',
)

function tagNode(tag: string, inner: ReactNode[], key: string): ReactNode {
  switch (tag) {
    case 'small':
      return <small key={key}>{inner}</small>
    case 's':
    case 'del':
    case 'strike':
      return <s key={key}>{inner}</s>
    case 'u':
    case 'ins':
      return <u key={key}>{inner}</u>
    case 'code':
      return <code key={key}>{inner}</code>
    case 'sup':
      return <sup key={key}>{inner}</sup>
    case 'sub':
      return <sub key={key}>{inner}</sub>
    case 'b':
      return <b key={key}>{inner}</b>
    case 'i':
      return <i key={key}>{inner}</i>
    case 'big':
      return <big key={key}>{inner}</big>
    default: // blockquote
      return (
        <span key={key} className="wt-quote">
          {inner}
        </span>
      )
  }
}

export function renderInline(text: string, keyPrefix = 'i'): ReactNode[] {
  const out: ReactNode[] = []
  let last = 0
  let k = 0
  const plain = (s: string) => decodeEntities(s)
  for (const m of text.matchAll(INLINE)) {
    const i = m.index ?? 0
    if (i > last) out.push(plain(text.slice(last, i)))
    const key = `${keyPrefix}-${k++}`
    const [whole, bi, b, it, target, label, url, urlLabel, tag, tagInner] = m
    if (tag != null) {
      out.push(tagNode(tag.toLowerCase(), renderInline(tagInner ?? '', key), key))
    } else if (/^<br/i.test(whole)) {
      out.push(<br key={key} />)
    } else if (bi != null) {
      out.push(
        <b key={key}>
          <i>{renderInline(bi, key)}</i>
        </b>,
      )
    } else if (b != null) {
      out.push(<b key={key}>{renderInline(b, key)}</b>)
    } else if (it != null) {
      out.push(<i key={key}>{renderInline(it, key)}</i>)
    } else if (target != null) {
      // File/Image links carry several | parameters; the caption is the last.
      const shown = label != null ? label.split('|').pop() || target : target.replace(/^:/, '')
      out.push(
        <a key={key} className="wl" href={wikiHref(target)} target="_blank" rel="noreferrer">
          {renderInline(shown, key)}
        </a>,
      )
    } else if (url != null) {
      out.push(
        <a key={key} className="wl ext" href={url} target="_blank" rel="noreferrer">
          {urlLabel ? renderInline(urlLabel, key) : url}
        </a>,
      )
    }
    last = i + m[0].length
  }
  if (last < text.length) out.push(plain(text.slice(last)))
  return out
}

const HEADING = /^(={2,6})\s*(.*?)\s*\1\s*$/
const INDENT = /^([:*#]+)\s*/
const MAX_INDENT = 4

/** Multi-line wikitext: headings, indentation and bullets per line. */
export function Wikitext({ text, className }: { text: string; className?: string }) {
  const lines = text.replace(/\r/g, '').split('\n')
  const out: ReactNode[] = []
  let blank = false
  lines.forEach((line, n) => {
    if (!line.trim()) {
      if (out.length && !blank) out.push(<div key={n} className="wt-gap" />)
      blank = true
      return
    }
    blank = false
    const h = HEADING.exec(line)
    if (h) {
      out.push(
        <div key={n} className="wt-heading">
          {renderInline(h[2], `h${n}`)}
        </div>,
      )
      return
    }
    const ind = INDENT.exec(line)
    if (ind) {
      const marks = ind[1]
      const depth = Math.min(marks.length, MAX_INDENT)
      const bullet = /[*#]$/.test(marks)
      out.push(
        <div key={n} className="wt-line" style={{ paddingLeft: `${depth * 1.1}em` }}>
          {bullet && <span className="wt-bullet">•</span>}
          {renderInline(line.slice(ind[0].length), `l${n}`)}
        </div>,
      )
      return
    }
    out.push(
      <div key={n} className="wt-line">
        {renderInline(line, `l${n}`)}
      </div>,
    )
  })
  return <div className={'wikitext' + (className ? ' ' + className : '')}>{out}</div>
}

/** First non-empty line of a post (used for folded template messages). */
export function firstLine(text: string): string {
  return text.split('\n').find((l) => l.trim()) ?? ''
}

/* ---- Edit changes: "[removed: …]" / "[added: …]" markers ---- */

type Seg = { kind: 'context' | 'removed' | 'added'; text: string }

/**
 * Split a change's context text into context / removed / added segments.
 * The removed and added pieces are known (change.removed / change.added,
 * joined with " … "), so each marker's end is found by matching the next
 * piece rather than by guessing at brackets (pieces can contain "]]").
 */
export function changeSegments(text: string, removed: string, added: string): Seg[] {
  const pieces = { removed: removed ? removed.split(' … ') : [], added: added ? added.split(' … ') : [] }
  const next = { removed: 0, added: 0 }
  const segs: Seg[] = []
  let i = 0
  let ctx = ''
  while (i < text.length) {
    const rest = text.slice(i)
    const m = /^\[(removed|added): /.exec(rest)
    if (m) {
      const kind = m[1] as 'removed' | 'added'
      const body = rest.slice(m[0].length)
      const piece = pieces[kind][next[kind]]
      let len = -1
      if (piece != null && body.startsWith(piece + ']')) len = piece.length
      else {
        // Fallback: up to the first "]" followed by a space, ellipsis or end.
        const f = /\](?=\s|…|$)/.exec(body)
        if (f) len = f.index
      }
      if (len >= 0) {
        if (ctx) segs.push({ kind: 'context', text: ctx })
        ctx = ''
        segs.push({ kind, text: body.slice(0, len) })
        next[kind]++
        i += m[0].length + len + 1
        continue
      }
    }
    ctx += text[i]
    i++
  }
  if (ctx) segs.push({ kind: 'context', text: ctx })
  return segs
}

export function ChangeText({ text, removed, added }: { text: string; removed: string; added: string }) {
  return (
    <div className="change">
      {changeSegments(text, removed, added).map((s, j) =>
        s.kind === 'context' ? (
          <span key={j}>{renderInline(s.text, `c${j}`)}</span>
        ) : (
          <span key={j} className={`diff-${s.kind}`}>
            <span className="diff-label">[{s.kind}: </span>
            {renderInline(s.text, `c${j}`)}
            <span className="diff-label">]</span>
          </span>
        ),
      )}
    </div>
  )
}
