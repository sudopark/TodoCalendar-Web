/**
 * 이벤트 상세 편집 사용자 여정 E2E 테스트
 *
 * 이벤트 상세 페이지에서 장소/URL/메모 편집 → 저장 → 읽기 모드 표시 흐름을 검증한다.
 */
import { test, expect } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

const eventId = 'journey-event-detail-001'
const todo = {
  uuid: eventId,
  name: '상세 편집 테스트 이벤트',
  event_tag_id: null,
  is_current: true,
  event_time: null,
  repeating: null,
}

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

function setupEventMocks(
  page: Parameters<Parameters<typeof test>[1]>[0],
  initialDetail: object | null = null,
) {
  return Promise.all([
    page.route('**/v1/tags/**', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([]) })
    }),
    page.route('**/v1/foremost**', async route => {
      await route.fulfill({ status: 404, body: '{}' })
    }),
    page.route('**/v1/todos**', async route => {
      const url = route.request().url()
      const method = route.request().method()
      if (method !== 'GET') { await route.continue(); return }
      if (url.includes(`/todo/${eventId}`)) {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(todo) })
      } else {
        await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify([todo]) })
      }
    }),
    page.route(`**/v1/event_details/${eventId}`, async route => {
      const method = route.request().method()
      if (method === 'GET') {
        if (initialDetail) {
          await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(initialDetail) })
        } else {
          await route.fulfill({ status: 404, body: '{}' })
        }
      } else {
        await route.continue()
      }
    }),
  ])
}

// ─────────────────────────────────────────────────────────────────────────────
// Test 1: 상세 없을 때 초기 빈 상태 표시
// ─────────────────────────────────────────────────────────────────────────────
test('이벤트 상세 페이지를 열면 detail이 없을 때 placeholder 텍스트가 표시된다', async ({ page }) => {
  // given — detail 없음 (404)
  await setupEventMocks(page, null)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto(`/events/${eventId}?type=todo`)
  await expect(page.getByRole('heading', { name: '상세 편집 테스트 이벤트' })).toBeVisible()

  // then — placeholder 표시
  await expect(page.getByText('장소, URL, 메모를 추가하세요')).toBeVisible()
  // "상세 추가" 버튼 표시
  await expect(page.getByRole('button', { name: '상세 추가' })).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 2: 편집 모드에서 장소/URL/메모 입력 → 저장 → 읽기 모드에서 확인
// ─────────────────────────────────────────────────────────────────────────────
test('편집 모드에서 장소, URL, 메모를 입력하고 저장하면 읽기 모드에서 해당 값이 표시된다', async ({ page }) => {
  const savedDetail = {
    place: '서울 강남구',
    url: 'https://example.com',
    memo: '테스트 메모입니다',
  }

  // given
  await setupEventMocks(page, null)
  // PUT으로 저장 후 GET은 저장된 값 반환
  await page.route(`**/v1/event_details/${eventId}`, async route => {
    const method = route.request().method()
    if (method === 'PUT') {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(savedDetail) })
    } else if (method === 'GET') {
      await route.fulfill({ status: 404, body: '{}' })
    } else {
      await route.continue()
    }
  })

  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto(`/events/${eventId}?type=todo`)
  await expect(page.getByRole('heading', { name: '상세 편집 테스트 이벤트' })).toBeVisible()

  // when — 편집 시작
  await page.getByRole('button', { name: '상세 추가' }).click()

  // 장소 입력
  const placeInput = page.locator('input').filter({ hasNot: page.locator('input[type="url"]') }).nth(1)
  // 더 안정적인 방법: label 텍스트로 찾기
  const placeSection = page.locator('div').filter({ hasText: /^장소$/ }).last()
  await placeSection.locator('input').fill('서울 강남구')

  // URL 입력
  await page.locator('input[type="url"]').fill('https://example.com')

  // 메모 입력
  await page.locator('textarea').fill('테스트 메모입니다')

  // 저장
  await page.getByRole('button', { name: '저장' }).click()

  // then — 읽기 모드에서 값이 표시된다
  await expect(page.getByText('서울 강남구')).toBeVisible()
  await expect(page.getByText('https://example.com')).toBeVisible()
  await expect(page.getByText('테스트 메모입니다')).toBeVisible()
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 3: URL이 클릭 가능한 링크로 렌더된다
// ─────────────────────────────────────────────────────────────────────────────
test('detail에 URL이 있으면 읽기 모드에서 클릭 가능한 링크(a 태그)로 표시된다', async ({ page }) => {
  const detailWithUrl = {
    place: '',
    url: 'https://playwright.dev',
    memo: '',
  }

  // given — detail에 URL 있음 (setupEventMocks에 detailWithUrl 전달)
  await setupEventMocks(page, detailWithUrl)

  // when
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto(`/events/${eventId}?type=todo`)
  await expect(page.getByRole('heading', { name: '상세 편집 테스트 이벤트' })).toBeVisible()
  await page.waitForLoadState('networkidle')

  // then — URL이 <a> 태그로 렌더됨
  const link = page.getByRole('link', { name: 'https://playwright.dev' })
  await expect(link).toBeVisible()
  await expect(link).toHaveAttribute('href', 'https://playwright.dev')
  await expect(link).toHaveAttribute('target', '_blank')
})

// ─────────────────────────────────────────────────────────────────────────────
// Test 4: 페이지 재방문 시 저장된 값이 유지된다 (API mock으로 반환)
// ─────────────────────────────────────────────────────────────────────────────
test('이벤트 상세 페이지를 재방문하면 API에서 반환된 저장된 detail 값이 표시된다', async ({ page }) => {
  const persistedDetail = {
    place: '저장된 장소',
    url: 'https://saved.example.com',
    memo: '저장된 메모',
  }

  // given — API가 저장된 detail 반환 (setupEventMocks에 persistedDetail 전달)
  await setupEventMocks(page, persistedDetail)

  // when — 페이지 방문 (재방문 시뮬레이션)
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  await page.goto(`/events/${eventId}?type=todo`)
  await expect(page.getByRole('heading', { name: '상세 편집 테스트 이벤트' })).toBeVisible()
  await page.waitForLoadState('networkidle')

  // then — 저장된 값들이 읽기 모드에서 표시된다
  await expect(page.getByText('저장된 장소')).toBeVisible()
  await expect(page.getByText('https://saved.example.com')).toBeVisible()
  await expect(page.getByText('저장된 메모')).toBeVisible()
})
