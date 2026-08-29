import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { ExternalLink } from '@/components/common/LinkConfirm';

const REMARK_PLUGINS = [remarkGfm, remarkBreaks];

function MarkdownLink({ href, children, node: _node, ...rest }) {
  if (!href) return children;
  if (/^https?:\/\//i.test(href)) {
    return (
      <ExternalLink href={href} {...rest}>
        {children}
      </ExternalLink>
    );
  }
  return (
    <a href={href} {...rest}>
      {children}
    </a>
  );
}

const MARKDOWN_COMPONENTS = {
  a: MarkdownLink,
};

const ModsMarkdown = ({ children, className }) => {
  if (!children) return null;
  return (
    <div className={className}>
      <ReactMarkdown remarkPlugins={REMARK_PLUGINS} components={MARKDOWN_COMPONENTS}>
        {children}
      </ReactMarkdown>
    </div>
  );
};

export default ModsMarkdown;
