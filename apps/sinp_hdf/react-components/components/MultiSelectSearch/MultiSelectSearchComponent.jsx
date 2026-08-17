import React, { useEffect, useState } from "react";
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
  maxSelections = null,
  title = "",
  onChange = () => {},
  onSearch = () => {},
  loading = false,
  error = null,
  disabled = false,
}) => {
  const [availableData, setAvailableData] = useState([]);
  const [filteredResults, setFilteredResults] = useState([]);
  const [selected, setSelected] = useState([]);
  const [search, setSearch] = useState("");
  const [showResults, setShowResults] = useState(false);
  const isSelectionLimitReached =
    multiselect && Number.isInteger(maxSelections) && selected.length >= maxSelections;

  // Initialize cache hook if cacheKey is provided
  const cache = cacheKey ? useWFSCache(cacheKey, returnValueKey) : null;

  // Modifie l'état local `search` lors d'une saisie utilisateur
  const handleSearchChange = (value) => {
    if (disabled) return;

    setSearch(value);
    setShowResults(value.length > 0);
    onSearch(value);
  };

  // Synchroniser les objets sélectionnés sans perdre ceux qui ne figurent pas
  // dans la dernière page de résultats d'une datasource dynamique.
  useEffect(() => {
    const normalizedValues = Array.isArray(selectedValues)
      ? selectedValues
      : selectedValues
      ? [selectedValues]
      : [];

    if (normalizedValues.length === 0) {
      setSelected([]);
      return;
    }

    setSelected((currentSelected) => {
      const currentItems = new Map(
        currentSelected.map((item) => [item[returnValueKey], item])
      );
      const datasourceItems = new Map(
        (datasource || []).map((item) => [item[returnValueKey], item])
      );
      const providedItems = new Map(
        normalizedValues
          .filter((value) => typeof value === "object" && value !== null)
          .map((item) => [item[returnValueKey], item])
      );

      const nextSelected = normalizedValues
        .map((value) => {
          const itemValue =
            typeof value === "object" && value !== null
              ? value[returnValueKey]
              : value;

          return (
            providedItems.get(itemValue) ||
            currentItems.get(itemValue) ||
            datasourceItems.get(itemValue)
          );
        })
        .filter(Boolean);

      const selectionIsUnchanged =
        nextSelected.length === currentSelected.length &&
        nextSelected.every((item, index) => item === currentSelected[index]);

      if (selectionIsUnchanged) {
        return currentSelected;
      }

      return nextSelected;
    });
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
    if (disabled) return;

    let newSelected;
    let newlyAdded = []; // Track newly added items for caching

    if (multiselect) {
      const isAlreadySelected = selected.some(
        (sel) => sel[returnValueKey] === item[returnValueKey]
      );

      if (!isAlreadySelected && isSelectionLimitReached) {
        if (window.sinpToast?.error) {
          window.sinpToast.error(
            `Vous pouvez sélectionner au maximum ${maxSelections} élément${
              maxSelections > 1 ? "s" : ""
            }.`
          );
        }
        return;
      }

      if (!isAlreadySelected) {
        newSelected = [...selected, item];
        newlyAdded = [item]; // Only the newly added item
      } else {
        newSelected = selected;
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
    console.log(
      `🎯 MultiSelectSearchComponent.handleSelect - Passing to onChange:`,
      returnValues,
      "Current selected internal state:",
      newSelected.map((item) => item[returnValueKey])
    );
    onChange(returnValues);
  };

  // Gestion de la suppression des éléments sélectionnés
  const handleRemove = (itemValue) => {
    const newSelected = selected.filter((item) => item[returnValueKey] !== itemValue);
    setSelected(newSelected);

    const returnValues = newSelected.map((item) => item[returnValueKey]);
    onChange(returnValues);
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
      maxSelections={maxSelections}
      isSelectionLimitReached={isSelectionLimitReached}
      disabled={disabled}
    />
  );
};

export default MultiSelectSearchComponent;
