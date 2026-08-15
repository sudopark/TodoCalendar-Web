import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { Link } from 'react-router-dom'
import type { DocLanguage } from '../../domain/publicDocs'
import { rewriteDocLink } from './rewriteDocLink'

interface Props {
  markdown: string
  lang: DocLanguage
}

const linkClass = 'text-brand underline underline-offset-2'

export function MarkdownContent({ markdown, lang }: Props) {
  return (
    <div className="text-[15px] leading-7 text-fg-secondary">
      <Markdown
        remarkPlugins={[remarkGfm]}
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
          a: ({ href, children }) => {
            const target = rewriteDocLink(href, lang)
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
