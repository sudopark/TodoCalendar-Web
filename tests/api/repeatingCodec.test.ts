import { describe, it, expect } from 'vitest'
import { repeatingFromServer, repeatingToServer } from '../../src/api/repeatingCodec'
import type { Repeating } from '../../src/models'

// 서버 weekday 인코딩: 1=일..7=토 (iOS CodableMapper). web: 0=일..6=토 (Date.getDay).
// fromServer: server(1..7) -> web(0..6) = -1
// toServer:   web(0..6) -> server(1..7) = +1

describe('repeatingCodec', () => {
  describe('every_week.dayOfWeek 변환', () => {
    it('서버에서 받은 목요일(5)을 web getDay 목요일(4)로 변환한다', () => {
      // given: 서버가 보낸 격주 목요일 반복 (정기청소 케이스)
      const server: Repeating = {
        start: 1770267600,
        option: { optionType: 'every_week', interval: 2, dayOfWeek: [5], timeZone: 'Asia/Seoul' },
      }
      // when
      const web = repeatingFromServer(server)
      // then
      expect(web.option).toMatchObject({ optionType: 'every_week', dayOfWeek: [4] })
    })

    it('web getDay 목요일(4)을 서버 목요일(5)로 변환해 내보낸다', () => {
      // given
      const web: Repeating = {
        start: 1770267600,
        option: { optionType: 'every_week', interval: 2, dayOfWeek: [4], timeZone: 'Asia/Seoul' },
      }
      // when
      const server = repeatingToServer(web)
      // then
      expect(server.option).toMatchObject({ optionType: 'every_week', dayOfWeek: [5] })
    })

    it('일요일·토요일 경계를 양방향으로 변환한다 (서버 1/7 <-> web 0/6)', () => {
      // given
      const server: Repeating = {
        start: 0,
        option: { optionType: 'every_week', interval: 1, dayOfWeek: [1, 7], timeZone: 'Asia/Seoul' },
      }
      // when / then
      const web = repeatingFromServer(server)
      expect((web.option as any).dayOfWeek).toEqual([0, 6])
      expect((repeatingToServer(web).option as any).dayOfWeek).toEqual([1, 7])
    })
  })

  describe('every_year.dayOfWeek 변환', () => {
    it('연 반복의 dayOfWeek 도 양방향 변환한다', () => {
      // given
      const server: Repeating = {
        start: 0,
        option: {
          optionType: 'every_year', interval: 1, months: [3],
          weekOrdinals: [{ seq: 1, isLast: false }], dayOfWeek: [5], timeZone: 'Asia/Seoul',
        },
      }
      // when / then
      const web = repeatingFromServer(server)
      expect((web.option as any).dayOfWeek).toEqual([4])
      // weekOrdinals.seq 는 weekday 가 아니므로 건드리지 않는다
      expect((web.option as any).weekOrdinals).toEqual([{ seq: 1, isLast: false }])
    })
  })

  describe('every_month weekDays 변환', () => {
    it('주차 모드의 weekDays 를 변환하고 weekOrdinals 는 보존한다', () => {
      // given
      const server: Repeating = {
        start: 0,
        option: {
          optionType: 'every_month', interval: 1,
          monthDaySelection: { weekOrdinals: [{ isLast: true }], weekDays: [1, 5] },
          timeZone: 'Asia/Seoul',
        },
      }
      // when
      const web = repeatingFromServer(server)
      // then
      const sel = (web.option as any).monthDaySelection
      expect(sel.weekDays).toEqual([0, 4])
      expect(sel.weekOrdinals).toEqual([{ isLast: true }])
    })

    it('days 모드(요일 없음)는 그대로 둔다', () => {
      // given
      const server: Repeating = {
        start: 0,
        option: {
          optionType: 'every_month', interval: 1,
          monthDaySelection: { days: [1, 15, 31] }, timeZone: 'Asia/Seoul',
        },
      }
      // when / then
      expect(repeatingFromServer(server).option).toEqual(server.option)
    })
  })

  describe('weekday 가 없는 옵션은 무변경', () => {
    it('every_day 는 변환 영향이 없다', () => {
      // given
      const server: Repeating = { start: 0, option: { optionType: 'every_day', interval: 3 } }
      // when / then
      expect(repeatingFromServer(server)).toEqual(server)
      expect(repeatingToServer(server)).toEqual(server)
    })
  })

  describe('무손실/불변', () => {
    it('round-trip(toServer∘fromServer)은 원본과 같다', () => {
      // given
      const server: Repeating = {
        start: 1770267600,
        end: 1800000000,
        end_count: 10,
        option: { optionType: 'every_week', interval: 2, dayOfWeek: [1, 5, 7], timeZone: 'Asia/Seoul' },
      }
      // when / then
      expect(repeatingToServer(repeatingFromServer(server))).toEqual(server)
    })

    it('입력 객체를 mutate 하지 않는다', () => {
      // given
      const server: Repeating = {
        start: 0,
        option: { optionType: 'every_week', interval: 1, dayOfWeek: [5], timeZone: 'Asia/Seoul' },
      }
      const snapshot = JSON.parse(JSON.stringify(server))
      // when
      repeatingFromServer(server)
      // then
      expect(server).toEqual(snapshot)
    })
  })
})
