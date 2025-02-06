import { withWidget } from '../withWidget';
import { CodeExecutionWidget as CodeExecutionWidgetClass } from './code-execution-widget';
import type { CodeExecutionData } from './code-execution-widget';

export type CodeExecutionWidgetProps = CodeExecutionData;

export const CodeExecutionWidget = withWidget<CodeExecutionWidgetProps>(
  CodeExecutionWidgetClass,
  'CodeExecutionWidget'
); 