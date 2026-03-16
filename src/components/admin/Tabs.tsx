import React from 'react';

export interface TabItem {
  key: string;
  label: string;
  count?: number;
}

export interface TabsProps {
  tabs: TabItem[];
  activeKey: string;
  onChange: (key: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ tabs, activeKey, onChange }) => {
  return (
    <div className="admin-tabs" role="tablist">
      {tabs.map((tab) => (
        <button
          key={tab.key}
          type="button"
          role="tab"
          className={`admin-tab${activeKey === tab.key ? ' active' : ''}`}
          aria-selected={activeKey === tab.key}
          tabIndex={activeKey === tab.key ? 0 : -1}
          onClick={() => onChange(tab.key)}
        >
          {tab.label}
          {tab.count !== undefined && <span className="admin-tab-count">({tab.count})</span>}
        </button>
      ))}
    </div>
  );
};

export default Tabs;
