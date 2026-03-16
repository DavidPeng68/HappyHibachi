import React from 'react';

interface EmptyStateProps {
  icon?: string;
  svgIcon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

const EmptyState: React.FC<EmptyStateProps> = ({ icon, svgIcon, title, description, action }) => {
  return (
    <div className="empty-state">
      {svgIcon ? (
        <div className="empty-state-svg">{svgIcon}</div>
      ) : (
        <span role="img" aria-hidden="true">
          {icon}
        </span>
      )}
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action && (
        <button
          className="admin-btn admin-btn-primary empty-state-action"
          onClick={action.onClick}
          type="button"
        >
          {action.label}
        </button>
      )}
    </div>
  );
};

export default EmptyState;
