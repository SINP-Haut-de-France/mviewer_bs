** React Addon

Using react in mviewer you could use addons react compose of :

- a reactInjector.js use to inject our links to react builded files and the html entry point. 
You could add entrypoints or links to your build files depending depending your react project structure (see official [documentation](https://fr.legacy.reactjs.org/docs/getting-started.html))
```aiignore
var reactInjector = (function () {
  return {
    // Addon Init
    init: function () {
      if (!document.getElementById("react-global-root")) {
        // React container injection in a  <div>
        $("<div>", { id: "react-global-root" }).appendTo("body");
      }

      // Addinsg react builded files references
      if (!$("script[src='apps/sinp_hdf/addons/reactInjector/dist/main.js']").length) {
        $("<script>", {
          src: "apps/sinp_hdf/addons/reactInjector/dist/main.js",
          type: "text/javascript",
        }).appendTo("body");
      }

      if (!$("script[src='apps/sinp_hdf/addons/reactInjector/dist/reactComponentManager.js']").length) {
        $("<script>", {
          src: "apps/sinp_hdf/addons/reactInjector/dist/reactComponentManager.js",
          type: "text/javascript",
        }).appendTo("body");
      }
    },
  };
})();
new CustomComponent("reactInjector", reactInjector.init);
```
- a config.json file for mviewer connection, in this example my react injector balises are injected in the body of mviewer index.html.

```
{
  "js": ["reactInjector"],
  "css": null,
  "html": null,
  "target": "body",
  "options": {}
}
```
- In your mviewer config.xml add the reactInjector addon (see official [documentation](https://mviewerdoc.readthedocs.io/fr/latest/) for details) : 

```aiignore

	<application
		id="sinp_hdf"
		title="SINP Hauts-de-France"
		logo='apps/sinp_hdf/commons/img/logo/logo-obsbiodiv-hdf.png'
		help="apps/sinp_hdf/commons/sinp_aide.html"
		showhelp="false"
		favicon='apps/sinp_hdf/commons/img/logo/logo-arb-vertpng.ico'
		style='css/themes/sinp_hdf.css'
	/>
	<extensions>
		<extension type="component" id="reactInjector" path="apps/sinp_hdf/addons/"/>
	</extensions>
```

**Vite bundler commands for SINP HdF**

- Open a terminal in apps/sinp_hdf
- Run `npm run build` to generate the production package in `apps/sinp_hdf/dist`
- Run `npm run build:main` for the main React bundle only
- Run `npm run build:manager` for the `reactComponentManager` bundle only

The production package keeps the SINP structure required by mviewer and includes the minified addons, custom scripts, custom controls, custom layers, theme assets, templates, data files, and the `sinp_hdf.json` / `sinp_hdf.xml` configuration files.

For testing in dev environment you must rebuild the 2 packages each time you modify a React file.
