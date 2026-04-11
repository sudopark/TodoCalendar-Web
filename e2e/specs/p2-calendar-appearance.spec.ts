import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

test('localStorage에 rowHeight를 설정하면 캘린더 셀이 해당 높이를 반영한다', async ({ page }) => {
  // given — localStorage에 커스텀 rowHeight(120px) 설정 후 페이지 로드
  const customRowHeight = 120
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, { key: 'calendar_appearance', value: { rowHeight: customRowHeight, fontSize: 13, showEventNames: true } })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — day-cell 요소의 minHeight 스타일이 커스텀 값을 반영한다
  const firstCell = page.getByTestId('day-cell').first()
  await expect(firstCell).toBeVisible()
  const minHeight = await firstCell.evaluate(el => (el as HTMLElement).style.minHeight)
  expect(minHeight).toBe(`${customRowHeight}px`)
})

test('localStorage에 기본값(rowHeight 70)이 없을 때 캘린더 셀은 기본 높이(70px)를 사용한다', async ({ page }) => {
  // given — localStorage 없음 (기본값 사용)
  // no addInitScript — fresh state

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — day-cell minHeight는 기본값 70px
  const firstCell = page.getByTestId('day-cell').first()
  await expect(firstCell).toBeVisible()
  const minHeight = await firstCell.evaluate(el => (el as HTMLElement).style.minHeight)
  expect(minHeight).toBe('70px')
})

test('localStorage에 fontSize를 설정하면 캘린더 셀이 해당 폰트 크기를 반영한다', async ({ page }) => {
  // given — 커스텀 fontSize(16px) 설정
  const customFontSize = 16
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, { key: 'calendar_appearance', value: { rowHeight: 70, fontSize: customFontSize, showEventNames: true } })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — day-cell의 fontSize 스타일이 커스텀 값을 반영한다
  const firstCell = page.getByTestId('day-cell').first()
  await expect(firstCell).toBeVisible()
  const fontSize = await firstCell.evaluate(el => (el as HTMLElement).style.fontSize)
  expect(fontSize).toBe(`${customFontSize}px`)
})

test('rowHeight를 매우 작게 설정해도 캘린더가 정상 렌더된다', async ({ page }) => {
  // given — 최솟값에 가까운 rowHeight
  await page.addInitScript(({ key, value }) => {
    localStorage.setItem(key, JSON.stringify(value))
  }, { key: 'calendar_appearance', value: { rowHeight: 30, fontSize: 10, showEventNames: false } })

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')

  // then — 캘린더가 표시되고 day-cell이 30px 높이를 갖는다
  const firstCell = page.getByTestId('day-cell').first()
  await expect(firstCell).toBeVisible()
  const minHeight = await firstCell.evaluate(el => (el as HTMLElement).style.minHeight)
  expect(minHeight).toBe('30px')
})
