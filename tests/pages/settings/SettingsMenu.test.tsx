import { describe, it, expect, vi } from 'vitest'
import { useState } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { SettingsMenu } from '../../../src/pages/settings/SettingsMenu'
import type { SettingCategoryId } from '../../../src/pages/settings/settingCategory'

describe('SettingsMenu', () => {
  it('모든 카테고리의 라벨이 버튼으로 렌더된다', () => {
    // given / when
    render(<SettingsMenu selected="appearance" onSelect={() => {}} onBack={() => {}} />)

    // then
    expect(screen.getByRole('button', { name: '외형' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '이벤트 편집' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '공휴일' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '타임존' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '언어' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '알림' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Google Calendar' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: '계정' })).toBeInTheDocument()
  })

  it('선택된 카테고리는 aria-current="page"로 표시된다', () => {
    // given / when
    render(<SettingsMenu selected="holiday" onSelect={() => {}} onBack={() => {}} />)

    // then
    expect(screen.getByRole('button', { name: '공휴일' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '외형' })).not.toHaveAttribute('aria-current', 'page')
  })

  it('카테고리 버튼 클릭 시 해당 카테고리가 선택 상태로 전환된다', async () => {
    // given: 부모 상태를 SettingsMenu가 변경할 수 있도록 상태 보유 컨테이너로 감싼다
    function Container() {
      const [selected, setSelected] = useState<SettingCategoryId>('appearance')
      return <SettingsMenu selected={selected} onSelect={setSelected} onBack={() => {}} />
    }
    render(<Container />)

    // when
    await userEvent.click(screen.getByRole('button', { name: '공휴일' }))

    // then: 사용자에게 보이는 "선택됨" 표식이 공휴일로 옮겨간다
    expect(screen.getByRole('button', { name: '공휴일' })).toHaveAttribute('aria-current', 'page')
    expect(screen.getByRole('button', { name: '외형' })).not.toHaveAttribute('aria-current', 'page')
  })

  it('뒤로가기 버튼 클릭 시 onBack이 호출된다', async () => {
    // given
    const onBack = vi.fn()
    render(<SettingsMenu selected="appearance" onSelect={() => {}} onBack={onBack} />)

    // when
    await userEvent.click(screen.getByRole('button', { name: '뒤로' }))

    // then
    expect(onBack).toHaveBeenCalled()
  })

  it('페이지 제목 "설정"이 헤더에 표시된다', () => {
    // given / when
    render(<SettingsMenu selected="appearance" onSelect={() => {}} onBack={() => {}} />)

    // then
    expect(screen.getByRole('heading', { name: '설정' })).toBeInTheDocument()
  })
})
