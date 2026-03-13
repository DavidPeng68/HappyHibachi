import React from 'react';
import type { MenuCategory, TranslatableText } from '../../types';
import './MenuTabs.css';

interface MenuTabsProps {
  categories: MenuCategory[];
  activeCategory: string;
  onSelect: (categoryId: string) => void;
  getLocalizedText: (text: TranslatableText) => string;
}

const MenuTabs: React.FC<MenuTabsProps> = ({
  categories,
  activeCategory,
  onSelect,
  getLocalizedText,
}) => {
  const visibleCategories = categories
    .filter((c) => c.visible)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="menu-tabs" role="tablist" aria-label="Menu categories">
      {visibleCategories.map((category) => (
        <button
          key={category.id}
          role="tab"
          aria-selected={activeCategory === category.id}
          className={`menu-tab ${activeCategory === category.id ? 'active' : ''}`}
          onClick={() => onSelect(category.id)}
          type="button"
        >
          {getLocalizedText(category.name)}
        </button>
      ))}
    </div>
  );
};

export default MenuTabs;
