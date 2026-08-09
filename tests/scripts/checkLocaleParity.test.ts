import { placeholdersOf, duplicateKeysOf, checkLocale, diffLanguageFiles } from '../../scripts/check-locale-parity.mjs'

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

  test('문자열이 아닌 값이면 TypeError 대신 읽을 수 있는 표식을 반환한다', () => {
    // given / when / then
    expect(() => placeholdersOf(42)).not.toThrow()
    expect(placeholdersOf(42)).toEqual(['(문자열 아님: number)'])
    expect(placeholdersOf(null)).toEqual(['(문자열 아님: object)'])
  })
})

describe('diffLanguageFiles', () => {
  test('지원 언어인데 파일이 없으면 missing 으로 보고한다', () => {
    // given / when
    const { unknown, missing } = diffLanguageFiles(['en', 'ko'], ['en', 'ko', 'ja'])
    // then
    expect(missing).toEqual(['ja'])
    expect(unknown).toEqual([])
  })

  test('지원 목록에 없는 파일이 있으면 unknown 으로 보고한다', () => {
    // given / when
    const { unknown, missing } = diffLanguageFiles(['en', 'ko', 'zz'], ['en', 'ko'])
    // then
    expect(unknown).toEqual(['zz'])
    expect(missing).toEqual([])
  })

  test('대소문자가 틀린 파일명은 unknown 이면서 정식 코드는 missing 으로도 잡힌다', () => {
    // given — zh-Hans 가 지원 목록에 있는데 파일은 소문자 zh-hans.json 으로 잘못 저장된 경우
    const { unknown, missing } = diffLanguageFiles(['en', 'zh-hans'], ['en', 'zh-Hans'])
    // then
    expect(unknown).toEqual(['zh-hans'])
    expect(missing).toEqual(['zh-Hans'])
  })

  test('en 은 파일이 없어도 missing 대상이 아니다', () => {
    // given / when
    const { missing } = diffLanguageFiles(['ko'], ['en', 'ko'])
    // then
    expect(missing).toEqual([])
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

  test('한 줄로 압축된(minified) JSON 이어도 같은 줄 위의 중복을 검출한다', () => {
    // given — 개행 없는 compact JSON, "a.b" 가 한 줄 안에서 두 번
    const raw = '{"a.b":"1","c.d":"2","a.b":"3"}'
    expect(duplicateKeysOf(raw)).toEqual(['a.b'])
  })

  test('값 문자열 안의 "따옴표+콜론" 시퀀스를 key 로 오인하지 않는다', () => {
    // given — value 안에 이스케이프된 큰따옴표 뒤에 콜론이 오는 문자열(`\": `)이 포함됨
    const raw = '{\n "a.b": "He said \\": there\\"",\n "c.d": "2"\n}'
    expect(duplicateKeysOf(raw)).toEqual([])
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

  test('값이 문자열이 아니면 TypeError 없이 플레이스홀더 불일치로 보고한다', () => {
    const target = { 'nav.calendar': '달력', 'repeating.detail_n_times': 42 }
    const raw = JSON.stringify(target)
    expect(() => checkLocale(reference, target, raw, 'ko')).not.toThrow()
    const violations = checkLocale(reference, target, raw, 'ko')
    expect(violations.join('\n')).toContain('repeating.detail_n_times')
  })
})
