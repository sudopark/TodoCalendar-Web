import { apiClient } from './apiClient'
import type { HolidayResponse } from '../models'

const SUPPORTED_COUNTRIES_URL =
  'https://gist.githubusercontent.com/sudopark/31ca6b64687c1436ca7e5f705017071a/raw/251dd3885ab5b7ac112140e7b0e6a542fe2901f5/google_calendar_country'

export interface SupportedCountryDTO {
  regionCode: string
  code: string
  name: string
}

export const holidayApi = {
  getHolidays(year: number, locale: string, code: string): Promise<HolidayResponse> {
    return apiClient.get(`/v1/holiday?year=${year}&locale=${locale}&code=${code}`)
  },

  async getSupportedCountries(): Promise<SupportedCountryDTO[]> {
    const response = await fetch(SUPPORTED_COUNTRIES_URL)
    if (!response.ok) throw new Error(`Supported countries fetch failed: ${response.status}`)
    return response.json() as Promise<SupportedCountryDTO[]>
  },
}
