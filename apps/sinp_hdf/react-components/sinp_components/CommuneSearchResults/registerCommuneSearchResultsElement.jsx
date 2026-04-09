import React from "react";
import ReactDOM from "react-dom/client";
import CommuneSearchResults from "./CommuneSearchResults";

const ELEMENT_NAMES = [
  "mv-feature-search-results",
  "mv-commune-search-results",
  "mv-grid-search-results",
];

const renderElement = (element) => {
  const layerId = element.getAttribute("data-layer-id") || "communeSearch";
  const featureUid = element.getAttribute("data-feature-uid") || "";

  if (!element.__reactRoot) {
    element.__reactRoot = ReactDOM.createRoot(element);
  }

  element.__reactRoot.render(
    <CommuneSearchResults layerId={layerId} featureUid={featureUid} />
  );
};

const defineElement = () => {
  if (typeof window === "undefined") {
    return;
  }

  ELEMENT_NAMES.forEach((elementName) => {
    if (!window.customElements.get(elementName)) {
      class CommuneSearchResultsElement extends HTMLElement {
        static get observedAttributes() {
          return ["data-layer-id", "data-feature-uid"];
        }

        connectedCallback() {
          renderElement(this);
        }

        attributeChangedCallback() {
          if (this.isConnected) {
            renderElement(this);
          }
        }

        disconnectedCallback() {
          if (this.__reactRoot) {
            this.__reactRoot.unmount();
            this.__reactRoot = null;
          }
        }
      }

      window.customElements.define(elementName, CommuneSearchResultsElement);
    }
  });
};

defineElement();
