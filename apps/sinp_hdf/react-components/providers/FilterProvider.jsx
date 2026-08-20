import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";

/**
 * Context pour gérer l'état global des filtres
 */
const FilterContext = createContext(null);

const DEFAULT_FILTER_UI_CONFIG = {
  closeButton: {
    visible: false,
    enabled: false,
  },
  density: "legacy-compact",
};

const TOAST_DURATION_MS = 5000;

/**
 * Provider global pour la gestion des filtres SINP
 * Permet de contrôler les filtres depuis n'importe quel composant
 */
export const FilterProvider = ({ children }) => {
  const [filterState, setFilterState] = useState({
    displayMode: "sidebar",
    isModalOpen: false,
    onSubmit: null,
    activeLayerId: null,
    filterProfile: null,
    currentFilters: null,
    selectionContext: null,
    onSelectionSubmit: null,
    uiConfig: DEFAULT_FILTER_UI_CONFIG,
    modalOpenRequestId: 0,
  });
  const [toasts, setToasts] = useState([]);

  const dismissToast = useCallback((toastId) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
  }, []);

  const pushToast = useCallback((message, options = {}) => {
    if (!message) {
      return null;
    }

    const id = options.id || `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const duration = options.duration ?? TOAST_DURATION_MS;
    const toast = {
      id,
      message,
      type: options.type || "error",
      title: options.title || "Erreur",
      createdAt: Date.now(),
    };

    setToasts((prev) => [...prev, toast]);

    if (duration > 0) {
      window.setTimeout(() => {
        dismissToast(id);
      }, duration);
    }

    return id;
  }, [dismissToast]);

  const pushFilterError = useCallback((message, options = {}) => {
    return pushToast(message, {
      type: "error",
      title: options.title || "Recherche avancée",
      duration: options.duration,
      id: options.id,
    });
  }, [pushToast]);

  const mergeUIConfig = useCallback((prevUIConfig, config = {}) => {
    const requestedUIConfig = config.uiConfig || {};
    const requestedCloseButton = config.closeButton || requestedUIConfig.closeButton;

    return {
      ...prevUIConfig,
      ...requestedUIConfig,
      closeButton: {
        ...prevUIConfig.closeButton,
        ...requestedUIConfig.closeButton,
        ...requestedCloseButton,
      },
      density: config.density ?? requestedUIConfig.density ?? prevUIConfig.density,
    };
  }, []);

  const mergeConfig = useCallback(
    (prevState, config = {}) => ({
      ...prevState,
      onSubmit: Object.prototype.hasOwnProperty.call(config, "onSubmit")
        ? config.onSubmit
        : prevState.onSubmit,
      activeLayerId: config.activeLayerId ?? prevState.activeLayerId,
      filterProfile: Object.prototype.hasOwnProperty.call(config, "filterProfile")
        ? config.filterProfile
        : prevState.filterProfile,
      selectionContext: Object.prototype.hasOwnProperty.call(config, "selectionContext")
        ? config.selectionContext
        : prevState.selectionContext,
      onSelectionSubmit: Object.prototype.hasOwnProperty.call(config, "onSelectionSubmit")
        ? config.onSelectionSubmit
        : prevState.onSelectionSubmit,
      uiConfig: mergeUIConfig(prevState.uiConfig, config),
    }),
    [mergeUIConfig]
  );

  // === MODAL CONTROLS ===

  const openModal = useCallback((config = {}) => {
    console.log("📂 Ouverture de la modal avec config:", config);
    setFilterState((prev) => ({
      ...mergeConfig(prev, config),
      displayMode: "modal",
      isModalOpen: true,
      modalOpenRequestId: prev.modalOpenRequestId + 1,
    }));
  }, [mergeConfig]);

  const closeModal = useCallback(() => {
    console.log("📕 Fermeture de la modal");
    setFilterState((prev) => ({
      ...prev,
      isModalOpen: false,
    }));
  }, []);

  // === SIDEBAR CONTROLS ===

  const showSidebar = useCallback((config = {}) => {
    console.log("📌 Affichage des filtres dans le sidebar", config);
    setFilterState((prev) => ({
      ...mergeConfig(prev, config),
      displayMode: "sidebar",
      isModalOpen: false,
    }));
  }, [mergeConfig]);

  const switchToModal = useCallback((config = {}) => {
    console.log("🪟 Bascule des filtres en mode fenêtré", config);
    openModal(config);
  }, [openModal]);

  const toggleSidebar = useCallback((config = {}) => {
    console.log("🔄 Toggle sidebar");
    showSidebar(config);
  }, [showSidebar]);

  const setSidebarLayer = useCallback((layerId) => {
    console.log("🗺️ Changement de couche active:", layerId);
    setFilterState((prev) => ({
      ...prev,
      activeLayerId: layerId,
    }));
  }, []);

  const setCurrentFilters = useCallback((filters) => {
    setFilterState((prev) => ({
      ...prev,
      currentFilters: filters,
    }));
  }, []);

  const clearCurrentFilters = useCallback(() => {
    setFilterState((prev) => ({
      ...prev,
      currentFilters: null,
    }));
  }, []);

  const clearSelectionContext = useCallback(() => {
    setFilterState((prev) => ({
      ...prev,
      selectionContext: null,
      onSelectionSubmit: null,
    }));
  }, []);

  const setSelectionContext = useCallback(
    (selectionContext, onSelectionSubmit = null) => {
      setFilterState((prev) => ({
        ...prev,
        activeLayerId: "communeSearch",
        selectionContext,
        onSelectionSubmit,
        currentFilters: {
          ...(prev.currentFilters || {}),
          selectionMode: Boolean(selectionContext),
          selectedSelectionLayerId: selectionContext?.layerId || null,
          selectionFeatureUid: selectionContext?.featureUid || null,
          selectionLabel: selectionContext?.featureLabel || null,
        },
      }));
    },
    []
  );

  const modalState = useMemo(
    () => ({
      isOpen: filterState.displayMode === "modal" && filterState.isModalOpen,
      onSubmit: filterState.onSubmit,
      activeLayerId: filterState.activeLayerId,
      filterProfile: filterState.filterProfile,
      selectionContext: filterState.selectionContext,
      onSelectionSubmit: filterState.onSelectionSubmit,
      uiConfig: filterState.uiConfig,
      openRequestId: filterState.modalOpenRequestId,
    }),
    [filterState]
  );

  const sidebarState = useMemo(
    () => ({
      isVisible: filterState.displayMode === "sidebar",
      activeLayerId: filterState.activeLayerId,
      filterProfile: filterState.filterProfile,
      onSubmit: filterState.onSubmit,
      selectionContext: filterState.selectionContext,
      onSelectionSubmit: filterState.onSelectionSubmit,
      uiConfig: filterState.uiConfig,
    }),
    [filterState]
  );

  // === VALUE ===

  // Utiliser useMemo pour créer l'objet value (pas useCallback qui est pour les fonctions)
  const value = useMemo(
    () => ({
      // Modal
      displayMode: filterState.displayMode,
      modalState,
      openModal,
      closeModal,

      // Sidebar
      sidebarState,
      showSidebar,
      switchToModal,
      toggleSidebar,
      setSidebarLayer,

      // Shared session state
      currentFilters: filterState.currentFilters,
      setCurrentFilters,
      clearCurrentFilters,
      clearSelectionContext,
      setSelectionContext,

      // Notifications globales
      toasts,
      dismissToast,
      pushToast,
      pushFilterError,
    }),
    [
      filterState.displayMode,
      filterState.currentFilters,
      modalState,
      openModal,
      closeModal,
      sidebarState,
      showSidebar,
      switchToModal,
      toggleSidebar,
      setSidebarLayer,
      setCurrentFilters,
      clearCurrentFilters,
      clearSelectionContext,
      setSelectionContext,
      toasts,
      dismissToast,
      pushToast,
      pushFilterError,
    ]
  );

  // ⚠️ IMPORTANT: Exposer l'API au code legacy dès que le Provider est monté
  useEffect(() => {
    console.log("🔧 Initialisation de l'API FilterProvider...");

    // Récupérer initFilterAPI depuis reactComponentManager
    // Utiliser un import dynamique ou accéder directement à window
    const initAPI = () => {
      // Option 1: Via window (plus simple pour legacy)
      if (
        window.reactComponentManager &&
        typeof window.reactComponentManager.initFilterAPI === "function"
      ) {
        window.reactComponentManager.initFilterAPI(value);
        console.log("✅ Filter API exposée via window.reactComponentManager");
      } else {
        console.warn("⚠️ window.reactComponentManager.initFilterAPI non disponible");
      }
    };

    // Attendre un tick pour s'assurer que reactComponentManager est chargé
    const timer = setTimeout(initAPI, 0);

    return () => clearTimeout(timer);
  }, [value]);

  useEffect(() => {
    window.sinpToast = {
      error: (message, options = {}) => pushFilterError(message, options),
      notify: (message, options = {}) => pushToast(message, options),
      dismiss: dismissToast,
    };

    return () => {
      if (window.sinpToast) {
        delete window.sinpToast;
      }
    };
  }, [pushFilterError, pushToast, dismissToast]);

  return <FilterContext.Provider value={value}>{children}</FilterContext.Provider>;
};

/**
 * Hook pour accéder au contexte des filtres
 */
export const useFilters = () => {
  const context = useContext(FilterContext);
  if (!context) {
    throw new Error("useFilters doit être utilisé à l'intérieur de FilterProvider");
  }
  return context;
};
