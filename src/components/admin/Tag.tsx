import React from 'react';

export interface TagProps {
  label: string;
  color?: string;
  onRemove?: () => void;
}

const Tag: React.FC<TagProps> = ({ label, color, onRemove }) => {
  const style: React.CSSProperties = color ? { background: color, color: '#fff' } : {};

  return (
    <span className="admin-tag" style={style}>
      {label}
      {onRemove && (
        <button
          type="button"
          className="admin-tag-remove"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          aria-label={`Remove ${label}`}
        >
          &times;
        </button>
      )}
    </span>
  );
};

export default Tag;
