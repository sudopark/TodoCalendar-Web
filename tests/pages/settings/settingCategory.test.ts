import { describe, it, expect } from 'vitest'
import {
  SETTING_CATEGORIES,
  DEFAULT_SETTING_CATEGORY,
  findSettingCategory,
  isSettingCategoryId,
} from '../../../src/pages/settings/settingCategory'

describe('settingCategory', () => {
  it('기본 카테고리는 목록의 첫 항목이고 appearance이다', () => {
    // given / when / then
    expect(DEFAULT_SETTING_CATEGORY).toBe('appearance')
    expect(SETTING_CATEGORIES[0].id).toBe('appearance')
  })

  it('SETTING_CATEGORIES는 7개 카테고리를 포함한다', () => {
    // given / when
    const ids = SETTING_CATEGORIES.map(c => c.id)

    // then
    expect(ids).toEqual([
      'appearance',
      'editEvent',
      'holiday',
      'timezone',
      'language',
      'notification',
      'account',
    ])
  })

  it('각 카테고리는 i18n 라벨 키를 가진다', () => {
    // given / when / then
    for (const cat of SETTING_CATEGORIES) {
      expect(cat.labelKey).toMatch(/^settings\.menu\./)
    }
  })

  it('findSettingCategory는 유효한 ID에 대해 카테고리를 반환한다', () => {
    // given / when
    const cat = findSettingCategory('holiday')

    // then
    expect(cat?.id).toBe('holiday')
    expect(cat?.labelKey).toBe('settings.menu.holiday')
  })

  it('findSettingCategory는 알 수 없는 ID에 대해 undefined를 반환한다', () => {
    // given / when
    const cat = findSettingCategory('unknown')

    // then
    expect(cat).toBeUndefined()
  })

  it('isSettingCategoryId는 유효한 ID와 아닌 값을 구별한다', () => {
    // given / when / then
    expect(isSettingCategoryId('appearance')).toBe(true)
    expect(isSettingCategoryId('account')).toBe(true)
    expect(isSettingCategoryId('unknown')).toBe(false)
    expect(isSettingCategoryId(undefined)).toBe(false)
  })
})
