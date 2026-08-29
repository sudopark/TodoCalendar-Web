import { test, expect, type Page, type Route } from '@playwright/test'

const RAW = '**/raw.githubusercontent.com/**'

// 1x1 투명 PNG — 스크린샷 요청이 실제 네트워크를 타지 않게 한다
const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
  'base64'
)

const INDEX_KO = `# 서비스 안내

<img src="https://raw.githubusercontent.com/sudopark/TodoCalendar-Terms/main/guide/images/app-icon.png" alt="앱 아이콘" width="96">

### [1. 기본 기능](./01-basics.md)
캘린더 화면과 이벤트 종류.
`

const BASICS_KO = `# 1. 기본 기능

[← 목차](./README.md)

<img src="https://raw.githubusercontent.com/sudopark/TodoCalendar-Terms/main/guide/images/calendar.png" alt="캘린더 화면" width="280">

[이벤트 종류로 이동](#이벤트-종류와-색)

## 이벤트 종류와 색

색으로 구분되는 이벤트 종류 설명입니다.
`

const WIDGETS_EN = `# 3. Widgets

Widget list in English.
`

async function stubGuide(page: Page) {
  await page.route(RAW, (route: Route) => {
    const url = route.request().url()

    if (url.endsWith('.png')) {
      return route.fulfill({ status: 200, contentType: 'image/png', body: PNG })
    }

    const bodies: Record<string, string> = {
      'guide/ko/README.md': INDEX_KO,
      'guide/ko/01-basics.md': BASICS_KO,
      'guide/en/README.md': '# Guide\n\nEnglish index.\n',
      'guide/en/03-widgets.md': WIDGETS_EN,
    }
    const hit = Object.keys(bodies).find(path => url.endsWith(path))
    if (!hit) return route.fulfill({ status: 404, body: 'Not Found' })

    route.fulfill({
      status: 200,
      contentType: 'text/plain; charset=utf-8',
      body: bodies[hit],
    })
  })
}

test('미로그인 상태에서 /guide 직접 접근 → 로그인으로 튕기지 않고 목차가 뜬다', async ({ page }) => {
  await stubGuide(page)

  await page.goto('/guide')

  await expect(page).toHaveURL(/\/guide\/(ko|en)$/)
  await expect(page.getByRole('heading', { level: 1, name: /서비스 안내|Guide/ })).toBeVisible()
  await expect(page).not.toHaveURL(/\/login/)
})

test('목차에서 하위 문서 링크를 누르면 그 문서로 이동한다', async ({ page }) => {
  await stubGuide(page)

  await page.goto('/guide/ko')
  await page.getByRole('link', { name: '1. 기본 기능' }).click()

  await expect(page).toHaveURL(/\/guide\/ko\/01-basics$/)
  await expect(page.getByRole('heading', { level: 1, name: '1. 기본 기능' })).toBeVisible()
})

test('하위 문서 경로로 새로고침해 들어와도 본문과 스크린샷이 뜬다', async ({ page }) => {
  await stubGuide(page)

  await page.goto('/guide/ko/01-basics')

  await expect(page.getByRole('heading', { level: 1, name: '1. 기본 기능' })).toBeVisible()
  await expect(page.getByRole('img', { name: '캘린더 화면' })).toBeVisible()
})

test('본문 안 앵커 링크를 누르면 해당 제목으로 이동한다', async ({ page }) => {
  await stubGuide(page)

  await page.goto('/guide/ko/01-basics')
  await page.getByRole('link', { name: '이벤트 종류로 이동' }).click()

  await expect(page).toHaveURL(/#/)
  await expect(page.getByRole('heading', { level: 2, name: '이벤트 종류와 색' })).toBeVisible()
})

test('하위 문서에서 목차 링크를 누르면 목차로 돌아온다', async ({ page }) => {
  await stubGuide(page)

  await page.goto('/guide/ko/01-basics')
  await page.getByRole('link', { name: '← 목차' }).click()

  await expect(page).toHaveURL(/\/guide\/ko$/)
  await expect(page.getByRole('heading', { level: 1, name: '서비스 안내' })).toBeVisible()
})

test('문서 언어가 아닌 코드의 하위 문서로 들어와도 같은 문서의 영문 본문으로 대체된다', async ({ page }) => {
  await stubGuide(page)

  // xx 는 지원 언어가 아니라 UI 언어(ko) 경로로 넘어가고, ko 번역이 없어 영문으로 폴백한다
  await page.goto('/guide/xx/03-widgets')

  await expect(page).toHaveURL(/\/guide\/ko\/03-widgets$/)
  await expect(page.getByText('Widget list in English.')).toBeVisible()
})

test('안내 문서에서는 언어 전환 링크가 보이지 않는다', async ({ page }) => {
  await stubGuide(page)

  await page.goto('/guide/ko')
  await expect(page.getByRole('heading', { level: 1, name: '서비스 안내' })).toBeVisible()

  await expect(page.getByTestId('public-doc-lang-ko')).toHaveCount(0)
  await expect(page.getByTestId('public-doc-lang-en')).toHaveCount(0)
})
