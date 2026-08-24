import React, {
  useState,
  useMemo,
  useCallback,
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
} from "react";
import GlobalFiltersUI from "./GlobalFiltersUI";
import { format } from "date-fns";
import useWFSCache from "../../hooks/useWFSCache";
import useRestoreFromCache from "../../hooks/useRestoreFromCache";
import {
  FILTER_PROFILES,
  isFilterVisible,
  FILTER_TYPES,
  getFilterProfileForLayer,
  resolveSearchLayerId,
  getVisibleEnvironmentalLayers,
  subscribeToEnvironmentalLayerVisibility,
} from "../../configs/filtersConfig";

const GlobalFiltersComponent = (
  {
    onSubmit,
    onReset,
    initialFilters = null,
    filterProfile = null,
    activeLayerId = null,
    selectionContext = null,
    onSelectionClear = null,
    onSelectionInvalidated = null,
    onFiltersChange = null, // NEW: callback quand les filtres changent localement
    onSubmitError = null,
  },
  ref
) => {
  console.log(
    "🔍 [GlobalFilters] Render - onSubmit reçu:",
    typeof onSubmit,
    onSubmit !== undefined
  );
  console.log("🔍 [GlobalFilters] Props:", { activeLayerId });

  // Initialize WFS cache ONLY for taxons (WFS data)
  // Departments and communes are loaded from static JSON files, no need to cache
  const taxonsCache = useWFSCache("taxons_selected", "cd_ref");
  const { restoreMultipleFromCache } = useRestoreFromCache("taxons_selected", "cd_ref");

  // Filtres par défaut
  const defaultFilters = useMemo(() => {
    const today = new Date();
    return {
      filteredDepartments: [],
      filteredCommunes: [],
      filteredTaxons: [], // Now will store complete objects, not just IDs
      filteredGroupes: [], // IDs entiers des groupes taxonomiques sélectionnés
      dateDeb: format(
        new Date(today.setFullYear(today.getFullYear() - 20)),
        "yyyy-MM-dd"
      ),
      dateFin: format(new Date(), "yyyy-MM-dd"),
      selectionMode: false,
      selectedSelectionLayerId: null,
      selectionFeatureUid: null,
      selectionLabel: null,
    };
  }, []);

  const requestedInitialRestitutionLayerId = initialFilters?.restitutionLayerId;
  const initialRestitutionLayerId =
    requestedInitialRestitutionLayerId === "selection" && !selectionContext
      ? resolveSearchLayerId(activeLayerId)
      : requestedInitialRestitutionLayerId || resolveSearchLayerId(activeLayerId);
  const initialFilterState = {
    ...defaultFilters,
    ...(initialFilters || {}),
    selectionMode: Boolean(selectionContext),
    selectedSelectionLayerId:
      selectionContext?.layerId ||
      initialFilters?.selectedSelectionLayerId ||
      null,
    selectionFeatureUid:
      selectionContext?.featureUid || initialFilters?.selectionFeatureUid || null,
    selectionLabel:
      selectionContext?.featureLabel || initialFilters?.selectionLabel || null,
    restitutionLayerId: initialRestitutionLayerId,
  };
  const [filters, setFilters] = useState(initialFilterState);
  // Synchronous ref mirror to avoid race between setState and immediate submit
  const filtersRef = useRef(initialFilterState);
  const [selectedRestitutionLayerId, setSelectedRestitutionLayerId] = useState(
    initialRestitutionLayerId
  );
  const selectedRestitutionLayerIdRef = useRef(initialRestitutionLayerId);
  const [hasSubmittedSearch, setHasSubmittedSearch] = useState(false);
  const [visibleEnvironmentalLayers, setVisibleEnvironmentalLayers] = useState(
    () => getVisibleEnvironmentalLayers()
  );
  const lastSubmittedFiltersRef = useRef(null);

  const updateFilters = useCallback((updater) => {
    setFilters((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      filtersRef.current = next;
      return next;
    });
  }, []);
  const [isLoading, setIsLoading] = useState(false);

  // Notifier le parent (modale) chaque fois que les filtres changent localement
  // Cela garantit que appliedFilters dans la modale reste en sync avec l'état actuel
  useEffect(() => {
    console.log("📢 Filtres mis à jour localement - notifier le parent:", filters);
    // ensure ref is up-to-date
    filtersRef.current = filters;
    if (onFiltersChange) {
      onFiltersChange(filters);
    }
  }, [filters, onFiltersChange]);

  useEffect(() => {
    const resolvedLayerId = resolveSearchLayerId(activeLayerId);
    if (resolvedLayerId && !selectedRestitutionLayerIdRef.current) {
      selectedRestitutionLayerIdRef.current = resolvedLayerId;
      setSelectedRestitutionLayerId(resolvedLayerId);
    }
  }, [activeLayerId]);

  useEffect(() => {
    return subscribeToEnvironmentalLayerVisibility(setVisibleEnvironmentalLayers);
  }, []);

  useEffect(() => {
    if (!selectionContext) {
      return;
    }

    updateFilters((prev) => ({
      ...prev,
      selectionMode: true,
      selectedSelectionLayerId: selectionContext.layerId,
      selectionFeatureUid: selectionContext.featureUid,
      selectionLabel: selectionContext.featureLabel,
    }));
  }, [selectionContext, updateFilters]);

  // Indique si une sélection a été faite (même si la couche n'est pas visible)
  const hasSelectionChosen =
    Boolean(filters.selectionMode) &&
    Boolean(filters.selectionFeatureUid) &&
    Boolean(filters.selectedSelectionLayerId);

  // Validation stricte: la sélection est considérée "valide" si la couche est visible
  const hasValidSelection = hasSelectionChosen &&
    visibleEnvironmentalLayers.some(({ id }) => id === filters.selectedSelectionLayerId);


  useEffect(() => {
    if (
      !filters.selectionMode ||
      !filters.selectedSelectionLayerId ||
      visibleEnvironmentalLayers.some(
        ({ id }) => id === filters.selectedSelectionLayerId
      )
    ) {
      return;
    }

    const fallbackLayerId = resolveSearchLayerId(activeLayerId);
    selectedRestitutionLayerIdRef.current = fallbackLayerId;
    setSelectedRestitutionLayerId(fallbackLayerId);
    updateFilters((prev) => ({
      ...prev,
      selectionMode: false,
      selectedSelectionLayerId: null,
      selectionFeatureUid: null,
      selectionLabel: null,
      restitutionLayerId: fallbackLayerId,
    }));
    onSelectionInvalidated?.();
  }, [
    activeLayerId,
    filters.selectedSelectionLayerId,
    filters.selectionMode,
    onSelectionInvalidated,
    updateFilters,
    visibleEnvironmentalLayers,
  ]);

  // Déterminer quel profil utiliser
  const activeProfile = useMemo(() => {
    // 1. Si un profil est explicitement fourni, l'utiliser
    if (filterProfile) {
      console.log("📋 Utilisation du profil explicite:", filterProfile.name);
      return filterProfile;
    }

    // 2. Si une couche active est fournie, récupérer son profil
    if (activeLayerId) {
      const layerProfile = getFilterProfileForLayer(activeLayerId);
      console.log(
        `📋 Profil auto-détecté pour la couche "${activeLayerId}":`,
        layerProfile.name
      );
      return layerProfile;
    }

    // 3. Sinon, utiliser le profil complet par défaut
    console.log("📋 Utilisation du profil par défaut: FULL");
    return FILTER_PROFILES.FULL;
  }, [activeLayerId, filterProfile]);

  // Configuration de visibilité des filtres
  const filterVisibility = useMemo(() => {
    const visibility = {
      showTaxon: isFilterVisible(FILTER_TYPES.TAXON, activeProfile),
      showDate: isFilterVisible(FILTER_TYPES.DATE, activeProfile),
      showDepartment: isFilterVisible(FILTER_TYPES.DEPARTMENT, activeProfile),
      showCommune: isFilterVisible(FILTER_TYPES.COMMUNE, activeProfile),
      showTaxonomicGroup: isFilterVisible(FILTER_TYPES.TAXONOMIC_GROUP, activeProfile),
    };

    console.log("👁️ Visibilité des filtres:", visibility);
    return visibility;
  }, [activeProfile]);

  // === HANDLERS ===

  const handleDateChange = useCallback((dateRange) => {
    updateFilters((prev) => ({
      ...prev,
      dateDeb: dateRange?.startDate,
      dateFin: dateRange?.endDate,
    }));
  }, [updateFilters]);

  const handleTaxChange = useCallback(
    (taxons) => {
      // Store the complete taxon objects (not just cd_ref)
      // This allows us to display nom_vern and nom_complet without additional requests
      let selectedTaxons = [];

      if (Array.isArray(taxons)) {
        selectedTaxons = taxons;
        // Cache each selected taxon for later retrieval
        taxonsCache.addMultipleToCache(taxons);
      } else if (taxons) {
        selectedTaxons = [taxons];
        taxonsCache.addToCache(taxons);
      }

      console.log(
        "🔬 CHANGEMENT DE TAXON - Nouvelle sélection (objets complets):",
        selectedTaxons
      );
      console.log(
        "🔬 CD_REF pour URL:",
        selectedTaxons.map((t) => t.cd_ref || t)
      );

      updateFilters((prev) => ({
        ...prev,
        filteredTaxons: selectedTaxons,
      }));
    },
    [taxonsCache, updateFilters]
  );

  const handleDptChange = useCallback((departements) => {
    const selectedCodes = Array.isArray(departements)
      ? departements.map((dep) => dep.code_dpt || dep)
      : departements
      ? [departements.code_dpt || departements]
      : [];

    console.log("🏘️ Changement de département - nouvelle sélection:", selectedCodes);

    // Selecting a department/commune must disable selection-based search
    window.externalLayersObs?.clearSelection?.();
    window.externalLayersObs?.setSelectionActive?.(false);

    updateFilters((prev) => ({
      ...prev,
      filteredDepartments: selectedCodes,
      filteredCommunes: [],
      // Ensure selection mode is disabled when user chooses departments
      selectionMode: false,
      selectedSelectionLayerId: null,
      selectionFeatureUid: null,
      selectionLabel: null,
    }));
  }, [updateFilters]);

  const handleComChange = useCallback((communes) => {
    console.log(
      "🏠 handleComChange RECEIVED from child component. Raw input:",
      communes,
      "Type:",
      typeof communes
    );

    const communesArray = Array.isArray(communes)
      ? communes.map((com) => com.code_insee || com)
      : communes
      ? [communes.code_insee || communes]
      : [];

    console.log(
      "🏠 Changement de commune - nouvelle sélection après traitement:",
      communesArray
    );
    console.log(
      "🏠 Current filtersRef before update:",
      filtersRef.current?.filteredCommunes
    );

    // Selecting a commune must disable selection-based search
    window.externalLayersObs?.clearSelection?.();
    window.externalLayersObs?.setSelectionActive?.(false);

    updateFilters((prev) => {
      console.log(
        "🏠 updateFilters callback - prev state had communes:",
        prev.filteredCommunes
      );
      const newState = {
        ...prev,
        filteredCommunes: communesArray,
        // Ensure selection mode is disabled when user chooses communes
        selectionMode: false,
        selectedSelectionLayerId: null,
        selectionFeatureUid: null,
        selectionLabel: null,
      };
      console.log(
        "🏠 updateFilters callback - new state communes:",
        newState.filteredCommunes
      );
      return newState;
    });
  }, [updateFilters]);

  const handleGrpChange = useCallback((selectedNodes) => {
    console.log("🌳 Nœuds sélectionnés (deepest only):", selectedNodes);

    // Extraire les id des nœuds les plus profonds uniquement
    // CheckBoxTreeView retourne maintenant seulement les feuilles/nœuds les plus profonds
    const selectedIds = (selectedNodes || []).map((node) => node.id);

    console.log("🆔 id sélectionnés:", selectedIds);

    updateFilters((prev) => ({
      ...prev,
      filteredGroupes: selectedIds, // Stocker les IDs pour l'UI et la soumission
      filteredTaxons: [],
    }));
  }, [updateFilters]);

  const handleSelectionModeChange = useCallback(
    (enabled) => {
      let restitutionLayerId = selectedRestitutionLayerIdRef.current;
      if (!enabled && restitutionLayerId === "selection") {
        restitutionLayerId = resolveSearchLayerId(activeLayerId);
        selectedRestitutionLayerIdRef.current = restitutionLayerId;
        setSelectedRestitutionLayerId(restitutionLayerId);
      }

      // When enabling selection-based search, clear any explicit department/commune filters
      updateFilters((prev) => ({
        ...prev,
        selectionMode: enabled,
        restitutionLayerId,
        filteredDepartments: enabled ? [] : prev.filteredDepartments,
        filteredCommunes: enabled ? [] : prev.filteredCommunes,
        // If enabling, keep selection-related fields as-is; disabling will keep them nullified above
        ...(enabled
          ? {
              selectedSelectionLayerId: prev.selectedSelectionLayerId || null,
              selectionFeatureUid: prev.selectionFeatureUid || null,
              selectionLabel: prev.selectionLabel || null,
            }
          : {}),
      }));

      window.externalLayersObs?.setSelectionActive?.(
        enabled && Boolean(filtersRef.current.selectionFeatureUid)
      );
    },
    [activeLayerId, updateFilters]
  );

  const handleSelectionLayerChange = useCallback(
    (layerId) => {
      const matchesCurrentSelection = selectionContext?.layerId === layerId;
      window.externalLayersObs?.setSelectionActive?.(
        Boolean(matchesCurrentSelection)
      );
      updateFilters((prev) => ({
        ...prev,
        selectedSelectionLayerId: layerId || null,
        selectionFeatureUid: matchesCurrentSelection
          ? selectionContext.featureUid
          : null,
        selectionLabel: matchesCurrentSelection
          ? selectionContext.featureLabel
          : null,
      }));
    },
    [selectionContext, updateFilters]
  );

  const handleRequestSelectionChange = useCallback(() => {
    window.dispatchEvent(
      new CustomEvent("sinp:request-zoning-selection", {
        detail: {
          layerId: filtersRef.current.selectedSelectionLayerId || null,
        },
      })
    );
  }, []);

  const buildSubmitParams = useCallback((filtersSnapshot = filtersRef.current) => {
    // Extract cd_ref from complete taxon objects for URL generation
    const taxonsForURL = (filtersSnapshot.filteredTaxons || []).map((tx) =>
      typeof tx === "object" && tx.cd_ref ? tx.cd_ref : tx
    );

    // Construire les paramètres en excluant les filtres non visibles
    return {
      ...(filterVisibility.showDate && {
        dateDeb: filtersSnapshot.dateDeb,
        dateFin: filtersSnapshot.dateFin,
      }),
      ...(filterVisibility.showTaxon &&
        taxonsForURL.length > 0 && {
          taxons: taxonsForURL, // Send only cd_ref values to URL builder
        }),
      ...(filterVisibility.showDepartment &&
        !filtersSnapshot.selectionMode &&
        (filtersSnapshot.filteredDepartments || []).length > 0 && {
          departements: filtersSnapshot.filteredDepartments,
        }),
      ...(filterVisibility.showCommune &&
        !filtersSnapshot.selectionMode &&
        (filtersSnapshot.filteredCommunes || []).length > 0 && {
          communes: filtersSnapshot.filteredCommunes,
        }),
      ...(filterVisibility.showTaxonomicGroup &&
        taxonsForURL.length === 0 &&
        (filtersSnapshot.filteredGroupes || []).length > 0 && {
          groupes: filtersSnapshot.filteredGroupes, // Envoyer directement les IDs sélectionnés
        }),
    };
  }, [filterVisibility]);

  const submitForLayer = useCallback(async (layerId, filtersSnapshot = filtersRef.current) => {
    console.log("🚀 [GlobalFilters] handleSubmit APPELÉ");
    console.log(
      "🚀 [GlobalFilters] onSubmit disponible:",
      typeof onSubmit,
      onSubmit !== undefined
    );

    // Use the synchronous ref to avoid stale state when submit is immediate
    const currentFilters = filtersSnapshot;
    // If selection mode is active, ensure a selection has been chosen
    if (currentFilters.selectionMode && !(
      Boolean(currentFilters.selectionFeatureUid) &&
      Boolean(currentFilters.selectedSelectionLayerId)
    )) {
      const error = new Error(
        "Sélectionnez un zonage avant d'appliquer les filtres."
      );
      onSubmitError?.(error);
      return;
    }

    const params = buildSubmitParams(currentFilters);
    console.log("===== 📤 SOUMISSION DES PARAMETRES =====");
    console.log("État complet des filtres (ref):", currentFilters);
    console.log("Paramètres à envoyer à mviewer:", params);
    console.log("Couche de restitution:", layerId);
    console.log("=".repeat(40));

    if (onSubmit) {
      console.log("✅ [GlobalFilters] Appel de onSubmit avec params:", params);
      setIsLoading(true);
      try {
        // Passer aussi l'état complet des filtres pour le rebinding
        await onSubmit(params, currentFilters, layerId);
        lastSubmittedFiltersRef.current = currentFilters;
        setHasSubmittedSearch(true);
        console.log("✅ [GlobalFilters] onSubmit terminé avec succès");
      } catch (error) {
        console.error("❌ [GlobalFilters] Erreur lors de la soumission:", error);
        if (typeof onSubmitError === "function") {
          onSubmitError(error);
        }
      } finally {
        setIsLoading(false);
      }
    } else {
      console.error("❌ [GlobalFilters] onSubmit est undefined !");
    }
  }, [buildSubmitParams, hasValidSelection, onSubmit, onSubmitError]);

  const handleSubmit = useCallback(() => {
    return submitForLayer(selectedRestitutionLayerIdRef.current);
  }, [submitForLayer]);

  const handleRestitutionChange = useCallback(
    async (layerId) => {
      if (!layerId || layerId === selectedRestitutionLayerId) {
        return;
      }
      if (layerId === "selection" && !hasValidSelection) {
        return;
      }

      selectedRestitutionLayerIdRef.current = layerId;
      setSelectedRestitutionLayerId(layerId);
      updateFilters((currentFilters) => ({
        ...currentFilters,
        restitutionLayerId: layerId,
      }));
      const lastSubmittedFilters = lastSubmittedFiltersRef.current
        ? {
            ...lastSubmittedFiltersRef.current,
            restitutionLayerId: layerId,
          }
        : null;
      if (!hasSubmittedSearch || !lastSubmittedFilters) {
        return;
      }

      await submitForLayer(layerId, lastSubmittedFilters);
    },
    [
      hasSubmittedSearch,
      hasValidSelection,
      selectedRestitutionLayerId,
      submitForLayer,
      updateFilters,
    ]
  );

  useEffect(() => {
    const handleExternalRestitutionChange = (event) => {
      handleRestitutionChange(event.detail?.layerId);
    };

    window.addEventListener(
      "sinp:restitution-layer-change",
      handleExternalRestitutionChange
    );
    return () =>
      window.removeEventListener(
        "sinp:restitution-layer-change",
        handleExternalRestitutionChange
      );
  }, [handleRestitutionChange]);

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("sinp:filter-loading-state", {
        detail: { isLoading },
      })
    );
  }, [isLoading]);

  const handleReset = useCallback(() => {
    console.log("🔄 Réinitialisation des filtres");
    const fallbackLayerId =
      selectedRestitutionLayerIdRef.current === "selection"
        ? resolveSearchLayerId(activeLayerId)
        : selectedRestitutionLayerIdRef.current;
    selectedRestitutionLayerIdRef.current = fallbackLayerId;
    setSelectedRestitutionLayerId(fallbackLayerId);
    updateFilters({
      ...defaultFilters,
      restitutionLayerId: fallbackLayerId,
    });
    setHasSubmittedSearch(false);
    lastSubmittedFiltersRef.current = null;
    if (onReset) {
      onReset();
    }
    onSelectionClear?.();
  }, [
    activeLayerId,
    defaultFilters,
    onReset,
    onSelectionClear,
    updateFilters,
  ]);

  // Vérifier si au moins un filtre est actif (différent des valeurs par défaut)
  const hasActiveFilters = useMemo(() => {
    const hasNonEmptyArrays =
      filters.filteredDepartments?.length > 0 ||
      filters.filteredCommunes?.length > 0 ||
      filters.filteredTaxons?.length > 0 ||
      filters.filteredGroupes?.length > 0;

    // Vérifier si les dates sont différentes des dates par défaut
    const hasDifferentDates =
      filters.dateDeb !== defaultFilters.dateDeb ||
      filters.dateFin !== defaultFilters.dateFin;

    return hasNonEmptyArrays || hasDifferentDates || hasValidSelection;
  }, [filters, defaultFilters, hasValidSelection]);

  const activeFilterCount = useMemo(() => {
    const standardLocationCount = filters.selectionMode
      ? 0
      : (filters.filteredDepartments || []).length +
        (filters.filteredCommunes || []).length;
    const dateCount =
      filters.dateDeb !== defaultFilters.dateDeb ||
      filters.dateFin !== defaultFilters.dateFin
        ? 1
        : 0;

    return (
      standardLocationCount +
      (filters.filteredTaxons || []).length +
      (filters.filteredGroupes || []).length +
      dateCount +
      (hasSelectionChosen ? 1 : 0)
    );
  }, [defaultFilters, filters, hasValidSelection]);

  const canSubmit =
    filters.selectionMode
      ? hasSelectionChosen
      : hasActiveFilters ||
        activeProfile?.allowSubmitWithoutActiveFilters === true;

  useEffect(() => {
    window.dispatchEvent(
      new CustomEvent("sinp:filter-actions-state", {
        detail: {
          filterCount: activeFilterCount,
          canReset: !isLoading,
          canSubmit: !isLoading && canSubmit,
          hasSubmittedSearch,
        },
      })
    );
  }, [
    activeFilterCount,
    canSubmit,
    hasSubmittedSearch,
    isLoading,
  ]);

  useEffect(() => {
    const handleSubmitRequest = () => {
      if (!isLoading && canSubmit) {
        handleSubmit();
      }
    };
    const handleResetRequest = () => {
      if (!isLoading) {
        handleReset();
      }
    };

    window.addEventListener("sinp:filter-submit-request", handleSubmitRequest);
    window.addEventListener("sinp:filter-reset-request", handleResetRequest);
    return () => {
      window.removeEventListener(
        "sinp:filter-submit-request",
        handleSubmitRequest
      );
      window.removeEventListener("sinp:filter-reset-request", handleResetRequest);
    };
  }, [canSubmit, handleReset, handleSubmit, isLoading]);

  // Expose imperative method for modal to force rebind filters
  useImperativeHandle(
    ref,
    () => ({
      rebindFilters: (savedFilters) => {
        console.log("🔄 Rebinding filters imperatively:", savedFilters);
        if (savedFilters) {
          // Try to recover complete objects from cache
          const restoredRestitutionLayerId =
            savedFilters.restitutionLayerId || selectedRestitutionLayerIdRef.current;
          let restoredFilters = {
            ...savedFilters,
            restitutionLayerId: restoredRestitutionLayerId,
          };

          if (restoredRestitutionLayerId) {
            selectedRestitutionLayerIdRef.current = restoredRestitutionLayerId;
            setSelectedRestitutionLayerId(restoredRestitutionLayerId);
          }

          if (savedFilters.filteredTaxons && savedFilters.filteredTaxons.length > 0) {
            const taxonIds = savedFilters.filteredTaxons.map((t) =>
              typeof t === "object" ? t.cd_ref : t
            );
            const completeObjects = restoreMultipleFromCache(taxonIds);
            if (completeObjects.length > 0) {
              restoredFilters.filteredTaxons = completeObjects;
              console.log(
                "🔄 Restored taxons from cache in rebindFilters:",
                completeObjects
              );
            }
          }

          updateFilters(restoredFilters);
        }
      },
      invalidateSelection: () => {
        const fallbackLayerId = resolveSearchLayerId(activeLayerId);
        selectedRestitutionLayerIdRef.current = fallbackLayerId;
        setSelectedRestitutionLayerId(fallbackLayerId);
        updateFilters((prev) => ({
          ...prev,
          selectionMode: false,
          selectedSelectionLayerId: null,
          selectionFeatureUid: null,
          selectionLabel: null,
          restitutionLayerId: fallbackLayerId,
        }));
      },
    }),
    [activeLayerId, restoreMultipleFromCache, updateFilters]
  );

  return (
    <GlobalFiltersUI
      filters={filters}
      filterVisibility={filterVisibility}
      activeProfile={activeProfile}
      handleDateChange={handleDateChange}
      handleTaxChange={handleTaxChange}
      handleDptChange={handleDptChange}
      handleComChange={handleComChange}
      handleGrpChange={handleGrpChange}
      selectionMode={Boolean(filters.selectionMode)}
      hasValidSelection={hasValidSelection}
      selectionLabel={filters.selectionLabel}
      visibleEnvironmentalLayers={visibleEnvironmentalLayers}
      selectedSelectionLayerId={filters.selectedSelectionLayerId}
      onSelectionModeChange={handleSelectionModeChange}
      onSelectionLayerChange={handleSelectionLayerChange}
      onRequestSelectionChange={handleRequestSelectionChange}
      isLoading={isLoading}
    />
  );
};

const GlobalFilters = forwardRef(GlobalFiltersComponent);

export default GlobalFilters;
