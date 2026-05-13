var sinpOverriding = (function () {
  return {
    // Addon Init
    init: async function () {
      const loadScript = (src) =>
        new Promise((resolve, reject) => {
          if (document.querySelector(`script[src="${src}"]`)) return resolve();
          const s = document.createElement('script');
          s.src = src;
          s.type = 'text/javascript';
          s.onload = resolve;
          s.onerror = reject;
          document.body.appendChild(s);
        });

      try {
        await loadScript('apps/sinp_hdf/custom_scripts/sinpRepository.js');
        await loadScript('apps/sinp_hdf/custom_scripts/sinpQueryBuilder.js');
      } catch (err) {
        console.error('Erreur de chargement des scripts sinp:', err);
      }
    },
  };
})();
new CustomComponent("sinpOverriding", sinpOverriding.init);