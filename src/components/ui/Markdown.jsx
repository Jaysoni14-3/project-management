import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/* App-wide Markdown renderer.
   - GFM enabled (tables, strikethrough, task lists, autolinks)
   - Tailwind classes mapped per-element so output respects the design
     system tokens instead of leaning on @tailwindcss/typography
   - `<a href="user:<id>">` is intercepted later by the Mentions feature
     to render a styled chip; we leave the default <a> rendering alone
     here so this component stays focused on plain markdown
*/

const components = {
  p: ({ node, ...props }) => (
    <p className="text-bodySm text-fg leading-relaxed mb-sm last:mb-0" {...props} />
  ),
  h1: ({ node, ...props }) => (
    <h1 className="text-section text-fg mt-md mb-sm first:mt-0" {...props} />
  ),
  h2: ({ node, ...props }) => (
    <h2 className="text-section text-fg mt-md mb-sm first:mt-0" {...props} />
  ),
  h3: ({ node, ...props }) => (
    <h3 className="text-bodySm font-semibold text-fg mt-md mb-xs first:mt-0" {...props} />
  ),
  ul: ({ node, ordered, ...props }) => (
    <ul className="list-disc pl-lg mb-sm space-y-[2px] text-bodySm text-fg" {...props} />
  ),
  ol: ({ node, ordered, ...props }) => (
    <ol className="list-decimal pl-lg mb-sm space-y-[2px] text-bodySm text-fg" {...props} />
  ),
  li: ({ node, ordered, checked, ...props }) => {
    /* GFM task list items render as `<li>` with a `checked` boolean.
       react-markdown injects an `<input>` first child for them;
       restyle the marker so it doesn't look like a default browser
       checkbox out of nowhere. */
    if (typeof checked === "boolean") {
      return (
        <li className="list-none -ml-lg pl-0 flex items-start gap-xs" {...props} />
      );
    }
    return <li className="leading-relaxed" {...props} />;
  },
  a: ({ node, href, children, ...props }) => {
    /* Custom URL scheme `user:<id>` carries an @-mention. The display
       text is whatever was typed inside the brackets ("@Priya"); we
       just style it as a chip so it stands out from regular prose. */
    if (typeof href === "string" && href.startsWith("user:")) {
      return (
        <span
          className="inline-flex items-center px-[6px] py-[1px] rounded-xs
            bg-accent-soft text-accent text-[0.92em] font-medium
            align-baseline"
          {...props}
        >
          {children}
        </span>
      );
    }
    return (
      <a
        href={href}
        target={href?.startsWith("http") ? "_blank" : undefined}
        rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
        className="text-accent hover:text-accent-hover underline underline-offset-2 transition-colors duration-fast"
        {...props}
      >
        {children}
      </a>
    );
  },
  code: ({ node, inline, className, children, ...props }) =>
    inline ? (
      <code
        className="px-[5px] py-[1px] rounded-xs bg-subtle text-fg text-[0.92em] font-mono"
        {...props}
      >
        {children}
      </code>
    ) : (
      <code className="block w-full font-mono text-bodySm leading-relaxed" {...props}>
        {children}
      </code>
    ),
  pre: ({ node, ...props }) => (
    <pre
      className="bg-canvas border border-line-subtle rounded-md p-sm overflow-x-auto mb-sm text-bodySm"
      {...props}
    />
  ),
  blockquote: ({ node, ...props }) => (
    <blockquote
      className="border-l-2 border-line-strong pl-md text-fg-muted italic mb-sm"
      {...props}
    />
  ),
  hr: () => <hr className="border-line-subtle my-md" />,
  table: ({ node, ...props }) => (
    <div className="overflow-x-auto mb-sm">
      <table className="text-bodySm w-full border-collapse" {...props} />
    </div>
  ),
  th: ({ node, ...props }) => (
    <th
      className="text-left text-label uppercase text-fg-muted px-sm py-xs border-b border-line"
      {...props}
    />
  ),
  td: ({ node, ...props }) => (
    <td className="px-sm py-xs border-b border-line-subtle" {...props} />
  ),
  strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
  em: ({ node, ...props }) => <em className="italic" {...props} />,
};

/* Pre-process: rewrite plain `@FirstName` tokens into a markdown
   link `[@FirstName](user:<id>)` whenever the first word of a
   member's name matches. The link's `user:` URL scheme is then
   intercepted by the `<a>` renderer above to produce a styled chip.
   No-match tokens are left as plain text. */
const decorateMentions = (body, members) => {
  if (!body || !members?.length) return body;
  const byFirst = new Map();
  for (const m of members) {
    const first = (m.name || "").split(/\s+/)[0]?.toLowerCase();
    if (first && !byFirst.has(first)) byFirst.set(first, m);
  }
  return body.replace(
    /(^|[\s\W])@([A-Za-z][A-Za-z0-9_-]*)/g,
    (full, lead, name) => {
      const member = byFirst.get(name.toLowerCase());
      if (!member) return full;
      const display = member.name?.split(/\s+/)[0] || name;
      return `${lead}[@${display}](user:${member.id})`;
    }
  );
};

/* `value` is the raw markdown string. Empty/whitespace-only input
   renders nothing so call sites don't have to gate themselves.
   Pass `members` to enable @-mention chip rendering; surfaces that
   don't have a member list (e.g. read-only descriptions) can omit
   it and `@FirstName` will render as plain text. */
const Markdown = ({ value, members, className = "" }) => {
  if (!value || !String(value).trim()) return null;
  const decorated = decorateMentions(value, members);
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {decorated}
      </ReactMarkdown>
    </div>
  );
};

export default Markdown;
