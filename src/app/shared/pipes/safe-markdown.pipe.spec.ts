import { describe, it, expect } from 'vitest';
import { SafeMarkdownPipe } from './safe-markdown.pipe';

describe('SafeMarkdownPipe', () => {
  const pipe = new SafeMarkdownPipe();

  it('should escape dangerous HTML script tags to prevent XSS', () => {
    const raw = '<script>alert("xss")</script>';
    const result = pipe.transform(raw);
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should parse bold markdown syntax', () => {
    const raw = 'Isto é **importante**';
    const result = pipe.transform(raw);
    expect(result).toContain('<strong>importante</strong>');
  });

  it('should parse inline code syntax', () => {
    const raw = 'Execute `npm run build`';
    const result = pipe.transform(raw);
    expect(result).toContain('<code class="md-inline-code">npm run build</code>');
  });

  it('should parse bullet list syntax', () => {
    const raw = '- Item 1\n- Item 2';
    const result = pipe.transform(raw);
    expect(result).toContain('<ul class="md-list">');
    expect(result).toContain('<li>Item 1</li>');
  });
});
