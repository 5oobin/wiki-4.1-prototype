import type { DiscussionMeta, LevelsFile, Manifest } from './types'

const BASE = import.meta.env.BASE_URL // "/" locally, "/<repo>/" on Pages

async function getJSON<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}data/${path}`)
  if (!r.ok) throw new Error(`${path}: ${r.status}`)
  return r.json() as Promise<T>
}

export const loadManifest = () => getJSON<Manifest>('manifest.json')

export const loadMeta = (id: string) => getJSON<DiscussionMeta>(`discussions/${id}/meta.json`)

export async function loadTalkHtml(id: string): Promise<string> {
  const r = await fetch(`${BASE}data/discussions/${id}/talk.html`)
  if (!r.ok) throw new Error(`talk.html: ${r.status}`)
  return r.text()
}

/** Username -> filename. "Betty Logan" -> "Betty_Logan_levels.json". */
export const levelsFile = (name: string) => `${name.replace(/ /g, '_')}_levels.json`

/** Returns null (not an error) when no levels file exists for the user yet. */
export async function loadLevels(name: string): Promise<LevelsFile | null> {
  try {
    const r = await fetch(`${BASE}data/users/${levelsFile(name)}`)
    if (!r.ok) return null
    // Vite's dev server answers unknown paths with index.html and status 200.
    if (!(r.headers.get('content-type') ?? '').includes('json')) return null
    return (await r.json()) as LevelsFile
  } catch {
    return null
  }
}
