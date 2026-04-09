import React from "react";
import ReactDOM from "react-dom/client";
import { FilterProvider } from "./providers/FilterProvider";
import GlobalFilterManager from "./sinp_components/GlobalFilterManager/GlobalFilterManager";
import * as Sentry from "@sentry/react";
import "./sinp_components/CommuneSearchResults/registerCommuneSearchResultsElement";

// Initialiser window.roots avant tout
window.roots = window.roots || {};

console.log("🚀 Chargement de main.jsx...");

// === MONTAGE DU ROOT GLOBAL ===

const initGlobalRoot = () => {
  Sentry.init({
    dsn: "https://446e4a33a7547f744b8b1ed4626a342d@o4511070687526912.ingest.de.sentry.io/4511070688772176",
    sendDefaultPii: true,
    integrations: [Sentry.browserTracingIntegration(), Sentry.replayIntegration()],
    // Tracing
    tracesSampleRate: 1.0,
    tracePropagationTargets: [
      "http://localhost:5051/?config=apps/sinp_hdf.xml",
      /^https:\/\/agence-regionale-biodiversite\.sentry\.io\/api/,
    ],
    // Session Replay
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,
    // Enable logs to be sent to Sentry
    enableLogs: true,
  });

  const globalRootElement = document.getElementById("react-global-root");

  if (!globalRootElement) {
    console.error("❌ Element #react-global-root non trouvé");
    return;
  }

  console.log("✅ Element #react-global-root trouvé");

  const globalRoot = ReactDOM.createRoot(globalRootElement);

  globalRoot.render(
    <React.StrictMode>
      <FilterProvider>
        <GlobalFilterManager />
      </FilterProvider>
    </React.StrictMode>
  );

  // Sauvegarder la racine globale
  window.roots["react-global-root"] = globalRoot;

  console.log("✅ GlobalFilterManager monté dans react-global-root");
};

// Attendre que le DOM soit prêt
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initGlobalRoot);
} else {
  initGlobalRoot();
}

// Note: SidebarFilterPanel est maintenant géré par GlobalFilterManager via un portal
// Le conteneur #react-sidebar-filter-panel est créé par reactInjector.js

// === MONTAGE DES COMPOSANTS STANDALONE (data-react-component) ===

import MultiSelectSearchComponent from "./components/MultiSelectSearch/MultiSelectSearchComponent";
import CheckBoxTreeView from "./components/CheckBoxTreeView/CheckBoxTreeView";
import MultiCheckBox from "./components/MultiCheckBox/MultiCheckBox";
import DateFilter from "./components/DateFilter/DateFilter";
import Datasource from "./components/Datasource/Datasource";
import EspeceSearchFilter from "./sinp_components/EspeceSearchFilter/EspeceSearchFilter";
import ErrorButton from "@react/components/ErrorButton";

const initStandaloneComponents = () => {
  const reactElements = document.querySelectorAll("[data-react-component]");

  console.log(`📦 ${reactElements.length} composants standalone trouvés`);

  reactElements.forEach((element) => {
    const ComponentName = element.getAttribute("data-react-component");
    const props = JSON.parse(element.getAttribute("data-props") || "{}");

    let Component = null;

    switch (ComponentName) {
      case "MultiSelectSearchComponent":
        Component = MultiSelectSearchComponent;
        break;
      case "CheckBoxTreeView":
        Component = CheckBoxTreeView;
        break;
      case "MultiCheckBox":
        Component = MultiCheckBox;
        break;
      case "DateFilter":
        Component = DateFilter;
        break;
      case "Datasource":
        Component = Datasource;
        break;
      case "EspeceSearchFilter":
        Component = EspeceSearchFilter;
        break;
      case "ErrorButton":
        Component = ErrorButton;
        break;
      default:
        console.warn(`⚠️ Composant "${ComponentName}" non reconnu`);
    }

    if (Component && element.id) {
      // Vérifier si le composant n'est pas déjà monté
      if (window.roots[element.id]) {
        console.log(`⚠️ ${ComponentName} déjà monté dans #${element.id}, skip`);
        return;
      }

      const root = ReactDOM.createRoot(element);
      root.render(<Component {...props} />);
      window.roots[element.id] = root;
      console.log(`✅ ${ComponentName} monté dans #${element.id}`);
    }
  });
};

// Exposer la fonction pour permettre le montage manuel depuis l'extérieur
window.mountReactStandaloneComponents = initStandaloneComponents;

// Observer les changements du DOM pour monter automatiquement les nouveaux composants
const observeNewComponents = () => {
  const observer = new MutationObserver((mutations) => {
    let hasNewComponents = false;

    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) {
          // Element node
          // Vérifier si le nœud lui-même ou ses descendants ont data-react-component
          if (
            node.hasAttribute?.("data-react-component") ||
            node.querySelector?.("[data-react-component]")
          ) {
            hasNewComponents = true;
          }
        }
      });
    });

    if (hasNewComponents) {
      console.log("🔄 Nouveaux composants React détectés, montage...");
      initStandaloneComponents();
    }
  });

  // Observer tout le body pour détecter les nouveaux éléments
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  console.log("👁️ Observateur de composants React activé");
};

// Monter les composants standalone après le DOM
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", () => {
    initStandaloneComponents();
    observeNewComponents();
  });
} else {
  initStandaloneComponents();
  observeNewComponents();
}
