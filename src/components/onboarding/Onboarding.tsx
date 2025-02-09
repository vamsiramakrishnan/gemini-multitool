import React from 'react';
import './onboarding.scss';

interface OnboardingProps {
  onComplete: () => void;
}

export const Onboarding: React.FC<OnboardingProps> = ({ onComplete }) => {
  return (
    <div className="onboarding">
      <div className="animated-bg" />
      <div className="onboarding-container">
        <div className="welcome-header">
          <h1>Welcome to Your AI Assistant Dashboard</h1>
          <p>
            A powerful workspace that combines AI assistance with real-time data visualization and interactive widgets
          </p>
        </div>

        <div className="steps-container">
          <div className="step-card">
            <div className="step-icon">
              <span className="material-symbols-outlined">smart_toy</span>
            </div>
            <h3>AI-Powered Assistant</h3>
            <p>Get instant help with your tasks through natural conversations</p>
            <ul className="feature-list">
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Natural language processing
              </li>
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Code generation & explanation
              </li>
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Context-aware responses
              </li>
            </ul>
          </div>

          <div className="step-card">
            <div className="step-icon">
              <span className="material-symbols-outlined">widgets</span>
            </div>
            <h3>Interactive Widgets</h3>
            <p>Access real-time data and tools through customizable widgets</p>
            <ul className="feature-list">
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Stock market tracking
              </li>
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Weather updates
              </li>
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Code execution environment
              </li>
            </ul>
          </div>

          <div className="step-card">
            <div className="step-icon">
              <span className="material-symbols-outlined">hub</span>
            </div>
            <h3>Seamless Integration</h3>
            <p>Everything works together in a unified experience</p>
            <ul className="feature-list">
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Drag & drop interface
              </li>
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Multi-tab workspace
              </li>
              <li>
                <span className="material-symbols-outlined">check_circle</span>
                Real-time updates
              </li>
            </ul>
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