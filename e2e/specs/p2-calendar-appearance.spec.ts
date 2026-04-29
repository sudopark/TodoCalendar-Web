import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('localStorage에 rowHeight를 설정하면 캘린더 주 행이 해당 높이를 반영한다', async ({ page }) => {
  // given — localStorage에 커스텀 rowHeight(120px) 설정 후 페이지 로드
  const customRowHeight = 120
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, { key: 'calendar_appearance', value: { rowHeight: customRowHeight, fontSize: 13, showEventNames: true } })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — day-cell의 부모 주 행(week row)의 minHeight 스타일이 커스텀 값을 반영한다
  const firstCell = page.getByTestId('day-cell').first()
  await expect(firstCell).toBeVisible()
  const minHeight = await firstCell.evaluate(el => (el.parentElement as HTMLElement).style.minHeight)
  expect(minHeight).toBe(`${customRowHeight}px`)
})

test('localStorage에 기본값(rowHeight 70)이 없을 때 캘린더 주 행은 기본 높이(70px)를 사용한다', async ({ page }) => {
  // given — localStorage 없음 (기본값 사용)
  // no addInitScript — fresh state

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — day-cell의 부모 주 행 minHeight는 기본값 70px
  const firstCell = page.getByTestId('day-cell').first()
  await expect(firstCell).toBeVisible()
  const minHeight = await firstCell.evaluate(el => (el.parentElement as HTMLElement).style.minHeight)
  expect(minHeight).toBe('70px')
})

// NOTE: 새 4-layer 아키텍처(#66) 이후 CalendarAppearance 의 단일 fontSize 필드는 폐기되고
// eventFontSizeWeight / eventListFontSizeWeight 두 가중치로 분리됐다. day-cell 자체에 inline
// fontSize 가 적용되지 않으므로 기존 "fontSize → 셀 fontSize 반영" 시나리오는 의미를 잃었다.
// 새 가중치 검증 시나리오는 #86 의 out of scope("신규 시나리오 추가") 이므로 별도 이슈에서 추가한다.

test('rowHeight를 매우 작게 설정해도 캘린더가 정상 렌더된다', async ({ page }) => {
  // given — 최솟값에 가까운 rowHeight
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, { key: 'calendar_appearance', value: { rowHeight: 30, fontSize: 10, showEventNames: false } })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — 캘린더가 표시되고 주 행이 30px 높이를 갖는다
  const firstCell = page.getByTestId('day-cell').first()
  await expect(firstCell).toBeVisible()
  const minHeight = await firstCell.evaluate(el => (el.parentElement as HTMLElement).style.minHeight)
  expect(minHeight).toBe('30px')
})
