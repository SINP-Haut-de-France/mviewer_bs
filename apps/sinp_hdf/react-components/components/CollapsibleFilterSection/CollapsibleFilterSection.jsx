import React, { useState } from 'react';
import './CollapsibleFilterSection.css';

const CollapsibleFilterSection = ({
  title,
  icon = 'fa-filter',
  children,
  defaultExpanded = true,
  badge = null
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  return (
    <div className={`collapsible-filter-section ${isExpanded ? 'expanded' : 'collapsed'}`}>
      <div
        className="section-header"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <div className="section-title">
          <i className={`fas ${icon}`}></i>
          <span>{title}</span>
          {badge && <span className="section-badge">{badge}</span>}
        </div>
        <button className="toggle-btn" aria-label={isExpanded ? 'Réduire' : 'Développer'}>
          <i className={`fas fa-chevron-${isExpanded ? 'up' : 'down'}`}></i>
        </button>
      </div>

      {isExpanded && (
        <div className="section-content">
          {children}
        </div>
      )}
    </div>
  );
};

export default CollapsibleFilterSection;