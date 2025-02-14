import { BaseWidget, BaseWidgetData } from '../base/base-widget';
import './code-execution-widget.scss';

export interface CodeExecutionData extends BaseWidgetData {
  language: string;
  code: string;
  output: string;
  outcome: 'success' | 'error';
}

export class CodeExecutionWidget extends BaseWidget<CodeExecutionData> {
  private readonly widgetId: string;

  constructor(data?: CodeExecutionData) {
    super('Code Execution');
    this.widgetId = `code-exec-${Math.random().toString(36).substring(2, 9)}`;
    this.data = {
      title: 'Code Execution',
      language: 'python',
      code: '',
      output: '',
      outcome: 'success',
      ...data
    };
  }

  private tryParseOutput(output: string): string {
    try {
      const json = JSON.parse(output);
      return JSON.stringify(json, null, 2);
    } catch (e) {
      return output;
    }
  }

  async render(data: CodeExecutionData = this.data): Promise<string> {
    const parsedOutput = this.tryParseOutput(data.output);
    const language = data.language === 'python' ? 'python' :
                    data.language === 'javascript' ? 'javascript' :
                    'json';

    return `
      <div class="code-execution-widget">
        <div class="code-section">
          <div class="section-header">
            <span class="language-badge">${data.language.toUpperCase()}</span>
            <span class="material-symbols-outlined">code</span>
          </div>
          <pre><code class="language-${language}">${data.code}</code></pre>
        </div>

        <div class="execution-result ${data.outcome}">
          <div class="section-header">
            <span class="outcome-badge ${data.outcome}">
              <span class="material-symbols-outlined">
                ${data.outcome === 'success' ? 'check_circle' : 'error'}
              </span>
              ${data.outcome.toUpperCase()}
            </span>
            <span class="material-symbols-outlined">terminal</span>
          </div>
          <pre><code class="language-${language}">${parsedOutput}</code></pre>
        </div>
      </div>
    `;
  }

  async postRender(element: HTMLElement, data: CodeExecutionData): Promise<void> {
    try {
      const hljs = (await import('highlight.js')).default;
      const languages = data.language === 'python' ? ['python'] :
                       data.language === 'javascript' ? ['javascript'] :
                       ['json'];

      // Load specific language support
      await Promise.all(languages.map(lang =>
        import(`highlight.js/lib/languages/${lang}`)
          .then(module => hljs.registerLanguage(lang, module.default))
      ));

      element.querySelectorAll('pre code').forEach((block) => {
        hljs.highlightElement(block as HTMLElement);

        // Add copy button similar to logger
        const copyButton = document.createElement('button');
        copyButton.className = 'copy-button';
        copyButton.innerHTML = `
          <span class="material-symbols-outlined">content_copy</span>
        `;
        copyButton.onclick = () => {
          navigator.clipboard.writeText(block.textContent || '');
        };
        if (block.parentElement) {
            block.parentElement.prepend(copyButton);
        }
      });

    } catch (error) {
      console.error('Code highlighting failed:', error);
        if (element) {
            element.innerHTML = this.createErrorState(
                error instanceof Error ? error.message : 'Code highlighting failed'
            )
        }
    }
  }

    // Add a loading state method
    createLoadingState(): string {
        return `
      <div class="loading-state">
        <span class="material-symbols-outlined animate-spin">refresh</span>
        <div class="loading-message">Loading...</div>
      </div>
    `;
    }

    createErrorState(message: string): string {
        return `
      <div class="error-state">
        <span class="material-symbols-outlined">error</span>
        <div class="error-message">${message}</div>
      </div>
    `;
    }

  destroy(): void {
    // Cleanup if needed
  }
} 