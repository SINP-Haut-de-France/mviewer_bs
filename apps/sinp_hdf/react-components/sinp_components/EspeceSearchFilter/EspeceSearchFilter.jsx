import React, { useState, useCallback } from 'react';
import EspeceSearchFilterUI from './EspeceSearchFilterUI';
import './EspeceSearchFilter.css';

/**
 * Composant métier de recherche d'espèce
 * Gère la logique et l'état de la recherche d'espèce
 * 
 * @param {Function} onSubmit - Callback appelé à la soumission (reçoit les cd_ref sélectionnés)
 * @param {Array} initialValues - Valeurs initiales (cd_ref)
 * @param {boolean} multiselect - Autoriser la sélection multiple (défaut: false)
 * @param {string} title - Titre du champ (défaut: "Rechercher une espèce")
 * @param {number} minCharacters - Nombre minimum de caractères pour lancer la recherche (défaut: 3)
 * @param {number} maxResults - Nombre maximum de résultats (défaut: 15)
 */
const EspeceSearchFilter = ({
  onSubmit,
  initialValues = [],
  multiselect = false,
  title = "Rechercher une espèce",
  minCharacters = 3,
  maxResults = 15,
}) => {
  const [selectedValues, setSelectedValues] = useState(initialValues);

  // Construire l'URL de recherche WFS
  const buildSearchUrl = useCallback((query, params) => {
    const baseURL = `${mviewer.env?.[mviewer.env?.CURRENT_ENV]?.GEOSERVER_BASE_URL}/wfs`;
    const typeName = 'sinp_diffusion:vm_taxref_search';
    const encodedFilter = encodeURIComponent(`search_field ILIKE '%${query}%'`);
    return `${baseURL}?SERVICE=WFS&VERSION=2.0.0&REQUEST=GetFeature&TYPENAME=${typeName}&CQL_FILTER=${encodedFilter}&outputFormat=json&${new URLSearchParams(params).toString()}`;
  }, []);

  // Handler pour les changements de sélection
  const handleChange = useCallback((taxons) => {
    const selectedCdRefs = Array.isArray(taxons)
      ? taxons.map((tx) => tx.cd_ref || tx)
      : taxons
      ? [taxons.cd_ref || taxons]
      : [];

    setSelectedValues(selectedCdRefs);

    // Déclencher un événement pour le contrôleur legacy
    window.dispatchEvent(new CustomEvent('especeSearchSelectionChange', {
      detail: { 
        cdRefs: selectedCdRefs,
        taxons: taxons 
      }
    }));
  }, []);

  // Handler pour la soumission
  const handleSubmit = useCallback(() => {
    if (selectedValues.length === 0) {
      console.warn('Aucune espèce sélectionnée');
      return;
    }

    const filters = {
      taxons: selectedValues
    };

    // Callback externe
    if (onSubmit) {
      onSubmit(filters);
    }

    // Appeler le contrôleur legacy
    if (window.mviewer?.customControls?.especeSearch) {
      mviewer.customControls.especeSearch.submit(filters);
    }
  }, [selectedValues, onSubmit]);

  // Handler pour la réinitialisation
  const handleReset = useCallback(() => {
    setSelectedValues([]);
    
    // Déclencher un événement de réinitialisation
    window.dispatchEvent(new CustomEvent('especeSearchReset'));
  }, []);

  // Vérifier si le bouton submit doit être désactivé
  const canSubmit = selectedValues.length > 0;

  return (
    <EspeceSearchFilterUI
      selectedValues={selectedValues}
      buildSearchUrl={buildSearchUrl}
      onEspeceChange={handleChange}
      onSubmit={handleSubmit}
      onReset={handleReset}
      canSubmit={canSubmit}
      multiselect={multiselect}
      title={title}
      minCharacters={minCharacters}
      maxResults={maxResults}
    />
  );
};

export default EspeceSearchFilter;
