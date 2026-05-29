(()=>{var y=(function(){return{init:function(){const o=()=>{const e=document.getElementById("sidebar-wrapper");if(!e){console.warn("sidebar-wrapper not found, retrying..."),setTimeout(o,200);return}if(!e.querySelector("ul.sidebar-nav")){console.warn("sidebar-nav not found, retrying..."),setTimeout(o,200);return}const n=document.createElement("ul");n.className="sidebar-nav nav-pills nav-stacked",n.id="react-filters-menu",n.style.marginTop="10px",n.style.paddingTop="10px",n.style.paddingLeft="0px",n.style.borderTop="1px solid #ddd";const r=document.createElement("li");r.className="",r.id="theme-react-filters";const i=document.createElement("a");i.href="#",i.innerHTML=`
          <div class="menu-theme-layers-name">
            <span class="fa-stack">
              <i class="fa fa-filter fa-stack-1x"></i>
            </span>
            <span>Filtres avancés</span>
          </div>
          <div class="toggle-theme-layers react-filters-header-actions">
            <span
              class="fa-stack react-filters-toggle-button"
              role="button"
              tabindex="0"
              title="Ouvrir les filtres dans une fenêtre"
              aria-label="Ouvrir les filtres dans une fenêtre">
              <i class="fa fa-window-restore fa-stack-1x"></i>
            </span>
          </div>
        `;const a=document.createElement("ul");a.className="nav-pills nav-stacked",a.style.listStyleType="none",a.style.display="none",a.style.paddingLeft="0px";const s=document.createElement("div");s.id="react-sidebar-filter-panel",s.className="react-filter-container",s.style.width="100%",s.style.maxWidth="100%",s.style.boxSizing="border-box",s.style.overflow="visible",s.style.position="relative",a.appendChild(s);const l=i.querySelector(".react-filters-toggle-button"),u=t=>{t.preventDefault(),t.stopPropagation(),window.dispatchEvent(new CustomEvent("reactSidebarFilters:openModal"))};l&&(l.addEventListener("click",u),l.addEventListener("keydown",function(t){(t.key==="Enter"||t.key===" ")&&u(t)})),i.addEventListener("click",function(t){t.preventDefault();const d=a.style.display==="none";a.style.display=d?"block":"none",r.classList.toggle("active",d),r.classList.toggle("opened",d)}),r.appendChild(i),r.appendChild(a),n.appendChild(r),e.appendChild(n);const f="apps/sinp_hdf/react-components/sinp_components/GlobalFilters/GlobalFiltersSidebar.css";if(!document.querySelector(`link[href='${f}']`)){const t=document.createElement("link");t.rel="stylesheet",t.type="text/css",t.href=f,document.head.appendChild(t)}console.log("React sidebar filter container injected successfully"),window.dispatchEvent(new CustomEvent("sidebarFilterContainerReady",{detail:{containerId:"react-sidebar-filter-panel"}}))},c=()=>{typeof mviewer<"u"&&mviewer.customLayers?setTimeout(o,1e3):setTimeout(c,100)};if(document.readyState==="loading"?document.addEventListener("DOMContentLoaded",c):c(),!document.getElementById("react-global-root")){const e=document.createElement("div");e.id="react-global-root",document.body.appendChild(e)}const p="apps/sinp_hdf/addons/reactInjector/dist/main.js";if(!document.querySelector(`script[src='${p}']`)){const e=document.createElement("script");e.src=p,e.type="text/javascript",document.body.appendChild(e)}const m="apps/sinp_hdf/addons/reactInjector/dist/reactComponentManager.js";if(!document.querySelector(`script[src='${m}']`)){const e=document.createElement("script");e.src=m,e.type="text/javascript",document.body.appendChild(e)}}}})();new CustomComponent("reactInjector",y.init);})();
