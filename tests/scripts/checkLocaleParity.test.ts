import { placeholdersOf, duplicateKeysOf, checkLocale } from '../../scripts/check-locale-parity.mjs'

describe('placeholdersOf', () => {
  test('중괄호 플레이스홀더를 정렬해서 뽑는다', () => {
    // given / when
    const result = placeholdersOf('{{nth}} {{day}} of every month')
    // then
    expect(result).toEqual(['{{day}}', '{{nth}}'])
  })

  test('플레이스홀더가 없으면 빈 배열이다', () => {
    expect(placeholdersOf('Yearly')).toEqual([])
  })

  test('같은 플레이스홀더가 두 번 나오면 두 번 센다', () => {
    expect(placeholdersOf('{{day}} ~ {{day}}')).toEqual(['{{day}}', '{{day}}'])
  })
})

describe('duplicateKeysOf', () => {
  test('같은 키가 두 번 나오면 검출한다', () => {
    const raw = '{\n "a.b": "1",\n "c.d": "2",\n "a.b": "3"\n}'
    expect(duplicateKeysOf(raw)).toEqual(['a.b'])
  })

  test('중복이 없으면 빈 배열이다', () => {
    expect(duplicateKeysOf('{\n "a.b": "1",\n "c.d": "2"\n}')).toEqual([])
  })
})

describe('checkLocale', () => {
  const reference = {
    'nav.calendar': 'Calendar',
    'repeating.detail_n_times': '{{count}} times',
    'dev.seeder.start': 'Seeding',
  }

  test('키와 플레이스홀더가 모두 맞으면 위반이 없다', () => {
    const target = { 'nav.calendar': '달력', 'repeating.detail_n_times': '{{count}}회' }
    const raw = JSON.stringify(target)
    expect(checkLocale(reference, target, raw, 'ko')).toEqual([])
  })

  test('키가 빠지면 위반으로 보고한다', () => {
    const target = { 'repeating.detail_n_times': '{{count}}회' }
    const violations = checkLocale(reference, target, JSON.stringify(target), 'ko')
    expect(violations.join('\n')).toContain('nav.calendar')
  })

  test('en 에 없는 키가 있으면 위반으로 보고한다', () => {
    const target = { 'nav.calendar': '달력', 'repeating.detail_n_times': '{{count}}회', 'zz.extra': '잉여' }
    const violations = checkLocale(reference, target, JSON.stringify(target), 'ko')
    expect(violations.join('\n')).toContain('zz.extra')
  })

  test('플레이스홀더 이름이 다르면 위반으로 보고한다', () => {
    const target = { 'nav.calendar': '달력', 'repeating.detail_n_times': '{{cnt}}회' }
    const violations = checkLocale(reference, target, JSON.stringify(target), 'ko')
    expect(violations.join('\n')).toContain('repeating.detail_n_times')
  })

  test('dev. 로 시작하는 키는 없어도 위반이 아니다', () => {
    const target = { 'nav.calendar': '달력', 'repeating.detail_n_times': '{{count}}회' }
    expect(checkLocale(reference, target, JSON.stringify(target), 'ko')).toEqual([])
  })

  test('중복 키가 있으면 위반으로 보고한다', () => {
    const raw = '{\n "nav.calendar": "달력",\n "repeating.detail_n_times": "{{count}}회",\n "nav.calendar": "캘린더"\n}'
    const violations = checkLocale(reference, JSON.parse(raw), raw, 'ko')
    expect(violations.join('\n')).toContain('중복')
  })
})
