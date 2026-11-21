import { useCallback, useEffect, useMemo, useState } from 'react'
import { loadLevels, loadManifest, loadMeta, loadTalkHtml } from './data'
import type { DiscussionMeta, LevelsFile, ManifestEntry } from './types'
import { commentIdsForUser } from './highlightSource'
import TalkPane from './components/TalkPane'
import UserTabs from './components/UserTabs'
import UserPanel from './components/UserPanel'

/** ?discussion=<id> in the URL selects the discussion; else the first entry. */
function discussionIdFromUrl(): string | null {
  return new URLSearchParams(window.location.search).get('discussion')
}

function setDiscussionIdInUrl(id: string) {
  const url = new URL(window.location.href)
  url.searchParams.set('discussion', id)
  window.history.pushState({}, '', url)
}

export default function App() {
  const [entries, setEntries] = useState<ManifestEntry[]>([])
  const [entry, setEntry] = useState<ManifestEntry | null>(null)
  const [meta, setMeta] = useState<DiscussionMeta | null>(null)
  const [html, setHtml] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [activeUser, setActiveUser] = useState<string>('')
  const [highlightOn, setHighlightOn] = useState(false)
  const [profiles, setProfiles] = useState<Record<string, LevelsFile | null>>({})

  // Load one discussion: snapshot, meta, and every registered participant's
  // levels file (editors without one still get a tab).
  const openDiscussion = useCallback(async (e: ManifestEntry) => {
    setMeta(null)
    setHtml(null)
    setActiveUser('')
    setHighlightOn(false)
    setEntry(e)
    try {
      const [m, h] = await Promise.all([loadMeta(e.id), loadTalkHtml(e.id)])
      const registered = m.participants.filter((p) => !p.isIP)
      const loaded = await Promise.all(registered.map((p) => loadLevels(p.name)))
      const map: Record<string, LevelsFile | null> = {}
      registered.forEach((p, i) => {
        map[p.name] = loaded[i]
      })
      setProfiles(map)
      setMeta(m)
      setHtml(h)
    } catch (err) {
      setError(String(err))
    }
  }, [])

  useEffect(() => {
    ;(async () => {
      try {
        const manifest = await loadManifest()
        setEntries(manifest.discussions)
        const wanted = discussionIdFromUrl()
        const first = manifest.discussions.find((d) => d.id === wanted) ?? manifest.discussions[0]
        if (!first) throw new Error('manifest.json has no discussions')
        await openDiscussion(first)
      } catch (err) {
        setError(String(err))
      }
    })()
  }, [openDiscussion])

  // Browser back/forward between discussions.
  useEffect(() => {
    const onPop = () => {
      const id = discussionIdFromUrl()
      const e = entries.find((d) => d.id === id) ?? entries[0]
      if (e && e.id !== entry?.id) void openDiscussion(e)
    }
    window.addEventListener('popstate', onPop)
    return () => window.removeEventListener('popstate', onPop)
  }, [entries, entry, openDiscussion])

  const switchDiscussion = (id: string) => {
    const e = entries.find((d) => d.id === id)
    if (!e || e.id === entry?.id) return
    setDiscussionIdInUrl(id)
    void openDiscussion(e)
  }

  // Tab rule: every registered account (no IP editors) that signed a
  // comment, alphabetical. Editors without a levels file still get a tab.
  const tabUsers = useMemo(
    () =>
      (meta?.participants.filter((p) => !p.isIP) ?? []).sort((a, b) =>
        a.name.localeCompare(b.name, 'en', { sensitivity: 'base' }),
      ),
    [meta],
  )

  const levels = activeUser ? (profiles[activeUser] ?? null) : null

  const highlightIds = useMemo(
    () => (highlightOn && meta && activeUser ? commentIdsForUser(activeUser, meta) : []),
    [highlightOn, meta, activeUser],
  )

  useEffect(() => {
    if (activeUser || !tabUsers.length) return
    const preferred = tabUsers.find((u) => u.name === entry?.defaultUser)
    setActiveUser((preferred ?? tabUsers[0]).name)
  }, [tabUsers, activeUser, entry])

  // Selecting a user leaves the highlight off; clicking the active username
  // again toggles their comments' highlight on and off.
  const selectUser = (name: string) => {
    if (name === activeUser) {
      setHighlightOn((v) => !v)
    } else {
      setActiveUser(name)
      setHighlightOn(false)
    }
  }

  if (error) return <div className="status error">{error}</div>

  return (
    <div className="app">
      {entries.length > 1 && (
        <div className="top-bar">
          <label className="discussion-picker">
            <span className="muted small">Discussion</span>
            <select value={entry?.id ?? ''} onChange={(e) => switchDiscussion(e.target.value)}>
              {entries.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.page}: {d.section}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
    <div className="layout">
      <div className="left">
        {meta && html ? (
          <TalkPane key={meta.id} html={html} meta={meta} highlightIds={highlightIds} />
        ) : (
          <div className="status">Loading discussion</div>
        )}
      </div>
      <div className="right">
        {meta && (
          <>
            <UserTabs users={tabUsers} active={activeUser} onSelect={selectUser} />
            {activeUser ? (
              <UserPanel
                key={`${meta.id}:${activeUser}`} // new editor or discussion: Frame 1, first row
                user={activeUser}
                levels={levels}
              />
            ) : (
              <p className="panel-note">No registered editors found in this discussion.</p>
            )}
          </>
        )}
      </div>
    </div>
    </div>
  )
}
