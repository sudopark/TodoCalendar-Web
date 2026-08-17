import { describe, it, expect, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { useTranslation } from 'react-i18next'
import { LanguagePicker } from '../../src/components/LanguagePicker'
import { loadLanguage } from '../../src/i18n'

// i18n 은 싱글턴이라 언어를 바꾼 테스트가 뒤 테스트로 새지 않도록 되돌린다.
afterEach(async () => {
  localStorage.removeItem('language')
  await loadLanguage('ko')
})

function Harness() {
  const { t } = useTranslation()
  return (
    <div>
      <LanguagePicker />
      <p>{t('nav.settings')}</p>
    </div>
  )
}

async function openPicker() {
  await userEvent.click(screen.getByRole('button', { name: '언어' }))
}

describe('LanguagePicker', () => {
  it('트리거를 누르면 지원 언어가 자국어 명칭으로 나열된다', async () => {
    // given: 기본 아이콘 트리거로 렌더된 피커
    render(<LanguagePicker />)

    // when: 트리거를 누른다
    await openPicker()

    // then: 자국어 명칭 목록이 보인다
    expect(await screen.findByRole('option', { name: '한국어' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: 'English' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '日本語' })).toBeInTheDocument()
  })

  it('현재 언어 항목이 선택된 상태로 표시된다', async () => {
    // given: 현재 언어가 한국어인 상태
    render(<LanguagePicker />)

    // when: 목록을 연다
    await openPicker()

    // then: 한국어만 선택 상태다
    expect(await screen.findByRole('option', { name: '한국어' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('option', { name: 'English' })).toHaveAttribute('aria-selected', 'false')
  })

  it('검색어를 입력하면 매칭되는 언어만 남는다', async () => {
    // given: 열린 목록
    render(<LanguagePicker />)
    await openPicker()

    // when: 영문 명칭 일부를 입력한다
    await userEvent.type(await screen.findByRole('searchbox'), 'japan')

    // then: 일본어만 남는다
    expect(screen.getByRole('option', { name: '日本語' })).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: '한국어' })).not.toBeInTheDocument()
  })

  it('매칭되는 언어가 없으면 결과 없음 안내가 보인다', async () => {
    // given: 열린 목록
    render(<LanguagePicker />)
    await openPicker()

    // when: 어느 언어와도 맞지 않는 검색어를 입력한다
    await userEvent.type(await screen.findByRole('searchbox'), 'zzzz')

    // then: 안내 문구만 남는다
    expect(screen.getByText('검색 결과 없음')).toBeInTheDocument()
    expect(screen.queryAllByRole('option')).toHaveLength(0)
  })

  it('언어를 고르면 화면 문구가 그 언어로 바뀌고 목록이 닫힌다', async () => {
    // given: 한국어로 그려진 화면
    render(<Harness />)
    expect(screen.getByText('설정')).toBeInTheDocument()

    // when: 목록에서 English 를 고른다
    await openPicker()
    await userEvent.click(await screen.findByRole('option', { name: 'English' }))

    // then: 문구가 영어로 바뀌고 목록이 닫힌다
    expect(await screen.findByText('Settings')).toBeInTheDocument()
    await waitFor(() => expect(screen.queryByRole('searchbox')).not.toBeInTheDocument())
  })

  it('고른 언어는 저장돼 다음 방문에도 유지된다', async () => {
    // given: 저장된 언어가 없는 상태
    render(<LanguagePicker />)
    expect(localStorage.getItem('language')).toBeNull()

    // when: English 를 고른다
    await openPicker()
    await userEvent.click(await screen.findByRole('option', { name: 'English' }))

    // then: 선택이 저장된다
    expect(await screen.findByRole('button', { name: 'Language' })).toBeInTheDocument()
    expect(localStorage.getItem('language')).toBe('en')
  })

  it('검색 후 Enter 를 누르면 남은 첫 언어가 선택된다', async () => {
    // given: 한국어로 그려진 화면
    render(<Harness />)

    // when: 검색으로 좁힌 뒤 Enter 를 누른다
    await openPicker()
    await userEvent.type(await screen.findByRole('searchbox'), 'english{Enter}')

    // then: 목록까지 이동하지 않고도 전환된다
    expect(await screen.findByText('Settings')).toBeInTheDocument()
  })

  it('검색 결과가 없을 때 Enter 를 눌러도 언어가 바뀌지 않는다', async () => {
    // given: 한국어로 그려진 화면
    render(<Harness />)

    // when: 매칭 없는 검색어로 Enter 를 누른다
    await openPicker()
    await userEvent.type(await screen.findByRole('searchbox'), 'zzzz{Enter}')

    // then: 한국어가 유지된다
    expect(screen.getByText('설정')).toBeInTheDocument()
  })

  it('labeled 변형은 현재 언어의 자국어 명칭을 트리거에 함께 보여준다', async () => {
    // given/when: labeled 변형으로 렌더한다
    render(<LanguagePicker variant="labeled" />)

    // then: 트리거에 자국어 명칭이 보여, UI 언어를 읽지 못해도 현재 언어를 알 수 있다
    expect(screen.getByRole('button', { name: /한국어/ })).toBeInTheDocument()
  })
})
