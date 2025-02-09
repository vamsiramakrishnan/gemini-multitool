import React from 'react';
import './introduction.scss';

interface IntroductionProps {
  onComplete: () => void;
}

export const Introduction: React.FC<IntroductionProps> = ({ onComplete }) => {
  return (
    <div className="introduction">
      <div className="intro-content">
        <header className="intro-header">
          <div className="logo-container">
            <span className="material-symbols-outlined">smart_toy</span>
          </div>
          <h1>Welcome to Your AI Workspace</h1>
          <p>A powerful environment for AI-assisted development and data visualization</p>
        </header>

        <div className="feature-grid">
          <FeatureCard
            icon="code"
            title="Smart Code Execution"
            description="Write, run and debug code with AI assistance"
          />
          <FeatureCard
            icon="insights"
            title="Data Visualization"
            description="Create beautiful charts and graphs from your data"
          />
          <FeatureCard
            icon="chat"
            title="Natural Conversations"
            description="Interact naturally with AI to solve problems"
          />
        </div>

        <div className="quick-start">
          <h2>Quick Start Guide</h2>
          <div className="steps">
            <Step
              number={1}
              title="Choose Your Tools"
              description="Select from various widgets in the sidebar"
            />
            <Step
              number={2} 
              title="Organize Your Space"
              description="Drag and drop widgets to customize your layout"
            />
            <Step
              number={3}
              title="Start Creating"
              description="Begin coding, analyzing data, or having conversations"
            />
          </div>
        </div>

        <button className="get-started-btn" onClick={onComplete}>
          Get Started
          <span className="material-symbols-outlined">arrow_forward</span>
        </button>
      </div>
    </div>
  );
};

const FeatureCard = ({ icon, title, description }: {
  icon: string;
  title: string;
  description: string;
}) => (
  <div className="feature-card">
    <span className="material-symbols-outlined">{icon}</span>
    <h3>{title}</h3>
    <p>{description}</p>
  </div>
);

const Step = ({ number, title, description }: {
  number: number;
  title: string;
  description: string;
}) => (
  <div className="step">
    <div className="step-number">{number}</div>
    <div className="step-content">
      <h4>{title}</h4>
      <p>{description}</p>
    </div>
  </div>
); 