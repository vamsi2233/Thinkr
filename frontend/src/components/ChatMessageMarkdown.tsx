import type { Components } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { useMemo } from 'react';

export type ChatMessageVariant = 'assistant' | 'user';

export interface ChatMessageMarkdownProps {
  content: string;
  variant: ChatMessageVariant;
}

export function ChatMessageMarkdown({ content, variant }: ChatMessageMarkdownProps) {
  const u = variant === 'user';

  const components = useMemo((): Partial<Components> => {
    const text = u ? 'text-white/95' : 'text-textPrimary';
    const muted = u ? 'text-white/85' : 'text-textSecondary';
    const strongCls = u ? 'font-semibold text-white' : 'font-semibold text-textPrimary';
    const inlineCode = u
      ? 'rounded-md bg-black/30 px-1.5 py-0.5 font-mono text-[0.8125rem] text-white/95 ring-1 ring-white/10'
      : 'rounded-md bg-slate-200/90 px-1.5 py-0.5 font-mono text-[0.8125rem] text-slate-800 ring-1 ring-slate-300/40';
    const fence = u ? 'bg-black/35 text-white/95 ring-1 ring-white/10' : 'bg-slate-900/[0.06] text-slate-800 ring-1 ring-slate-900/[0.06]';
    const link = u
      ? 'font-medium text-white underline decoration-2 underline-offset-2 hover:text-white/90'
      : 'font-medium text-accent underline decoration-accent/40 decoration-2 underline-offset-2 hover:text-accentHover';

    return {
      p: ({ children }) => <p className={`mb-2.5 last:mb-0 leading-relaxed ${text}`}>{children}</p>,
      strong: ({ children }) => <strong className={strongCls}>{children}</strong>,
      em: ({ children }) => <em className={`italic ${muted}`}>{children}</em>,
      del: ({ children }) => <del className={`opacity-75 line-through ${muted}`}>{children}</del>,
      a: ({ href, children }) => (
        <a href={href} target="_blank" rel="noopener noreferrer" className={link}>
          {children}
        </a>
      ),
      ul: ({ children }) => (
        <ul
          className={`my-2.5 list-disc space-y-1.5 pl-5 ${text} ${u ? '[&_li::marker]:text-white/50' : '[&_li::marker]:text-slate-400'}`}
        >
          {children}
        </ul>
      ),
      ol: ({ children }) => (
        <ol
          className={`my-2.5 list-decimal space-y-1.5 pl-5 ${text} ${u ? '[&_li::marker]:text-white/50' : '[&_li::marker]:text-slate-400'}`}
        >
          {children}
        </ol>
      ),
      li: ({ children }) => <li className="leading-relaxed [&>p]:mb-1 [&>p:last-child]:mb-0">{children}</li>,
      blockquote: ({ children }) => (
        <blockquote
          className={`my-3 rounded-r-xl border-l-[3px] py-2 pl-3 pr-2 italic leading-relaxed ${
            u ? 'border-white/45 bg-white/10 text-white/92' : 'border-accent/50 bg-sky-50/60 text-textSecondary'
          }`}
        >
          {children}
        </blockquote>
      ),
      code: ({ className, children, ...props }) => {
        const isBlock = Boolean(className?.includes('language-'));
        if (isBlock) {
          return (
            <code className={`block whitespace-pre font-mono text-[0.8125rem] leading-relaxed ${className}`} {...props}>
              {children}
            </code>
          );
        }
        return (
          <code className={inlineCode} {...props}>
            {children}
          </code>
        );
      },
      pre: ({ children }) => (
        <pre className={`my-3 overflow-x-auto rounded-xl p-3.5 font-mono text-[0.8125rem] leading-relaxed ${fence}`}>{children}</pre>
      ),
      h1: ({ children }) => (
        <h2 className={`mb-2 mt-4 first:mt-0 text-base font-bold tracking-tight ${u ? 'text-white' : 'text-textPrimary'}`}>{children}</h2>
      ),
      h2: ({ children }) => (
        <h3 className={`mb-2 mt-3.5 first:mt-0 text-[15px] font-bold tracking-tight ${u ? 'text-white' : 'text-textPrimary'}`}>{children}</h3>
      ),
      h3: ({ children }) => (
        <h4 className={`mb-1.5 mt-3 first:mt-0 text-[15px] font-semibold tracking-tight ${u ? 'text-white' : 'text-textPrimary'}`}>{children}</h4>
      ),
      hr: () => <hr className={`my-4 border-0 border-t ${u ? 'border-white/25' : 'border-slate-200/90'}`} />,
      table: ({ children }) => (
        <div
          className={`my-3 overflow-x-auto rounded-xl border ${u ? 'border-white/20 bg-black/20' : 'border-slate-200/80 bg-white/60'}`}
        >
          <table className={`min-w-full border-collapse text-left text-sm ${text}`}>{children}</table>
        </div>
      ),
      thead: ({ children }) => <thead className={u ? 'border-b border-white/25' : 'border-b border-slate-200'}>{children}</thead>,
      th: ({ children }) => (
        <th className={`px-3 py-2 font-semibold ${u ? 'bg-white/10 text-white' : 'bg-slate-50 text-textPrimary'}`}>{children}</th>
      ),
      td: ({ children }) => <td className={`border-t px-3 py-2 ${u ? 'border-white/15' : 'border-slate-100'}`}>{children}</td>,
      tr: ({ children }) => <tr>{children}</tr>,
      tbody: ({ children }) => <tbody>{children}</tbody>,
      input: ({ type, checked, disabled, ...props }) => {
        if (type === 'checkbox') {
          return (
            <input
              type="checkbox"
              checked={checked}
              readOnly
              disabled={disabled}
              className="mr-2 align-middle accent-accent"
              {...props}
            />
          );
        }
        return <input type={type} {...props} />;
      },
    };
  }, [u]);

  return (
    <div className="chat-markdown min-w-0">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
