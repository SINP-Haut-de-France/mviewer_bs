import { useEffect, useRef } from "react";
import Shepherd from "shepherd.js";
import "shepherd.js/dist/css/shepherd.css";
import tutorialContent from "./tutorial.content.json";

const STORAGE_KEYS = {
  disabled: "sinpTutorialDisabled",
  seen: "sinpTutorialSeen",
  introShown: "sinpTutorialIntroShown",
  mviewerHelpDisabled: "helpCheckBox",
};

const INTRO_SELECTOR = "#sinp-tutorial-start";
const DISABLE_SELECTOR = "#sinp-tutorial-disable";
const RESET_SELECTOR = "#sinp-tutorial-reset";
const TUTORIAL_TAB_SELECTOR = "#sinp-tutoriels-tab";
const HELP_MODAL_SELECTOR = "#help";

const waitForElement = (selector, timeout = 4000) =>
  new Promise((resolve) => {
    const existingElement = document.querySelector(selector);

    if (existingElement) {
      resolve(existingElement);
      return;
    }

    const observer = new MutationObserver(() => {
      const element = document.querySelector(selector);

      if (element) {
        observer.disconnect();
        clearTimeout(timer);
        resolve(element);
      }
    });

    const timer = window.setTimeout(() => {
      observer.disconnect();
      resolve(null);
    }, timeout);

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
  });

const waitForAnyTarget = async (selectors, timeout = 3000) => {
  const targetSelectors = Array.isArray(selectors) ? selectors : [selectors];

  for (const selector of targetSelectors) {
    const element = await waitForElement(selector, timeout);

    if (element) {
      return {
        selector,
        element,
      };
    }
  }

  return null;
};

const shouldShowIntro = () =>
  localStorage.getItem(STORAGE_KEYS.disabled) !== "true" &&
  localStorage.getItem(STORAGE_KEYS.seen) !== "true";

const markTutorialSeen = () => {
  localStorage.setItem(STORAGE_KEYS.seen, "true");
  localStorage.setItem(STORAGE_KEYS.mviewerHelpDisabled, "true");
};

const disableTutorial = () => {
  localStorage.setItem(STORAGE_KEYS.disabled, "true");
  markTutorialSeen();
};

const activateTutorialTab = () => {
  const tabTrigger = document.querySelector(TUTORIAL_TAB_SELECTOR);

  if (!tabTrigger) {
    return;
  }

  if (window.bootstrap?.Tab) {
    window.bootstrap.Tab.getOrCreateInstance(tabTrigger).show();
    return;
  }

  document.querySelectorAll(".sinp-help .nav-link").forEach((tab) => {
    tab.classList.toggle("active", tab === tabTrigger);
    tab.setAttribute("aria-selected", tab === tabTrigger ? "true" : "false");
  });

  document.querySelectorAll(".sinp-help .tab-pane").forEach((panel) => {
    const isTutorialPanel = panel.id === "sinp-tutoriels";
    panel.classList.toggle("show", isTutorialPanel);
    panel.classList.toggle("active", isTutorialPanel);
  });
};

const showHelpModal = () => {
  const helpModal = document.querySelector(HELP_MODAL_SELECTOR);

  if (!helpModal || !window.bootstrap?.Modal) {
    return;
  }

  window.bootstrap.Modal.getOrCreateInstance(helpModal).show();
};

const hideHelpModal = () => {
  const helpModal = document.querySelector(HELP_MODAL_SELECTOR);

  if (!helpModal || !window.bootstrap?.Modal) {
    return;
  }

  window.bootstrap.Modal.getOrCreateInstance(helpModal).hide();
};

const getValidatedSteps = () =>
  tutorialContent.steps.filter(
    (step) =>
      step.enabled &&
      step.status === "validated" &&
      tutorialContent.status === "validated"
  );

const openAdvancedFiltersMenu = () => {
  const filtersTheme = document.getElementById("theme-react-filters");
  const filtersContainer = document.getElementById("react-sidebar-filter-panel")?.parentElement;

  if (!filtersTheme || !filtersContainer) {
    return;
  }

  filtersContainer.style.display = "block";
  filtersTheme.classList.add("active", "opened");
};

const expandFilterSection = (dataTour) => {
  window.dispatchEvent(
    new CustomEvent("sinpTutorial:expandFilterSection", {
      detail: { dataTour },
    })
  );
};

const runStepAction = (action) => {
  switch (action) {
    case "openAdvancedFilters":
      openAdvancedFiltersMenu();
      break;
    case "openTaxonomicGroupFilter":
      openAdvancedFiltersMenu();
      expandFilterSection("filter-taxonomic-group");
      break;
    default:
      break;
  }
};

const buildTourSteps = async () => {
  const resolvedSteps = [];

  for (const step of getValidatedSteps()) {
    const resolvedTarget = step.waitForTarget
      ? await waitForAnyTarget(step.target)
      : {
          selector: Array.isArray(step.target) ? step.target[0] : step.target,
          element: document.querySelector(
            Array.isArray(step.target) ? step.target[0] : step.target
          ),
        };

    if (!resolvedTarget && step.required) {
      console.warn(`[Tutoriel] Cible obligatoire introuvable pour l'étape ${step.id}`);
      return [];
    }

    if (!resolvedTarget) {
      console.warn(`[Tutoriel] Étape ignorée, cible introuvable: ${step.id}`);
      continue;
    }

    resolvedSteps.push({
      ...step,
      resolvedSelector: resolvedTarget.selector,
    });
  }

  return resolvedSteps;
};

const TutorialManager = () => {
  const activeTourRef = useRef(null);
  const listenersBoundRef = useRef(false);

  const startTutorial = async () => {
    activeTourRef.current?.cancel();

    const steps = await buildTourSteps();

    if (!steps.length) {
      markTutorialSeen();
      return;
    }

    const tour = new Shepherd.Tour({
      useModalOverlay: true,
      defaultStepOptions: {
        cancelIcon: {
          enabled: true,
        },
        classes: "sinp-tutorial-step",
        modalOverlayOpeningPadding: 6,
        scrollTo: {
          behavior: "smooth",
          block: "center",
        },
      },
    });

    steps.forEach((step, index) => {
      const isLastStep = index === steps.length - 1;

      tour.addStep({
        id: step.id,
        title: step.title,
        text: step.text,
        attachTo: {
          element: step.resolvedSelector,
          on: step.placement || "auto",
        },
        beforeShowPromise: () =>
          new Promise((resolve) => {
            runStepAction(step.beforeShowAction);
            window.setTimeout(resolve, 150);
          }),
        buttons: [
          {
            text: "Quitter",
            secondary: true,
            action: () => tour.cancel(),
          },
          ...(index > 0
            ? [
                {
                  text: "Précédent",
                  secondary: true,
                  action: () => tour.back(),
                },
              ]
            : []),
          {
            text: isLastStep ? "Terminer" : "Suivant",
            action: () => (isLastStep ? tour.complete() : tour.next()),
          },
        ],
      });
    });

    tour.on("complete", markTutorialSeen);
    tour.on("cancel", markTutorialSeen);
    activeTourRef.current = tour;
    tour.start();
  };

  useEffect(() => {
    let isMounted = true;

    const initTutorialIntro = async () => {
      const startButton = await waitForElement(INTRO_SELECTOR);
      const disableButton = document.querySelector(DISABLE_SELECTOR);
      const resetButton = document.querySelector(RESET_SELECTOR);

      if (
        !isMounted ||
        !startButton ||
        listenersBoundRef.current ||
        startButton.dataset.sinpTutorialBound === "true"
      ) {
        return;
      }

      listenersBoundRef.current = true;
      startButton.dataset.sinpTutorialBound = "true";

      startButton.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEYS.disabled);
        hideHelpModal();
        window.setTimeout(startTutorial, 350);
      });

      disableButton?.addEventListener("click", () => {
        disableTutorial();
        hideHelpModal();
      });

      resetButton?.addEventListener("click", () => {
        localStorage.removeItem(STORAGE_KEYS.disabled);
        localStorage.removeItem(STORAGE_KEYS.seen);
        localStorage.removeItem(STORAGE_KEYS.mviewerHelpDisabled);
        sessionStorage.removeItem(STORAGE_KEYS.introShown);
        activateTutorialTab();
        showHelpModal();
      });

      if (
        shouldShowIntro() &&
        sessionStorage.getItem(STORAGE_KEYS.introShown) !== "true"
      ) {
        sessionStorage.setItem(STORAGE_KEYS.introShown, "true");
        activateTutorialTab();
        showHelpModal();
      }
    };

    initTutorialIntro();

    return () => {
      isMounted = false;
      activeTourRef.current?.cancel();
    };
  }, []);

  return null;
};

export default TutorialManager;
