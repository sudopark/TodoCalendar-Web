const loaders = import.meta.glob('../locales/*.json') as Record<
  string,
  () => Promise<{ default: Record<string, string> }>
>

/** 언어 코드에 대응하는 로케일 번들 dynamic import. 파일이 없으면 undefined. */
export function loaderFor(lng: string) {
  return loaders[`../locales/${lng}.json`]
}
