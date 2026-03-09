mviewer.customControls.advancedSearch = (function () {
  var _initialized = false;
  const _submit = (filters) => {
    mviewer.customLayers.advancedSearch.get_datas(filters).then((data) => {
      console.log(data);
    });
  };

  /**
   * Ouvre la modale de filtrage avancée via reactComponentManager
   */
  const openAdvancedSearchModal = () => {
    if (window.reactComponentManager?.toggleFilterModal) {
      window.reactComponentManager.toggleFilterModal(
        true,
        (selectedFilters) => {
          console.log("Filtres sélectionnés :", selectedFilters);

          // Transformer les filtres du composant React en format attendu par sinpQueryBuilder
          let _params = {
            communes: selectedFilters.filteredCommunes || [],
            departements: selectedFilters.filteredDepartments || [],
            groupes: selectedFilters.filteredGroupes || [], // ← Tableau d'IDs directement
            taxons: selectedFilters.filteredTaxons || [], // ← Tableau de cd_ref
            dateDeb: selectedFilters.dateDeb || null,
            dateFin: selectedFilters.dateFin || null,
          };

          console.log("Paramètres transformés pour query builder:", _params);

          // Soumettre les paramètres mis à jour
          _submit(_params);
        },
        {
          filteredDepartments: [],
          filteredCommunes: [],
          filteredTaxons: [],
          filteredGroupes: [],
          dateDeb: null,
          dateFin: null,
        } // Valeurs initiales des filtres
      );
    } else {
      console.error("toggleFilterModal n'est pas disponible.");
    }
  };

  // // Attacher les événements lors du chargement du DOM
  // document.addEventListener("DOMContentLoaded", () => {
  //   const advancedSearchButton = document.getElementById("advanced-search-button");
  //   if (advancedSearchButton) {
  //     advancedSearchButton.addEventListener("click", openAdvancedSearchModal);
  //   } else {
  //     console.error("Bouton Recherche avancée introuvable.");
  //   }
  // });

  return {
    init: async function () {
      console.log("advancedSearchControl init");
    },
    submit: _submit,
    openAdvancedSearchModal,
    destroy: function () {
      _initialized = false; // mandatory - code executed when layer panel is closed
    },
  };
})();
