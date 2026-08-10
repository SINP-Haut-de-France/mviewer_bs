import React, { useEffect, useState } from "react";
import "./CollapsibleFilterSection.css";

const EMPTY_TOUR_TARGETS = [];

const CollapsibleFilterSection = ({
  title,
  icon = "fa-filter",
  children,
  defaultExpanded = true,
  badge = null,
  dataTour = null,
  expandOnTourTargets = EMPTY_TOUR_TARGETS,
}) => {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);

  useEffect(() => {
    if (!dataTour) {
      return undefined;
    }

    const handleExpandRequest = (event) => {
      const requestedTarget = event.detail?.dataTour;
      if (requestedTarget === dataTour || expandOnTourTargets.includes(requestedTarget)) {
        setIsExpanded(true);
      }
    };

    window.addEventListener("sinpTutorial:expandFilterSection", handleExpandRequest);

    return () => {
      window.removeEventListener("sinpTutorial:expandFilterSection", handleExpandRequest);
    };
  }, [dataTour, expandOnTourTargets]);

  return (
    <div
      className={`collapsible-filter-section ${isExpanded ? "expanded" : "collapsed"}`}
      data-tour={dataTour || undefined}>
      <div className="section-header" onClick={() => setIsExpanded(!isExpanded)}>
        <div className="section-title">
          <i className={`fas ${icon}`}></i>
          <span>{title}</span>
          {badge && <span className="section-badge">{badge}</span>}
        </div>
        <button className="toggle-btn" aria-label={isExpanded ? "Réduire" : "Développer"}>
          <i className={`fas fa-chevron-${isExpanded ? "up" : "down"}`}></i>
        </button>
      </div>

      <div className="section-content-collapse" aria-hidden={!isExpanded}>
        <div className="section-content">{children}</div>
      </div>
    </div>
  );
};

export default CollapsibleFilterSection;
