import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { PublicDocPage } from '../../../src/pages/PublicDoc/PublicDocPage'
import { PublicDocRepository } from '../../../src/repositories/PublicDocRepository'
import { PUBLIC_DOCS } from '../../../src/domain/publicDocs'
import i18n from '../../../src/i18n'

const TERMS = PUBLIC_DOCS.find(d => d.id === 'terms')!
const PRIVACY = PUBLIC_DOCS.find(d => d.id === 'privacy')!
const GOOGLE_CALENDAR_DATA = PUBLIC_DOCS.find(d => d.id === 'google-calendar-data')!
const GUIDE = PUBLIC_DOCS.find(d => d.id === 'guide')!

// 원문 레포 상대 경로 → 본문
let bodies: Record<string, string>
let failures: number

// API 경계에서만 모킹 — 실제 PublicDocRepository 가 동작한다
function makeRepo() {
  return new PublicDocRepository({
    api: {
      sourceUrl: filePath => `https://raw.example.test/${filePath}`,
      async fetchMarkdown(filePath) {
        if (failures > 0) {
          failures -= 1
          throw new Error('network down')
        }
        const body = bodies[filePath]
        if (body === undefined) throw new Error(`no doc: ${filePath}`)
        return body
      },
    },
  })
}

let repo: PublicDocRepository

vi.mock('../../../src/composition/RepositoriesProvider', () => ({
  useRepositories: () => ({ publicDocRepo: repo }),
}))

function Loc() {
  const loc = useLocation()
  return <div data-testid="loc">{loc.pathname}</div>
}

function renderAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route path="/terms/:lang?" element={<PublicDocPage doc={TERMS} />} />
        <Route path="/privacy/:lang?" element={<Loc />} />
        <Route path="/" element={<Loc />} />
      </Routes>
    </MemoryRouter>
  )
}

function renderGoogleCalendarDataAt(url: string) {
  render(
    <MemoryRouter initialEntries={[url]}>
      <Routes>
        <Route
          path="/google-calendar-data/:lang?"
          element={<PublicDocPage doc={GOOGLE_CALENDAR_DATA} />}
        />
        <Route path="/" element={<Loc />} />
      </Routes>
    </MemoryRouter>
  )
}

beforeEach(() => {
  bodies = {
    'ko/terms.md': '# 이용약관\n\n한국어 본문입니다.',
    'en/terms.md': '# Terms of Use\n\nEnglish body.',
  }
  failures = 0
  repo = makeRepo()
})

// tests/setup.ts 가 전역으로 loadLanguage('ko') 를 호출해 UI 언어를 ko 로 고정한다.
// 다른 테스트에 영향 주지 않도록 UI 언어를 바꾸는 테스트는 종료 후 ko 로 되돌린다.
afterEach(async () => {
  await i18n.changeLanguage('ko')
})

describe('PublicDocPage', () => {
  it('언어가 지정된 경로로 들어오면 그 언어의 본문이 렌더된다', async () => {
    // given / when
    renderAt('/terms/ko')

    // then
    await waitFor(() => expect(screen.getByText('한국어 본문입니다.')).toBeInTheDocument())
  })

  it('언어 없는 경로로 들어오면 현재 UI 언어에 맞는 경로로 대체된다', async () => {
    // given — UI 언어를 en 으로 전환
    await i18n.changeLanguage('en')

    // when
    renderAt('/terms')

    // then — UI 언어(en)에 맞춰 영문 본문이 뜬다
    await waitFor(() => expect(screen.getByText('English body.')).toBeInTheDocument())
  })

  it('지원하지 않는 언어 경로로 들어오면 404 대신 현재 UI 언어 문서가 뜬다', async () => {
    // given — UI 언어를 ko 로 명시 (다른 테스트가 en 으로 바꿔놔도 새지 않게)
    await i18n.changeLanguage('ko')

    // when
    renderAt('/terms/fr')

    // then — UI 언어(ko)에 맞춰 한국어 본문이 뜬다. en 고정 구현이었다면 실패한다.
    await waitFor(() => expect(screen.getByText('한국어 본문입니다.')).toBeInTheDocument())
  })

  it('언어 토글을 누르면 다른 언어 본문으로 바뀐다', async () => {
    // given
    const user = userEvent.setup()
    renderAt('/terms/ko')
    await waitFor(() => expect(screen.getByText('한국어 본문입니다.')).toBeInTheDocument())

    // when
    await user.click(screen.getByTestId('public-doc-lang-en'))

    // then
    await waitFor(() => expect(screen.getByText('English body.')).toBeInTheDocument())
  })

  it('문서를 못 가져오면 에러 안내와 원문 링크가 보인다', async () => {
    // given
    bodies = {}

    // when
    renderAt('/terms/ko')

    // then
    await waitFor(() => expect(screen.getByTestId('public-doc-error')).toBeInTheDocument())
    expect(screen.getByTestId('public-doc-source-link')).toHaveAttribute(
      'href',
      'https://raw.example.test/ko/terms.md'
    )
  })

  it('일시적 실패 뒤 재시도를 누르면 본문이 렌더된다', async () => {
    // given — ko/en 두 번 모두 실패시켜 첫 로드를 에러로 만든다
    const user = userEvent.setup()
    failures = 2
    renderAt('/terms/ko')
    await waitFor(() => expect(screen.getByTestId('public-doc-error')).toBeInTheDocument())

    // when
    await user.click(screen.getByTestId('public-doc-retry'))

    // then
    await waitFor(() => expect(screen.getByText('한국어 본문입니다.')).toBeInTheDocument())
  })

  it('본문 안의 다른 문서 링크를 누르면 해당 문서 경로로 이동한다', async () => {
    // given
    const user = userEvent.setup()
    bodies = { 'ko/terms.md': '[방침](./privacy.md)' }
    renderAt('/terms/ko')
    await waitFor(() => expect(screen.getByRole('link', { name: '방침' })).toBeInTheDocument())

    // when
    await user.click(screen.getByRole('link', { name: '방침' }))

    // then
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/privacy/ko'))
    expect(PRIVACY.id).toBe('privacy')
  })
})

describe('PublicDocPage — 영문 단일본 문서', () => {
  beforeEach(() => {
    bodies = {
      'en/google-calendar-data.md':
        '# Google Calendar Integration & Data Policy\n\nEnglish only body.',
    }
  })

  it('한국어 UI 에서 언어 없는 경로로 들어가도 영문 본문이 뜬다', async () => {
    // given
    await i18n.changeLanguage('ko')

    // when
    renderGoogleCalendarDataAt('/google-calendar-data')

    // then
    await waitFor(() => expect(screen.getByText('English only body.')).toBeInTheDocument())
  })

  it('제공하지 않는 ko 경로로 직접 들어가도 영문 본문이 뜬다', async () => {
    // given
    await i18n.changeLanguage('ko')

    // when
    renderGoogleCalendarDataAt('/google-calendar-data/ko')

    // then — ko 로 머무르면 원문 링크가 존재하지 않는 ko 파일을 가리키게 된다
    await waitFor(() => expect(screen.getByText('English only body.')).toBeInTheDocument())
  })

  it('제공 언어가 하나뿐이면 언어 전환 링크가 보이지 않는다', async () => {
    // given / when
    renderGoogleCalendarDataAt('/google-calendar-data/en')
    await waitFor(() => expect(screen.getByText('English only body.')).toBeInTheDocument())

    // then
    expect(screen.queryByTestId('public-doc-lang-ko')).not.toBeInTheDocument()
    expect(screen.queryByTestId('public-doc-lang-en')).not.toBeInTheDocument()
  })

  it('문서를 못 가져오면 원문 링크가 영문 경로를 가리킨다', async () => {
    // given
    bodies = {}

    // when
    renderGoogleCalendarDataAt('/google-calendar-data/en')

    // then
    await waitFor(() => expect(screen.getByTestId('public-doc-error')).toBeInTheDocument())
    expect(screen.getByTestId('public-doc-source-link')).toHaveAttribute(
      'href',
      'https://raw.example.test/en/google-calendar-data.md'
    )
  })
})
