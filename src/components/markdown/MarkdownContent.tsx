import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeSanitize, { defaultSchema } from 'rehype-sanitize'
import rehypeSlug from 'rehype-slug'
import { Link } from 'react-router-dom'
import type { DocLanguage, PublicDoc } from '../../domain/publicDocs'
import { rewriteDocLink } from './rewriteDocLink'

interface Props {
  markdown: string
  lang: DocLanguage
  /** 다중 페이지 문서 안에서 형제 문서 링크를 풀 때 쓴다. */
  doc?: PublicDoc
}

const linkClass = 'text-brand underline underline-offset-2'

// 안내 문서는 스크린샷을 raw <img> 로 넣는다. GitHub 이 쓰는 허용 목록에 크기 속성만 더해
// 임의 HTML·이벤트 핸들러는 그대로 막으면서 이미지가 원문 크기대로 뜨게 한다.
const markdownSchema = {
  ...defaultSchema,
  attributes: {
    ...defaultSchema.attributes,
    img: [...(defaultSchema.attributes?.img ?? []), 'width', 'height'],
  },
}

export function MarkdownContent({ markdown, lang, doc }: Props) {
  return (
    <div className="text-[15px] leading-7 text-fg-secondary">
      <Markdown
        remarkPlugins={[remarkGfm]}
        // slug 는 sanitize 뒤에 둔다 — defaultSchema 가 입력의 id 에 user-content- 접두어를
        // 붙여 버려서, 먼저 달면 md 안의 `#앵커` 링크와 어긋난다.
        rehypePlugins={[rehypeRaw, [rehypeSanitize, markdownSchema], rehypeSlug]}
        components={{
          // react-markdown v10 은 hast `node` 를 함께 넘긴다. DOM 요소에 그대로 spread 하면
          // React 가 알 수 없는 prop 이라고 경고하므로 구조분해로 걷어낸다.
          h1: ({ node, ...props }) => <h1 className="mt-10 mb-4 text-2xl font-bold text-fg first:mt-0" {...props} />,
          h2: ({ node, ...props }) => <h2 className="mt-8 mb-3 text-xl font-semibold text-fg" {...props} />,
          h3: ({ node, ...props }) => <h3 className="mt-6 mb-2 text-base font-semibold text-fg" {...props} />,
          p: ({ node, ...props }) => <p className="my-4" {...props} />,
          ul: ({ node, ...props }) => <ul className="my-4 list-disc space-y-1 pl-5" {...props} />,
          ol: ({ node, ...props }) => <ol className="my-4 list-decimal space-y-1 pl-5" {...props} />,
          li: ({ node, ...props }) => <li className="pl-1" {...props} />,
          strong: ({ node, ...props }) => <strong className="font-semibold text-fg" {...props} />,
          hr: ({ node, ...props }) => <hr className="my-8 border-line" {...props} />,
          blockquote: ({ node, ...props }) => (
            <blockquote className="my-4 border-l-2 border-line pl-4 text-fg-tertiary" {...props} />
          ),
          code: ({ node, ...props }) => (
            <code className="rounded bg-surface-sunken px-1 py-0.5 text-[0.9em]" {...props} />
          ),
          table: ({ node, ...props }) => (
            <div className="my-4 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...props} />
            </div>
          ),
          th: ({ node, ...props }) => (
            <th className="border border-line px-3 py-2 text-left font-semibold text-fg" {...props} />
          ),
          td: ({ node, ...props }) => <td className="border border-line px-3 py-2 align-top" {...props} />,
          img: ({ node, ...props }) => (
            <img
              {...props}
              loading="lazy"
              className="my-6 h-auto max-w-full rounded-xl border border-line"
            />
          ),
          a: ({ href, children }) => {
            const target = rewriteDocLink(href, lang, doc)
            if (target.kind === 'internal') {
              return <Link to={target.to} className={linkClass}>{children}</Link>
            }
            if (target.kind === 'anchor') {
              return <a href={target.href} className={linkClass}>{children}</a>
            }
            return (
              <a href={target.href} target="_blank" rel="noreferrer" className={linkClass}>
                {children}
              </a>
            )
          },
        }}
      >
        {markdown}
      </Markdown>
    </div>
  )
}
