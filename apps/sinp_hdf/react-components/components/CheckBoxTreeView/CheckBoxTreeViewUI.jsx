import React from "react";
import "./CheckBoxTreeView.css";

const CheckBoxTreeViewUI = ({
  data,
  idKey,
  returnKey,
  label,
  childrenKey,
  selectedNodeIds,
  expandedNodes,
  toggleNodeExpansion,
  onSelectionChange,
  title,
}) => {
  // Fonction récursive pour afficher les nœuds d'arbre
  const renderTreeNodes = (nodes) => {
    return nodes.map((node) => {
      const hasChildren = node[childrenKey] && node[childrenKey].length > 0;
      const nodeId = node[idKey];
      const returnValue = returnKey ? node[returnKey] : nodeId;
      const isSelected = selectedNodeIds.includes(nodeId); // Vérifie si le nœud est sélectionné
      const isExpanded = expandedNodes.includes(nodeId); // Vérifie si le nœud est expansé

      return (
        <div className="tree-node" key={nodeId}>
          <div className="node-content">
            <div className="expand-btn-wrapper">
              {hasChildren && (
                <button
                  className="expand-btn-node"
                  onClick={() => toggleNodeExpansion(nodeId)}
                  aria-label={isExpanded ? "Réduire" : "Développer"}>
                  {isExpanded ? "-" : "+"}
                </button>
              )}
            </div>

            <label>
              <input
                type="checkbox"
                checked={isSelected}
                onChange={() => onSelectionChange(nodeId, returnValue)}
              />
              {label(node)}
            </label>
          </div>

          {hasChildren && isExpanded && (
            <div className="tree-children">{renderTreeNodes(node[childrenKey])}</div>
          )}
        </div>
      );
    });
  };

  return (
    <div className="tree-view-ui">
      <div className="tree-header">{title}</div>
      <div className="tree-nodes">{renderTreeNodes(data)}</div>
    </div>
  );
};

export default CheckBoxTreeViewUI;
