import { useEffect, useState } from 'react'
import type { Highlight } from '../shared/types'
import { getHighlights, watchHighlights } from '../shared/storage'

export function useHighlights(): Highlight[] | null {
  const [highlights, setHighlights] = useState<Highlight[] | null>(null)

  useEffect(() => {
    getHighlights().then(setHighlights)
    return watchHighlights(setHighlights)
  }, [])

  return highlights
}
