import React from 'react';
import { BaseWidget } from '../base/base-widget';
import type { ExplainerData, ExplanationSection } from './explainer-widget';
import './explainer-widget.scss';
import { withWidget } from '../withWidget';
import { ExplainerWidget as ExplainerWidgetClass } from './explainer-widget';

const ExplanationSectionComponent: React.FC<ExplanationSection> = ({ title, content, type = 'text', language }) => {
  if (type === 'code') {
    return (
      <div className="code-section bg-base-200/50 backdrop-blur-sm rounded-lg overflow-hidden mb-4">
        <div className="section-header p-2 border-b border-base-300/50">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined">code</span>
            <span className="font-semibold">{title}</span>
            {language && <div className="badge badge-primary">{language}</div>}
          </div>
        </div>
        <pre className="p-4">
          <code className={language ? `language-${language}` : ''}>{content}</code>
        </pre>
      </div>
    );
  }

  if (type === 'warning') {
    return (
      <div className="alert alert-warning shadow-lg backdrop-blur-sm mb-4">
        <div className="flex items-center gap-2">
          <div className="avatar placeholder">
            <div className="w-8 h-8 rounded-full bg-warning-content/10">
              <span className="material-symbols-outlined text-warning-content">warning</span>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-warning-content">{title}</h3>
            <div className="text-sm text-warning-content/80">{content}</div>
          </div>
        </div>
      </div>
    );
  }

  if (type === 'note') {
    return (
      <div className="alert alert-info shadow-lg backdrop-blur-sm mb-4">
        <div className="flex items-center gap-2">
          <div className="avatar placeholder">
            <div className="w-8 h-8 rounded-full bg-info-content/10">
              <span className="material-symbols-outlined text-info-content">info</span>
            </div>
          </div>
          <div>
            <h3 className="font-bold text-info-content">{title}</h3>
            <div className="text-sm text-info-content/80">{content}</div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="text-section mb-4">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: content }}></div>
    </div>
  );
};

export type ExplainerWidgetProps = ExplainerData;

export const ExplainerWidget = withWidget<ExplainerWidgetProps>(
  ExplainerWidgetClass,
  'ExplainerWidget'
);

export const ExplainerWidgetComponent: React.FC<ExplainerData> = (props) => {
  if (props.error) {
    return (
      <div className="p-4">
        <div className="alert alert-error shadow-lg backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <div className="avatar placeholder animate-pulse">
              <div className="w-8 h-8 rounded-full bg-error-content/10">
                <span className="material-symbols-outlined text-error-content">error</span>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-error-content">Error</h3>
              <div className="text-sm text-error-content/80">{props.error}</div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (props.loading) {
    return (
      <div className="p-4">
        <div className="flex flex-col items-center justify-center p-8">
          <div className="loading loading-spinner loading-lg text-primary mb-4"></div>
          <p className="text-base-content/70">Generating explanation...</p>
        </div>
      </div>
    );
  }

  return (
    <BaseWidget
      data={props}
      id={props.id || 'explainer'}
      onUpdate={props.onUpdate}
      onClose={props.onClose}
      onResize={props.onResize}
      onMove={props.onMove}
    >
      <div className="explainer-widget p-4">
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-2">{props.topic}</h2>
          <div className="flex gap-2 mb-4">
            <span className="badge badge-primary">{props.style}</span>
            <span className="badge badge-secondary">{props.level}</span>
            <span className="badge badge-accent">{props.format}</span>
          </div>
          
          {props.sections.map((section, index) => (
            <ExplanationSectionComponent key={index} {...section} />
          ))}
          
          <div className="mt-6 pt-4 border-t border-base-300/30">
            <div className="flex flex-wrap gap-4 text-sm text-base-content/70">
              <div>
                <span className="font-semibold">Word Count:</span> {props.metadata.word_count}
              </div>
              <div>
                <span className="font-semibold">Difficulty:</span> {props.metadata.difficulty_progression}
              </div>
              <div>
                <span className="font-semibold">Key Points:</span> {props.metadata.key_points_covered}
              </div>
            </div>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
};