import { test, expect } from '@playwright/test'
import type { Page } from '@playwright/test'
import { setupAuthContext } from '../helpers/auth'

test.beforeEach(async ({ context }) => {
  await setupAuthContext(context)
})

// 새 4-layer 아키텍처(#66) 이후 /done 라우트는 메인 페이지의 ArchivePanel 슬라이드 패널로 통합됐다.
// 진입 흐름: 메인(/) → RightEventPanel 의 "완료된 할 일" 아이콘 버튼 클릭 → ArchivePanel 모드
async function openArchivePanel(page: Page) {
  await page.goto('/')
  await page.waitForLoadState('networkidle')
  // RightEventPanel 우상단의 "완료된 할 일" 버튼(체크 아이콘)
  await page.getByRole('button', { name: '완료된 할 일', exact: true }).click()
}

test('완료된 할 일 패널을 열면 헤더가 렌더된다', async ({ page }) => {
  // given / when
  await openArchivePanel(page)

  // then — ArchivePanel 의 h1 타이틀
  await expect(page.getByRole('heading', { name: '완료된 할 일' })).toBeVisible()
})

test('레거시 /done 경로는 메인 페이지로 redirect 된다', async ({ page }) => {
  // 라우팅 contract 검증: 폐지된 라우트가 영구적으로 / 로 안전하게 흘러간다.
  await page.goto('/done')
  await page.waitForLoadState('networkidle')

  await expect(page).toHaveURL('/')
})

test('완료된 할 일이 없으면 빈 상태 메시지가 표시된다', async ({ page }) => {
  // given — API가 빈 배열을 반환하도록 모킹
  await page.route('**/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([]),
    })
  })

  // when
  await openArchivePanel(page)

  // then
  await expect(page.getByText('완료된 할 일이 없습니다')).toBeVisible()
})

test('완료된 항목이 있으면 이름이 목록에 표시된다', async ({ page }) => {
  // given
  const doneItems = [
    { uuid: 'done-1', name: '완료된 할 일 A', done_at: Math.floor(Date.now() / 1000) - 3600 },
    { uuid: 'done-2', name: '완료된 할 일 B', done_at: Math.floor(Date.now() / 1000) - 7200 },
  ]
  await page.route('**/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(doneItems),
    })
  })

  // when
  await openArchivePanel(page)

  // then (React StrictMode dev 환경에서 중복 렌더 가능 → first() 사용)
  await expect(page.getByText('완료된 할 일 A').first()).toBeVisible()
  await expect(page.getByText('완료된 할 일 B').first()).toBeVisible()
})

test('완료된 항목에 되돌리기 버튼과 삭제 버튼이 표시된다', async ({ page }) => {
  // given
  const doneItems = [
    { uuid: 'done-with-actions', name: '액션 테스트 항목', done_at: Math.floor(Date.now() / 1000) },
  ]
  await page.route('**/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(doneItems),
    })
  })

  // when
  await openArchivePanel(page)
  await expect(page.getByText('액션 테스트 항목').first()).toBeVisible()

  // then — DoneTodoRow 의 항목별 버튼은 aria-label 로 식별
  await expect(page.getByRole('button', { name: '되돌리기' }).first()).toBeVisible()
  await expect(page.getByRole('button', { name: '삭제', exact: true }).first()).toBeVisible()
})

test('삭제 버튼을 누르면 삭제 확인 다이얼로그가 표시된다', async ({ page }) => {
  // given
  const doneItems = [
    { uuid: 'done-to-delete', name: '삭제할 완료 항목', done_at: Math.floor(Date.now() / 1000) },
  ]
  await page.route('**/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(doneItems),
    })
  })

  await openArchivePanel(page)
  await expect(page.getByText('삭제할 완료 항목').first()).toBeVisible()

  // when
  await page.getByRole('button', { name: '삭제', exact: true }).first().click()

  // then — ConfirmDialog 가 열린다
  await expect(page.getByRole('dialog')).toBeVisible()
  await expect(page.getByText('이 완료된 할 일을 삭제할까요?')).toBeVisible()
})

test('삭제 확인 다이얼로그에서 취소를 누르면 닫힌다', async ({ page }) => {
  // given
  const doneItems = [
    { uuid: 'done-cancel-delete', name: '삭제취소 항목', done_at: Math.floor(Date.now() / 1000) },
  ]
  await page.route('**/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(doneItems),
    })
  })

  await openArchivePanel(page)
  await page.getByRole('button', { name: '삭제', exact: true }).first().click()
  await expect(page.getByRole('dialog')).toBeVisible()

  // when — 다이얼로그 내부의 취소 버튼
  await page.getByRole('dialog').getByRole('button', { name: '취소' }).click()

  // then
  await expect(page.getByRole('dialog')).not.toBeVisible()
  await expect(page.getByText('삭제취소 항목').first()).toBeVisible()
})

test('모든 항목이 표시되면 "모두 표시됨" 안내 문구가 렌더된다', async ({ page }) => {
  // given
  const doneItems = [
    { uuid: 'done-all-shown', name: '마지막 항목', done_at: Math.floor(Date.now() / 1000) },
  ]
  await page.route('**/todos/dones**', async route => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(doneItems),
    })
  })

  // when
  await openArchivePanel(page)
  await expect(page.getByText('마지막 항목').first()).toBeVisible()

  // then
  await expect(page.getByText('모두 표시됨')).toBeVisible()
})

// ─── #85 done todo 상세 팝오버 진입 흐름 ───────────────────────────────────

test('완료된 항목을 클릭하면 상세 팝오버가 열린다', async ({ page }) => {
  const doneItems = [
    { uuid: 'done-detail', name: '상세 볼 항목', done_at: Math.floor(Date.now() / 1000) },
  ]
  await page.route('**/todos/dones**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(doneItems) })
  })
  await page.route('**/v1/event_details/done/done-detail', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ memo: 'spec 메모' }) })
  })

  await openArchivePanel(page)
  await page.getByText('상세 볼 항목').first().click()

  await expect(page.getByTestId('done-todo-detail-popover')).toBeVisible()
  await expect(page.getByTestId('done-todo-detail-popover').getByText('상세 볼 항목')).toBeVisible()
  await expect(page.getByText('spec 메모')).toBeVisible()
})

test('상세 팝오버의 닫기 버튼을 누르면 팝오버가 닫히고 ArchivePanel 은 그대로 유지된다', async ({ page }) => {
  const doneItems = [
    { uuid: 'done-close', name: '닫기 테스트', done_at: Math.floor(Date.now() / 1000) },
  ]
  await page.route('**/todos/dones**', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(doneItems) })
  })
  await page.route('**/v1/event_details/done/done-close', async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
  })

  await openArchivePanel(page)
  await page.getByText('닫기 테스트').first().click()
  await expect(page.getByTestId('done-todo-detail-popover')).toBeVisible()

  await page.getByTestId('done-todo-detail-popover').getByRole('button', { name: '닫기' }).click()

  await expect(page.getByTestId('done-todo-detail-popover')).not.toBeVisible()
  await expect(page.getByRole('heading', { name: '완료된 할 일' })).toBeVisible()
})

test('상세 팝오버의 되돌리기를 누르면 API 호출 + ArchivePanel 에서 항목이 사라진다', async ({ page }) => {
  const doneId = 'done-revert-detail'
  let reverted = false
  await page.route('**/todos/dones**', async route => {
    const url = route.request().url()
    if (url.includes('/cancel') || url.includes('/revert')) {
      reverted = true
      // BFF cancelDoneTodo 응답 형태 — { reverted, done_id }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          reverted: { uuid: 'todo-revert-detail', name: '되돌리기 상세', is_current: true },
          done_id: doneId,
        }),
      })
      return
    }
    const items = reverted
      ? []
      : [{ uuid: doneId, name: '되돌리기 상세', done_at: Math.floor(Date.now() / 1000) }]
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) })
  })
  await page.route(`**/v1/event_details/done/${doneId}`, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
  })

  await openArchivePanel(page)
  await page.getByText('되돌리기 상세').first().click()
  await page.getByTestId('done-todo-detail-popover').getByRole('button', { name: '되돌리기' }).click()

  // popover 가 닫히고 ArchivePanel 에서도 항목이 빠졌는지 — count 0 으로 종합 검증
  await expect(page.getByTestId('done-todo-detail-popover')).not.toBeVisible()
  await expect(page.getByText('되돌리기 상세')).toHaveCount(0)
})

test('상세 팝오버의 삭제는 ConfirmDialog 를 거쳐 ArchivePanel 에서 항목을 제거한다', async ({ page }) => {
  const doneId = 'done-delete-detail'
  let deleted = false
  await page.route('**/todos/dones**', async route => {
    const method = route.request().method()
    const url = route.request().url()
    if (method === 'DELETE' && url.includes(doneId)) {
      deleted = true
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'ok' }) })
      return
    }
    const items = deleted
      ? []
      : [{ uuid: doneId, name: '삭제 상세', done_at: Math.floor(Date.now() / 1000) }]
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(items) })
  })
  await page.route(`**/v1/event_details/done/${doneId}`, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: 'null' })
  })

  await openArchivePanel(page)
  await page.getByText('삭제 상세').first().click()
  await page.getByTestId('done-todo-detail-popover').getByRole('button', { name: '삭제' }).click()

  await expect(page.getByRole('dialog')).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: '확인' }).click()

  await expect(page.getByTestId('done-todo-detail-popover')).not.toBeVisible()
  await expect(page.getByText('삭제 상세')).toHaveCount(0)
})
