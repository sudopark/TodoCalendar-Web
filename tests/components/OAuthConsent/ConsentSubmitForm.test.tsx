import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import { ConsentSubmitForm } from '../../../src/components/OAuthConsent/ConsentSubmitForm'
import '../../../src/i18n'

const AS_BASE_URL = 'http://as.test'
const CALLBACK_URL = `${AS_BASE_URL}/v1/oauth/consent/callback`
const challenge = 'abc-123'

function renderForm(overrides: Partial<{ onBeforeSubmit: () => Promise<string> }> = {}) {
  const onBeforeSubmit = overrides.onBeforeSubmit ?? vi.fn(async () => 'fresh-id-token')
  render(
    <ConsentSubmitForm
      callbackUrl={CALLBACK_URL}
      challenge={challenge}
      onBeforeSubmit={onBeforeSubmit}
    />
  )
  return { onBeforeSubmit }
}

describe('ConsentSubmitForm', () => {
  it('form action 은 AS callback URL 을 가리킨다', () => {
    renderForm()
    const form = screen.getByTestId('consent-form') as HTMLFormElement
    expect(form.action).toBe('http://as.test/v1/oauth/consent/callback')
    expect(form.method.toLowerCase()).toBe('post')
  })

  it('challenge / allow / id_token hidden field 가 모두 존재한다', () => {
    renderForm()
    const form = screen.getByTestId('consent-form') as HTMLFormElement
    const data = new FormData(form)
    expect(data.get('challenge')).toBe(challenge)
    expect(data.get('id_token')).toBe('') // submit 전엔 비어있음
    expect(data.has('allow')).toBe(true)
  })

  it('Allow 클릭 시 onBeforeSubmit 호출 → id_token hidden 채움 → submit', async () => {
    const onBeforeSubmit = vi.fn(async () => 'fresh-id-token')
    renderForm({ onBeforeSubmit })
    const form = screen.getByTestId('consent-form') as HTMLFormElement

    // submit() 호출 시점의 값을 캡처: React 리렌더가 form.submit() 이후에 flush되므로
    // fireEvent 반환 후 value를 읽으면 리렌더로 인해 초기값으로 돌아온다.
    let capturedIdToken = ''
    let capturedAllow = ''
    vi.spyOn(form, 'submit').mockImplementation(() => {
      capturedAllow = (form.elements.namedItem('allow') as HTMLInputElement).value
      capturedIdToken = (form.elements.namedItem('id_token') as HTMLInputElement).value
    })

    fireEvent.click(screen.getByRole('button', { name: /허용|Allow/i }))

    await new Promise(r => setTimeout(r, 0))

    // capturedIdToken 이 채워졌다는 것 자체가 onBeforeSubmit 이 호출되어 반환됐음을 증명
    expect(capturedIdToken).toBe('fresh-id-token')
    expect(capturedAllow).toBe('true')
  })

  it('Deny 클릭 시 id_token 없이 allow=false 로 submit', async () => {
    const onBeforeSubmit = vi.fn(async () => 'fresh-id-token')
    renderForm({ onBeforeSubmit })
    const form = screen.getByTestId('consent-form') as HTMLFormElement

    // submit() 호출 시점의 값을 캡처: React 리렌더가 form.submit() 이후에 flush되므로
    // fireEvent 반환 후 value를 읽으면 리렌더로 인해 초기값으로 돌아온다.
    let capturedAllow = ''
    let capturedIdToken = ''
    vi.spyOn(form, 'submit').mockImplementation(() => {
      capturedAllow = (form.elements.namedItem('allow') as HTMLInputElement).value
      capturedIdToken = (form.elements.namedItem('id_token') as HTMLInputElement).value
    })

    fireEvent.click(screen.getByRole('button', { name: /거부|Deny/i }))
    await new Promise(r => setTimeout(r, 0))

    // allow=false + id_token 빈 문자열 → onBeforeSubmit 미호출 증명
    expect(capturedAllow).toBe('false')
    expect(capturedIdToken).toBe('')
  })

  it('submit 진행 중에는 두 버튼이 disabled (중복 방지)', async () => {
    let release: (v: string) => void = () => {}
    const onBeforeSubmit = vi.fn(() => new Promise<string>(r => { release = r }))
    renderForm({ onBeforeSubmit })
    fireEvent.click(screen.getByRole('button', { name: /허용|Allow/i }))

    expect(screen.getByRole('button', { name: /허용|Allow/i })).toBeDisabled()
    expect(screen.getByRole('button', { name: /거부|Deny/i })).toBeDisabled()
    release('t')
  })
})
