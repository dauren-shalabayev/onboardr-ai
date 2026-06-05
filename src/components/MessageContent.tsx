import type { ReactNode } from "react";

const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const URL_REGEX = /(https?:\/\/[^\s<>"']+|www\.[^\s<>"']+)/gi;

function trimTrailingPunctuation(url: string) {
  let trimmed = url;
  let trailing = "";
  while (/[.,;:!?)\]}]$/.test(trimmed)) {
    trailing = trimmed.slice(-1) + trailing;
    trimmed = trimmed.slice(0, -1);
  }
  return { url: trimmed, trailing };
}

function Link({
  href,
  children,
  variant,
}: {
  href: string;
  children: ReactNode;
  variant: "user" | "assistant";
}) {
  const className =
    variant === "user"
      ? "underline underline-offset-2 opacity-90 hover:opacity-100"
      : "text-primary underline underline-offset-2 hover:opacity-80";

  return (
    <a href={href} target="_blank" rel="noopener noreferrer" className={className}>
      {children}
    </a>
  );
}

function linkifyPlainText(text: string, variant: "user" | "assistant", keyPrefix: string) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(URL_REGEX.source, "gi");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(text.slice(lastIndex, match.index));
    }
    const { url, trailing } = trimTrailingPunctuation(match[0]);
    const href = url.startsWith("www.") ? `https://${url}` : url;
    nodes.push(
      <Link key={`${keyPrefix}-${match.index}`} href={href} variant={variant}>
        {url}
      </Link>
    );
    if (trailing) nodes.push(trailing);
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) nodes.push(text.slice(lastIndex));
  return nodes;
}

export function MessageContent({
  text,
  variant,
}: {
  text: string;
  variant: "user" | "assistant";
}) {
  const nodes: ReactNode[] = [];
  let lastIndex = 0;
  const regex = new RegExp(MARKDOWN_LINK_REGEX.source, "g");
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      nodes.push(...linkifyPlainText(text.slice(lastIndex, match.index), variant, `pre-${match.index}`));
    }
    nodes.push(
      <Link key={`md-${match.index}`} href={match[2]} variant={variant}>
        {match[1]}
      </Link>
    );
    lastIndex = match.index + match[0].length;
  }

  if (lastIndex < text.length) {
    nodes.push(...linkifyPlainText(text.slice(lastIndex), variant, `tail-${lastIndex}`));
  }

  return <>{nodes.length > 0 ? nodes : text}</>;
}
