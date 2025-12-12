import React, { useState, useEffect, useCallback, useMemo } from "react";
import CheckBoxTreeViewUI from "./CheckBoxTreeViewUI";

const CheckBoxTreeView = ({
  datasource = [],
  idKey = "uuid",
  returnKey = null, // Clé de la valeur à retourner (si null, utilise idKey)
  label = (node) => "",
  childrenKey = "children",
  title = "Tree view",
  onSelectionChange = () => {},
  selectedValues = [],
  isLeafNode = (node) => true, // Fonction pour déterminer si un nœud est feuille
}) => {
  // Map pour associer returnKey à idKey
  const [nodeMap, setNodeMap] = useState(new Map());
  const [currentSelection, setCurrentSelection] = useState(new Set(selectedValues));
  const [expandedNodes, setExpandedNodes] = useState([]);

  // Construire une map des nœuds et un index pour accès rapide
  const { nodeMap: builtNodeMap, nodeIndex, ancestorMap } = useMemo(() => {
    const map = new Map();
    const index = new Map();
    const ancestors = new Map(); // Associe chaque nœud à ses ancêtres

    const traverse = (nodes, parentChain = []) => {
      nodes.forEach((node) => {
        const id = node[idKey];
        const returnValue = returnKey ? node[returnKey] : id;
        
        map.set(returnValue, id);
        map.set(id, returnValue);
        index.set(id, node);
        ancestors.set(id, parentChain);

        if (node[childrenKey] && node[childrenKey].length > 0) {
          traverse(node[childrenKey], [...parentChain, id]);
        }
      });
    };

    traverse(datasource);
    return { nodeMap: map, nodeIndex: index, ancestorMap: ancestors };
  }, [datasource, idKey, returnKey, childrenKey]);

  useEffect(() => {
    setNodeMap(builtNodeMap);
  }, [builtNodeMap]);

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
    (nodeId, returnValue) => {
      const updatedSelection = new Set(currentSelection);
      const node = nodeIndex.get(nodeId);

      if (!node) return;

      // Basculer la sélection du nœud cliqué
      if (updatedSelection.has(returnValue)) {
        updatedSelection.delete(returnValue);
      } else {
        updatedSelection.add(returnValue);
        
        // Si c'est un nœud enfant, ajouter les parents (sans les sélectionner complètement)
        const ancestors = ancestorMap.get(nodeId) || [];
        ancestors.forEach((ancestorId) => {
          updatedSelection.add(nodeMap.get(ancestorId));
        });
      }

      setCurrentSelection(updatedSelection);

      // Récupérer les nœuds complets mais filtrer pour ne garder que les plus profonds
      const selectedNodes = Array.from(updatedSelection)
        .map((val) => {
          const id = nodeMap.get(val);
          return nodeIndex.get(id);
        })
        .filter(Boolean);

      // Filtrer pour ne garder que les feuilles (nœuds sans enfants sélectionnés à un level plus profond)
      const deepestNodes = filterDeepestNodes(selectedNodes, nodeIndex, childrenKey);

      onSelectionChange(deepestNodes);
    },
    [currentSelection, nodeMap, nodeIndex, ancestorMap, childrenKey, onSelectionChange]
  );

  // Utilitaire pour garder uniquement les nœuds les plus profonds
  const filterDeepestNodes = (nodes, index, childKey) => {
    if (nodes.length === 0) return [];

    const nodeIds = new Set(nodes.map((n) => n[idKey]));
    
    // Retirer les ancêtres si un enfant est présent
    return nodes.filter((node) => {
      const hasSelectedChild = isAnySelectedChildDeeper(node, nodeIds, index, childKey);
      return !hasSelectedChild;
    });
  };

  // Vérifier si un nœud a un enfant sélectionné plus profond
  const isAnySelectedChildDeeper = (node, selectedIds, index, childKey) => {
    if (!node[childKey] || node[childKey].length === 0) return false;

    return node[childKey].some((child) => {
      const childId = child[idKey];
      if (selectedIds.has(childId)) return true;
      return isAnySelectedChildDeeper(child, selectedIds, index, childKey);
    });
  };

  // Met à jour la sélection lorsque les valeurs sélectionnées changent
  useEffect(() => {
    setCurrentSelection(new Set(selectedValues));
  }, [selectedValues]);

  // Convertir les selectedValues (returnKey) en nodeIds (idKey) pour l'affichage
  const selectedNodeIds = Array.from(currentSelection).map(
    (value) => nodeMap.get(value) || value
  );

  return (
    <CheckBoxTreeViewUI
      data={datasource}
      idKey={idKey}
      returnKey={returnKey}
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
