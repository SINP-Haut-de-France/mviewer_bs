import React, { useState, useEffect, useCallback, useMemo } from "react";
import CheckBoxTreeViewUI from "./CheckBoxTreeViewUI";

const CheckBoxTreeView = ({
  datasource = [],
  idKey = "id",
  returnKey = null, // Clé optionnelle acceptée en entrée via selectedValues
  label = () => "",
  childrenKey = "children",
  title = "Tree view",
  onSelectionChange = () => {},
  selectedValues = [],
}) => {
  const [currentSelection, setCurrentSelection] = useState(new Set());
  const [expandedNodes, setExpandedNodes] = useState([]);

  // Indexe les nœuds pour conversions id <-> returnKey et accès rapide
  const { nodeIndex, ancestorMap, returnToId } = useMemo(() => {
    const index = new Map();
    const ancestors = new Map();
    const returnMap = new Map();

    const traverse = (nodes = [], parentChain = []) => {
      nodes.forEach((node) => {
        const id = node[idKey];
        index.set(id, node);
        ancestors.set(id, parentChain);

        if (returnKey) {
          returnMap.set(node[returnKey], id);
        }

        const children = Array.isArray(node[childrenKey]) ? node[childrenKey] : [];
        if (children.length > 0) {
          traverse(children, [...parentChain, id]);
        }
      });
    };

    traverse(datasource);
    return { nodeIndex: index, ancestorMap: ancestors, returnToId: returnMap };
  }, [datasource, idKey, returnKey, childrenKey]);

  const normalizeToNodeId = useCallback(
    (value) => {
      if (nodeIndex.has(value)) return value;
      if (returnKey && returnToId.has(value)) return returnToId.get(value);

      // Tolère des IDs fournis en string (ex: "12")
      if (typeof value === "string" && value.trim() !== "") {
        const numericValue = Number(value);
        if (!Number.isNaN(numericValue) && nodeIndex.has(numericValue)) {
          return numericValue;
        }
      }

      return null;
    },
    [nodeIndex, returnKey, returnToId]
  );

  // Fonction pour basculer l'état d'expansion d'un nœud
  const toggleNodeExpansion = useCallback((id) => {
    setExpandedNodes((prevExpanded) =>
      prevExpanded.includes(id)
        ? prevExpanded.filter((nodeId) => nodeId !== id)
        : [...prevExpanded, id]
    );
  }, []);

  // Gestion des changements de sélection d'un nœud
  const handleSelectionChange = useCallback(
    (nodeId) => {
      const updatedSelection = new Set(currentSelection);
      const node = nodeIndex.get(nodeId);

      if (!node) return;

      if (updatedSelection.has(nodeId)) {
        updatedSelection.delete(nodeId);
      } else {
        updatedSelection.add(nodeId);

        const ancestors = ancestorMap.get(nodeId) || [];
        ancestors.forEach((ancestorId) => {
          updatedSelection.add(ancestorId);
        });
      }

      setCurrentSelection(updatedSelection);

      const selectedNodes = Array.from(updatedSelection)
        .map((id) => nodeIndex.get(id))
        .filter(Boolean);

      const deepestNodes = filterDeepestNodes(selectedNodes, childrenKey);
      onSelectionChange(deepestNodes);
    },
    [currentSelection, nodeIndex, ancestorMap, childrenKey, onSelectionChange]
  );

  // Utilitaire pour garder uniquement les nœuds les plus profonds
  const filterDeepestNodes = (nodes, childKey) => {
    if (nodes.length === 0) return [];

    const nodeIds = new Set(nodes.map((n) => n[idKey]));

    return nodes.filter((node) => {
      const hasSelectedChild = isAnySelectedChildDeeper(node, nodeIds, childKey);
      return !hasSelectedChild;
    });
  };

  // Vérifier si un nœud a un enfant sélectionné plus profond
  const isAnySelectedChildDeeper = (node, selectedIds, childKey) => {
    const children = Array.isArray(node[childKey]) ? node[childKey] : [];
    if (children.length === 0) return false;

    return children.some((child) => {
      const childId = child[idKey];
      if (selectedIds.has(childId)) return true;
      return isAnySelectedChildDeeper(child, selectedIds, childKey);
    });
  };

  // Met à jour la sélection lorsque les valeurs sélectionnées changent
  useEffect(() => {
    const nextSelection = new Set(
      (selectedValues || [])
        .map((value) => normalizeToNodeId(value))
        .filter((value) => value !== null)
    );
    setCurrentSelection(nextSelection);
  }, [selectedValues, normalizeToNodeId]);

  const selectedNodeIds = Array.from(currentSelection);

  return (
    <CheckBoxTreeViewUI
      data={datasource}
      idKey={idKey}
      label={label}
      childrenKey={childrenKey}
      selectedNodeIds={selectedNodeIds}
      expandedNodes={expandedNodes}
      toggleNodeExpansion={toggleNodeExpansion}
      onSelectionChange={handleSelectionChange}
      title={title}
    />
  );
};

export default CheckBoxTreeView;
