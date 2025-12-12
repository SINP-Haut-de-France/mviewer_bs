import React, { useEffect, useState, useRef } from "react";
import MultiSelectSearchUI from "./MultiSelectSearchComponentUI";
import useWFSCache from "../../hooks/useWFSCache";

const MultiSelectSearchComponent = ({
  datasource = [],
  selectedValues = [],
  parentDatasource = [],
  parentDatasourceKey = null,
  searchKey = null,
  returnValueKey = "id",
  cacheKey = null, // New prop: cache identifier (ex: 'taxons', 'departments')
  label = (item) => "",
  multiselect = true,
  minCharacters = 2,
  maxResults = 10,
  title = "",
  onChange = () => {},
  onSearch = () => {},
  loading = false,
  error = null,
}) => {
  const [availableData, setAvailableData] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);

  // Initialize cache hook if cacheKey is provided
  const cache = cacheKey ? useWFSCache(cacheKey, returnValueKey) : null;

  // Ref pour éviter les réinitialisations multiples
  const isSelectingRef = useRef(false);

  // Modifie l'état local `search` lors d'une saisie utilisateur
  const handleSearchChange = (value) => {
    setSearch(value);
    setShowResults(value.length > 0);
    onSearch(value);
  };

  // Initialiser les éléments déjà sélectionnés
  // Se déclenche si selectedValues change, même si datasource n'a pas de données
  // (pour permettre le rebind du cache même avant que WFS charge)
  useEffect(() => {
    // Ne pas réinitialiser si on est en train de sélectionner
    if (isSelectingRef.current) {
      return;
    }

    if (
      !selectedValues ||
      (Array.isArray(selectedValues) && selectedValues.length === 0)
    ) {
      setSelected([]);
      return;
    }

    // Normalize selectedValues: extract IDs if they are complete objects
    // (when restoring from cache, selectedValues might be full objects)
    const valuesArray = (
      Array.isArray(selectedValues) ? selectedValues : [selectedValues]
    ).map((val) => (typeof val === "object" && val !== null ? val[returnValueKey] : val));

    // If we have complete objects in selectedValues (from cache), use them directly
    // This allows rebinding before/without WFS datasource loading
    if (
      selectedValues &&
      typeof selectedValues[0] === "object" &&
      selectedValues[0][returnValueKey]
    ) {
      console.log(
        "🔄 Using complete objects from selectedValues (cache):",
        selectedValues
      );
      setSelected(selectedValues);
      return;
    }

    // Otherwise, try to match against datasource
    if (!datasource || datasource.length === 0) {
      return;
    }

    const selectedItems = datasource.filter((item) =>
      valuesArray.includes(item[returnValueKey])
    );

    // Mettre à jour seulement si les items ont changé
    if (JSON.stringify(selectedItems) !== JSON.stringify(selected)) {
      setSelected(selectedItems);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedValues, returnValueKey]); // datasource et selected exclus intentionnellement pour éviter boucle infinie

  // Synchroniser selected quand datasource change ET qu'il y a des selectedValues
  useEffect(() => {
    if (isSelectingRef.current) return;

    if (
      selectedValues &&
      selectedValues.length > 0 &&
      datasource &&
      datasource.length > 0
    ) {
      // Normalize: extract IDs from objects if needed
      const valuesArray = (
        Array.isArray(selectedValues) ? selectedValues : [selectedValues]
      ).map((val) =>
        typeof val === "object" && val !== null ? val[returnValueKey] : val
      );
      const selectedItems = datasource.filter((item) =>
        valuesArray.includes(item[returnValueKey])
      );

      // Seulement mettre à jour si on a trouvé des correspondances
      if (selectedItems.length > 0) {
        setSelected(selectedItems);
      }
    }
  }, [datasource, selectedValues, returnValueKey]);

  // Filtrer les données selon données parents
  useEffect(() => {
    if (!datasource || datasource.length === 0) {
      setAvailableData([]);
      setFilteredResults([]);
      return;
    }

    let filteredData = [...datasource];

    // Filtrage par parent si nécessaire
    if (
      parentDatasource &&
      parentDatasource.length > 0 &&
      parentDatasourceKey &&
      searchKey
    ) {
      const parentKeys = Array.isArray(parentDatasource)
        ? parentDatasource
        : [parentDatasource];
      filteredData = datasource.filter((item) =>
        parentKeys.includes(item[searchKey] || item[parentDatasourceKey])
      );
    }

    // ⚠️ NOT caching the entire WFS result set (too heavy)
    // We only cache items when they are explicitly selected (in handleSelect)

    setAvailableData(filteredData);
  }, [datasource, parentDatasource, parentDatasourceKey, searchKey]);

  // Filtrage local des résultats selon la recherche
  useEffect(() => {
    if (!availableData || availableData.length === 0) {
      setFilteredResults([]);
      return;
    }

    // Si pas de recherche, afficher les premiers résultats
    if (search.length === 0) {
      setFilteredResults(availableData.slice(0, maxResults));
      return;
    }

    // Si recherche trop courte
    if (search.length < minCharacters) {
      setFilteredResults([]);
      return;
    }

    // Filtrage selon le texte de recherche
    const searchLower = search.toLowerCase();
    const results = availableData
      .filter((item) => {
        // Obtenir une version texte du label pour la recherche.
        // Le prop `label` peut retourner une string ou un JSX element.
        let itemLabelRaw;
        try {
          itemLabelRaw = typeof label === "function" ? label(item) : label;
        } catch (e) {
          itemLabelRaw = null;
        }

        let itemLabelStr = "";
        if (typeof itemLabelRaw === "string") {
          itemLabelStr = itemLabelRaw;
        } else if (
          item &&
          (item.nom_vern || item.nom_complet || item.label || item.name)
        ) {
          itemLabelStr = `${item.nom_vern || ""} ${item.nom_complet || ""} ${
            item.label || ""
          } ${item.name || ""}`;
        } else if (itemLabelRaw && typeof itemLabelRaw === "object") {
          // Fallback : sérialiser quelques champs ou l'objet entier
          try {
            itemLabelStr = JSON.stringify(itemLabelRaw);
          } catch (e) {
            itemLabelStr = "";
          }
        } else {
          itemLabelStr = String(item || "");
        }

        return itemLabelStr.toLowerCase().includes(searchLower);
      })
      .slice(0, maxResults);

    setFilteredResults(results);
  }, [search, availableData, label, minCharacters, maxResults]);

  // Gestion de la sélection d'éléments
  const handleSelect = (item) => {
    isSelectingRef.current = true; // Indiquer qu'on est en train de sélectionner

    let newSelected;
    let newlyAdded = []; // Track newly added items for caching

    if (multiselect) {
      const isAlreadySelected = selected.some(
        (sel) => sel[returnValueKey] === item[returnValueKey]
      );

      if (!isAlreadySelected) {
        newSelected = [...selected, item];
        newlyAdded = [item]; // Only the newly added item
      } else {
        newSelected = selected;
        isSelectingRef.current = false;
        return; // Ne rien faire si déjà sélectionné
      }
    } else {
      // Mode single select - toujours remplacer
      // But check if it's actually different from the current selection
      const isDifferent = !selected.some(
        (sel) => sel[returnValueKey] === item[returnValueKey]
      );
      newSelected = [item];
      if (isDifferent) {
        newlyAdded = [item]; // Only cache if it's actually a new selection
      }
    }

    setSelected(newSelected);
    setSearch("");
    setShowResults(false);

    // Cache ONLY newly selected items (not already cached ones)
    if (cache && newlyAdded.length > 0) {
      newlyAdded.forEach((newItem) => {
        cache.addToCache(newItem);
      });
    }

    const returnValues = newSelected.map((item) => item[returnValueKey]);
    const valueToPass = multiselect ? returnValues : returnValues[0];
    console.log(
      `🎯 MultiSelectSearchComponent.handleSelect - Passing to onChange:`,
      valueToPass,
      "Current selected internal state:",
      newSelected.map((item) => item[returnValueKey])
    );
    onChange(valueToPass);

    // Use shorter timeout to protect selection without blocking prop updates
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 50);
  };

  // Gestion de la suppression des éléments sélectionnés
  const handleRemove = (itemValue) => {
    isSelectingRef.current = true;

    const newSelected = selected.filter((item) => item[returnValueKey] !== itemValue);
    setSelected(newSelected);

    const returnValues = newSelected.map((item) => item[returnValueKey]);
    onChange(multiselect ? returnValues : returnValues.length ? returnValues[0] : null);

    // Use shorter timeout to protect selection without blocking prop updates
    setTimeout(() => {
      isSelectingRef.current = false;
    }, 50);
  };

  return (
    <MultiSelectSearchUI
      title={title}
      search={search}
      setSearch={handleSearchChange}
      filteredData={filteredResults}
      showResults={showResults}
      setShowResults={setShowResults}
      selected={selected}
      handleSelect={handleSelect}
      handleRemove={handleRemove}
      label={label}
      selectedKey={returnValueKey}
      multiselect={multiselect}
      loading={loading}
      error={error}
    />
  );
};

export default MultiSelectSearchComponent;
