import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'safeMarkdown',
  standalone: true,
})
export class SafeMarkdownPipe implements PipeTransform {
  transform(value: string | null | undefined): string {
    if (!value) return '';

    // 1. Strictly escape all HTML characters first to eliminate any XSS vulnerability
    let escaped = value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');

    // 2. Multi-line code block: ```code```
    escaped = escaped.replace(/```([\s\S]*?)```/g, '<pre class="md-code-block"><code>$1</code></pre>');

    // 3. Inline code: `code`
    escaped = escaped.replace(/`([^`]+)`/g, '<code class="md-inline-code">$1</code>');

    // 4. Bold: **text**
    escaped = escaped.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // 5. Italic: *text*
    escaped = escaped.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    // 5.5 Auto-linkify URLs (http:// or https://)
    escaped = escaped.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank" rel="noopener noreferrer" class="md-link">$1</a>'
    );

    // 6. Unordered lists: - item or * item
    const lines = escaped.split('\n');
    let inList = false;
    const processedLines: string[] = [];

    for (const line of lines) {
      const listMatch = line.match(/^(\s*)[-*]\s+(.+)$/);
      if (listMatch) {
        if (!inList) {
          processedLines.push('<ul class="md-list">');
          inList = true;
        }
        processedLines.push(`<li>${listMatch[2]}</li>`);
      } else {
        if (inList) {
          processedLines.push('</ul>');
          inList = false;
        }
        if (line.trim().length > 0) {
          processedLines.push(`<p>${line}</p>`);
        }
      }
    }

    if (inList) {
      processedLines.push('</ul>');
    }

    return processedLines.join('');
  }
}
