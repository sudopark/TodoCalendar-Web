// lunar-javascript 는 타입 선언을 제공하지 않는다. 반복 음력 계산에 쓰는 최소 표면만 선언.
declare module 'lunar-javascript' {
  export interface LunarLike {
    getYear(): number
    getMonth(): number // 윤달은 음수로 표현
    getDay(): number
    getSolar(): SolarLike
  }
  export interface SolarLike {
    getYear(): number
    getMonth(): number
    getDay(): number
    getLunar(): LunarLike
  }
  export const Lunar: {
    fromYmd(year: number, month: number, day: number): LunarLike
  }
  export const Solar: {
    fromYmd(year: number, month: number, day: number): SolarLike
  }
}
