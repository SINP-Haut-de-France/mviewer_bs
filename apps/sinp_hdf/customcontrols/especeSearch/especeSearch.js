mviewer.customControls.especeSearch = (function () {
  let selectedEspeceCdRefs = [];
  var _initialized = false;
  const _submit = (filters) => {
    console.log('🔍 Soumission de la recherche d\'espèce:', filters);
    
    mviewer.customLayers.especeSearch.get_datas(filters).then((data) => {
      console.log('✅ Données reçues:', data);
    }).catch((error) => {
      console.error('❌ Erreur lors de la recherche:', error);
    });
  };

  const _handleSelectionChange = (event) => {
    selectedEspeceCdRefs = event.detail.cdRefs;
    console.log('📋 Espèce(s) sélectionnée(s):', event.detail.taxons);
  };

  const _handleReset = () => {
    selectedEspeceCdRefs = [];
    console.log('🔄 Réinitialisation de la recherche');
  };

  return {
    init: async function () {
      console.log("🚀 especeSearchControl init");
      
      // Écouter les événements du composant React
      window.addEventListener('especeSearchSelectionChange', _handleSelectionChange);
      window.addEventListener('especeSearchReset', _handleReset);
    },
    
    submit: _submit,
    destroy: function () {
      // mandatory - code executed when layer panel is closed
      _initialized = false;
    },
    getSelectedCdRefs: () => selectedEspeceCdRefs,
    
    // Méthode pour réinitialiser depuis l'extérieur
    reset: () => {
      selectedEspeceCdRefs = [];
      window.dispatchEvent(new CustomEvent('especeSearchReset'));
    }
  };
})();