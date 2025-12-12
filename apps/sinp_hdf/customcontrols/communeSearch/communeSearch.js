mviewer.customControls.communeSearch = (function () {
  var _initialized = false;
  const _submit = (filters) => {
    mviewer.customLayers.communeSearch.get_datas(filters).then((data) => {
      console.log(data);
    });
  };

  return {
    init: async function () {
      console.log("communeSearchControl init");
    },
    submit: _submit,
    destroy: function () {
      // mandatory - code executed when layer panel is closed
     _initialized = false;
    }
  };
})();