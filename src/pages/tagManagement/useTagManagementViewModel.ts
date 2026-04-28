import { useCallback } from 'react'
import { useRepositories } from '../../composition/RepositoriesProvider'
import { useEventTagListCache } from '../../repositories/caches/eventTagListCache'
import { useTagFilterStore } from '../../stores/tagFilterStore'
import type { EventTag } from '../../models'
import type { DefaultTagColors } from '../../models'

// MARK: - Interface

export interface TagManagementViewModel {
  // ── 데이터 ────────────────────────────────────────────────────────
  tags: Map<string, EventTag>
  defaultTagColors: DefaultTagColors | null
  hiddenTagIds: Set<string>

  // ── 태그 가시성 ───────────────────────────────────────────────────
  toggleTagHidden: (tagId: string) => void
  removeTagFromFilter: (tagId: string) => void

  // ── 뮤테이션 (tagRepo 경유) ──────────────────────────────────────
  fetchAll: () => Promise<void>
  createTag: (name: string, color: string) => Promise<void>
  updateTag: (id: string, patch: { name?: string; color_hex?: string }) => Promise<void>
  updateDefaultTagColor: (kind: 'default' | 'holiday', color: string) => Promise<void>
  deleteTag: (id: string) => Promise<void>
  deleteTagAndEvents: (id: string) => Promise<void>
}

// MARK: - Hook

export function useTagManagementViewModel(): TagManagementViewModel {
  const { tagRepo } = useRepositories()

  // ── 캐시 구독 ──────────────────────────────────────────────────────
  const tags = useEventTagListCache(s => s.tags)
  const defaultTagColors = useEventTagListCache(s => s.defaultTagColors)

  // ── 태그 필터 구독 ─────────────────────────────────────────────────
  const hiddenTagIds = useTagFilterStore(s => s.hiddenTagIds)
  const toggleTagHidden = useTagFilterStore(s => s.toggleTag)
  const removeTagFromFilter = useTagFilterStore(s => s.removeTag)

  // ── 뮤테이션 래퍼 ─────────────────────────────────────────────────
  const fetchAll = useCallback(() => tagRepo.fetchAll(), [tagRepo])

  const createTag = useCallback(
    (name: string, color: string) => tagRepo.createTag(name, color).then(() => undefined),
    [tagRepo],
  )

  const updateTag = useCallback(
    (id: string, patch: { name?: string; color_hex?: string }) => tagRepo.updateTag(id, patch).then(() => undefined),
    [tagRepo],
  )

  const updateDefaultTagColor = useCallback(
    (kind: 'default' | 'holiday', color: string) => tagRepo.updateDefaultTagColor(kind, color),
    [tagRepo],
  )

  const deleteTag = useCallback(
    (id: string) => tagRepo.deleteTag(id),
    [tagRepo],
  )

  const deleteTagAndEvents = useCallback(
    (id: string) => tagRepo.deleteTagAndEvents(id),
    [tagRepo],
  )

  return {
    tags,
    defaultTagColors,
    hiddenTagIds,
    toggleTagHidden,
    removeTagFromFilter,
    fetchAll,
    createTag,
    updateTag,
    updateDefaultTagColor,
    deleteTag,
    deleteTagAndEvents,
  }
}
