import React from 'react';

interface PageHeaderProps {
  title: string;
  count?: number;
  actions?: React.ReactNode;
}

const PageHeader: React.FC<PageHeaderProps> = ({ title, count, actions }) => {
  return (
    <div className="admin-page-header">
      <h2>{title}</h2>
      {count !== undefined && count > 0 && <span className="count-badge">{count}</span>}
      {actions && <div style={{ marginLeft: 'auto' }}>{actions}</div>}
    </div>
  );
};

export default PageHeader;
