import { apiClient } from './apiClient'
import type { EventTag } from '../models'

export const eventTagApi = {
  getAllTags(): Promise<EventTag[]> {
    return apiClient.get('/v2/tags/all')
  },

  createTag(body: { name: string; color_hex?: string }): Promise<EventTag> {
    return apiClient.post('/v2/tags/tag', body)
  },

  updateTag(id: string, body: { name: string; color_hex?: string }): Promise<EventTag> {
    return apiClient.put(`/v2/tags/tag/${id}`, body)
  },

  deleteTag(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v2/tags/tag/${id}`)
  },

  deleteTagAndEvents(id: string): Promise<{ status: string }> {
    return apiClient.delete(`/v2/tags/tag_and_events/${id}`)
  },
}
