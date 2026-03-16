import React from 'react';
import { useTranslation } from 'react-i18next';

interface StepProgressBarProps {
  steps: string[];
  currentStep: number;
  onStepClick?: (stepNumber: number) => void;
}

const StepProgressBar: React.FC<StepProgressBarProps> = ({ steps, currentStep, onStepClick }) => {
  const { t } = useTranslation();

  return (
    <div className="step-progress-bar" role="navigation" aria-label={t('order.progress')}>
      {steps.map((label, idx) => {
        const stepNum = idx + 1;
        const isActive = stepNum === currentStep;
        const isComplete = stepNum < currentStep;
        const isClickable = isComplete && onStepClick;

        return (
          <div
            key={idx}
            className={`step-indicator ${isActive ? 'active' : ''} ${isComplete ? 'complete' : ''}`}
          >
            <div
              className="step-dot"
              role={isClickable ? 'button' : undefined}
              tabIndex={isClickable ? 0 : undefined}
              aria-label={isClickable ? label : undefined}
              onClick={isClickable ? () => onStepClick(stepNum) : undefined}
              onKeyDown={
                isClickable
                  ? (e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        onStepClick(stepNum);
                      }
                    }
                  : undefined
              }
            >
              {isComplete ? '✓' : stepNum}
            </div>
            <span className="step-label">{label}</span>
            {idx < steps.length - 1 && <div className="step-connector" />}
          </div>
        );
      })}
    </div>
  );
};

export default StepProgressBar;
