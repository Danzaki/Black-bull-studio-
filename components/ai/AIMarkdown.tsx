'use client';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Check, Copy } from 'lucide-react';

function CodeBlock({ code, lang }: { code: string; lang: string }) {
  const [ok, setOk] = useState(false);
  return (
    <div className="my-2 overflow-hidden rounded-lg border border-bbl-text/10 bg-bbl-text/5">
      <div className="flex items-center justify-between px-3 py-1 text-[11px] text-bbl-muted">
        <span>{lang || 'code'}</span>
        <button
          type="button"
          onClick={() => {
            void navigator.clipboard?.writeText(code);
            setOk(true);
            setTimeout(() => setOk(false), 1500);
          }}
          className="flex items-center gap-1"
        >
          {ok ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />} {ok ? 'Copied' : 'Copy'}
        </button>
      </div>
      <pre className="overflow-x-auto px-3 pb-3 text-xs"><code>{code}</code></pre>
    </div>
  );
}

export default function AIMarkdown({ text }: { text: string }) {
  return (
    <div className="space-y-2 text-sm leading-relaxed [overflow-wrap:anywhere]">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          p: (p: any) => <p>{p.children}</p>,
          ul: (p: any) => <ul className="list-disc space-y-1 pl-5">{p.children}</ul>,
          ol: (p: any) => <ol className="list-decimal space-y-1 pl-5">{p.children}</ol>,
          h1: (p: any) => <h3 className="text-base font-semibold">{p.children}</h3>,
          h2: (p: any) => <h3 className="text-base font-semibold">{p.children}</h3>,
          h3: (p: any) => <h4 className="font-semibold">{p.children}</h4>,
          strong: (p: any) => <strong className="font-semibold">{p.children}</strong>,
          a: (p: any) =>
            /^https?:\/\//i.test(p.href || '') ? (
              <a href={p.href} target="_blank" rel="noopener noreferrer" className="text-bbl-accent underline">{p.children}</a>
            ) : (
              <span>{p.children}</span>
            ),
          table: (p: any) => <div className="overflow-x-auto"><table className="w-full text-xs">{p.children}</table></div>,
          th: (p: any) => <th className="border-b border-bbl-text/20 px-2 py-1 text-left font-semibold">{p.children}</th>,
          td: (p: any) => <td className="border-b border-bbl-text/10 px-2 py-1">{p.children}</td>,
          pre: (p: any) => <>{p.children}</>,
          code: (p: any) => {
            const s = String(p.children ?? '');
            const lang = /language-(\w+)/.exec(p.className || '')?.[1];
            if (lang || s.includes('\n')) return <CodeBlock code={s.replace(/\n$/, '')} lang={lang || ''} />;
            return <code className="rounded bg-bbl-text/10 px-1 py-0.5 text-[0.85em]">{p.children}</code>;
          },
        }}
      >
        {text}
      </ReactMarkdown>
    </div>
  );
}
