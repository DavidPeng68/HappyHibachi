import React from 'react';

export interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

const Breadcrumb: React.FC<BreadcrumbProps> = ({ items }) => {
  if (items.length <= 1) return null;

  return (
    <nav className="admin-breadcrumb" aria-label="Breadcrumb">
      {items.map((item, i) => {
        const isLast = i === items.length - 1;
        return (
          <React.Fragment key={i}>
            {i > 0 && <span className="admin-breadcrumb-separator">/</span>}
            {isLast ? (
              <span className="admin-breadcrumb-current">{item.label}</span>
            ) : (
              <button className="admin-breadcrumb-item" onClick={item.onClick} type="button">
                {item.label}
              </button>
            )}
          </React.Fragment>
        );
      })}
    </nav>
  );
};

export default Breadcrumb;
