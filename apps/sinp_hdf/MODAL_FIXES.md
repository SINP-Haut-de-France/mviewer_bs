# Corrections Modal - Positionnement et Responsive

## Problèmes résolus

### 1. **Limiteur de déplacement (Drag boundaries)**

#### Avant
- La modale pouvait être déplacée complètement hors du viewport
- Pas de contraintes réelles sur le positionnement

#### Après (BaseModal.jsx)
```javascript
// Récupérer les dimensions de la modale
const modal = document.querySelector('.base-modal-content');
const modalWidth = modal ? modal.offsetWidth : 600;
const modalHeight = modal ? modal.offsetHeight : 400;

// Limiter le déplacement dans les limites du navigateur
const minTop = 70;           // Sous le header mviewer
const maxTop = window.innerHeight - 50;
const minLeft = modalWidth / 2;
const maxLeft = window.innerWidth - (modalWidth / 2);
```

**Résultat:** La modale reste toujours visible, le header ne se cache jamais derrière le navbar mviewer.

---

### 2. **Adaptabilité à la taille de la modale**

#### BaseModal.css
- **Ajout:** `min-width: 300px` pour assurer une largeur minimale
- **Ajout:** `box-sizing: border-box` pour éviter les débordements
- **Ajout:** `max-height: 85%` (au lieu de 80%) pour plus d'espace sur mobile
- **Ajout:** Propriétés `flex-shrink: 0` sur header/body pour contrôler les redimensionnements
- **Ajout:** `overflow-x: hidden` sur body pour éviter scrollbar horizontal

#### Changements responsives:
```css
@media (max-width: 768px) {
  .base-modal-content {
    max-width: 95%;
    max-height: 90%;
  }
}

@media (max-width: 480px) {
  .base-modal-content {
    max-width: 98%;
    max-height: 95%;
  }
}
```

---

### 3. **Adaptation du contenu intérieur**

#### GlobalFilterModal.css
- **Changement:** De `max-height: 70vh` → `flex: 1; min-height: 0`
- **Ajout:** `overflow-x: hidden` pour éviter débordements horizontaux
- **Ajout:** `box-sizing: border-box` sur tous les éléments
- **Ajout:** `flex-shrink: 0` sur les alertes et actions pour éviter compression

#### MultiSelectSearch.css
- **Ajout:** `width: 100%` et `box-sizing: border-box` sur conteneur
- **Ajout:** `max-height: 150px` et `overflow-y: auto` sur `.search-input` pour gérer les tags
- **Ajout:** `white-space: nowrap` et `text-overflow: ellipsis` sur tags
- **Amélioration:** Z-index de `.results-list` = 1000 (au lieu de 10)
- **Amélioration:** Propriétés responsive pour font-size et padding

---

### 4. **BaseModalUI style inline**

#### Avant
```javascript
style={{
  content: {
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: "translate(-50%, -50%)",
    position: "fixed",
  },
}}
```

#### Après
```javascript
style={{
  content: {
    top: `${position.top}px`,
    left: `${position.left}px`,
    transform: "translate(-50%, -50%)",
    position: "fixed",
    right: "auto",      // Évite conflict avec right
    bottom: "auto",     // Évite conflict avec bottom
  },
}}
```

---

### 5. **Surcharges custom_mviewer.css**

Ajout de styles de surcharge pour les composants React:

```css
/* Limiter la modale au viewport */
.base-modal-content {
    margin: 0 !important;
}

/* Assurer que la modale se redimensionne correctement */
.modal-filters-wrapper {
    max-width: calc(90vw - 40px);
}

/* Responsive pour petit écran */
@media (max-width: 768px) {
    .base-modal-content {
        max-width: 95vw !important;
    }
}

@media (max-width: 480px) {
    .base-modal-content {
        max-width: 98vw !important;
    }
}
```

---

## Architecture Flexbox

La modale utilise une architecture flexbox cohérente:

```
Modal (position: fixed, display: flex, flex-direction: column)
├── Header (flex-shrink: 0) - Hauteur fixe
└── Body (flex: 1, min-height: 0) - Remplit l'espace disponible
    └── Content (overflow-y: auto) - Scrollable si dépassement
```

Cela garantit:
- Le header reste toujours visible
- Le contenu prend l'espace disponible
- Le scrollbar ne s'applique que si nécessaire

---

## Compatibility

- ✅ Desktop (1920px+)
- ✅ Tablette (768px - 1024px)
- ✅ Mobile (320px - 480px)
- ✅ Conforme avec bootstrap 3 (mviewer.css)
- ✅ Compatible avec theme sinp_hdf.css (via custom_mviewer.css)

---

## Points clés à retenir

1. **Transform translate(-50%, -50%)**: Le top/left référence le centre de la modale
2. **minLeft/maxLeft**: Doivent être égaux à `modalWidth / 2`
3. **Flexbox min-height: 0**: Nécessaire pour que flex: 1 fonctionne sur enfants
4. **box-sizing: border-box**: Essentiel pour éviter débordements avec padding
5. **flex-shrink: 0**: Empêche la compression des éléments fixes (header, actions)

---

## Fichiers modifiés

1. `/react-components/components/BaseModal/BaseModal.jsx` - Logique de limitation
2. `/react-components/components/BaseModal/BaseModal.css` - Styles responsive
3. `/react-components/components/BaseModal/BaseModalUI.jsx` - Style inline
4. `/react-components/sinp_components/GlobalFilterModal/GlobalFilterModal.css` - Adaptation contenu
5. `/react-components/components/MultiSelectSearch/MultiSearchComponent.css` - Responsive tags
6. `/commons/css/custom_mviewer.css` - Surcharges thème
