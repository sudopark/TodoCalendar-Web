// 태그 색에 2자리 hex alpha 를 덧붙인다.
// base 가 6자리(#RRGGBB)면 그대로 덧붙이고, iOS 가 만든 태그처럼 8자리(#RRGGBBAA, alpha 포함)면
// 기존 alpha 를 떼고 6자리에 덧붙여 유효한 hex 를 만든다. 그냥 문자열로 이으면 8자리는
// #RRGGBBAA88(10자리) 가 돼 무효 CSS → 배경이 통째로 투명해진다 (#192).
// 6/8자리 hex 가 아니면(named/rgb 등) 원본을 그대로 반환한다 (덧붙이면 깨지므로).
export function withAlpha(color: string, alphaHex: string): string {
  const m = /^#([0-9a-fA-F]{6})(?:[0-9a-fA-F]{2})?$/.exec(color)
  return m ? `#${m[1]}${alphaHex}` : color
}
