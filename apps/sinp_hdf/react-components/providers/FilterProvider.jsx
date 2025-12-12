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

/**
 * Provider global pour la gestion des filtres SINP
 * Permet de contrôler les filtres depuis n'importe quel composant
 */
export const FilterProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    onSubmit: null,
    activeLayerId: null,
  });

  const [sidebarState, setSidebarState] = useState({
    isExpanded: false,
    activeLayerId: null,
  });

  // === MODAL CONTROLS ===

  const openModal = useCallback((config = {}) => {
    console.log("📂 Ouverture de la modal avec config:", config);
    setModalState({
      isOpen: true,
      onSubmit: config.onSubmit || null,
      activeLayerId: config.activeLayerId || null,
      filterProfile: config.filterProfile || null,
    });
  }, []);

  const closeModal = useCallback(() => {
    console.log("📕 Fermeture de la modal");
    setModalState((prev) => ({
      ...prev,
      isOpen: false,
    }));
  }, []);

  // === SIDEBAR CONTROLS ===

  const toggleSidebar = useCallback(() => {
    console.log("🔄 Toggle sidebar");
    setSidebarState((prev) => ({
      ...prev,
      isExpanded: !prev.isExpanded,
    }));
  }, []);

  const setSidebarLayer = useCallback((layerId) => {
    console.log("🗺️ Changement de couche active:", layerId);
    setSidebarState((prev) => ({
      ...prev,
      activeLayerId: layerId,
    }));
  }, []);

  // === VALUE ===

  // Utiliser useMemo pour créer l'objet value (pas useCallback qui est pour les fonctions)
  const value = useMemo(
    () => ({
      // Modal
      modalState,
      openModal,
      closeModal,

      // Sidebar
      sidebarState,
      toggleSidebar,
      setSidebarLayer,
    }),
    [modalState, sidebarState, openModal, closeModal, toggleSidebar, setSidebarLayer]
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
