const f={ASSETS_PREFIX:void 0,BASE_URL:"/thilo/",DEV:!1,MODE:"production",PROD:!0,SITE:"https://bodobraegger.github.io/thilo",SSR:!1};function a(c){return c.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;")}function u(c,t,e){if(!t.trim())return a(c);const s=a(c),o=a(t).replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),i=e?` style="background-color:${e}"`:"",l=e?"px-1 rounded":"bg-yellow-200 px-0.5 rounded";return s.replace(new RegExp(`(${o})`,"gi"),`<mark class="${l}"${i}>$1</mark>`)}function d(c,t,e,s){if(!c&&!t)return 0;const n=c?.toLowerCase()||"",o=t?.toLowerCase()||"",i=e.toLowerCase().trim(),l=s?o:n;if(!l.includes(i))return 0;const h=i.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");let r=0;l===i&&(r+=1e3),o===i&&(r+=800),o.includes(i)&&(r+=500),new RegExp(`\\b${h}\\b`).test(o)&&(r+=400),o.startsWith(i)&&(r+=300),new RegExp(`\\b${h}\\b`).test(n)&&(r+=200),n.startsWith(i)&&(r+=150),o.includes(i)&&r<300&&(r+=100),n.includes(i)&&r<100&&(r+=50);const p=l.indexOf(i);return p!==-1&&(r+=Math.max(0,50-p)),r-=Math.min(50,l.length/100),r}function g(c,t,e){const s=document.querySelector('meta[name="base-url"]')?.getAttribute("content")??"",n=c==="de"?"":`/${c}`;return`${s}${n}/${t}${e?"#"+e:""}`}function w(c){return c?c.replace(/!\[.*?\]\(.*?\)/g,"").replace(/\[([^\]]+)\]\([^)]+\)/g,"$1").replace(/#{1,6}\s+/g,"").replace(/\*\*(.*?)\*\*/g,"$1").replace(/\*(.*?)\*/g,"$1").replace(/`(.*?)`/g,"$1").replace(/```[\s\S]*?```/g,"").replace(/>\s+/g,"").replace(/^\s*[-*+]\s+/gm,"").replace(/^\s*\d+\.\s+/gm,"").replace(/<[^>]*>/g,"").replace(/\n{2,}/g,`
`).trim():""}function m(c,t,e=200){const s=w(c),o=s.toLowerCase().indexOf(t.toLowerCase());if(o===-1)return s.length>e?s.slice(0,e)+"...":s;const i=Math.floor((e-t.length)/2);let l=Math.max(0,o-i),h=Math.min(s.length,o+t.length+i);if(l>0){const r=s.lastIndexOf(" ",l);r>0&&l-r<20&&(l=r+1)}if(h<s.length){const r=s.indexOf(" ",h);r>0&&r-h<20&&(h=r)}return(l>0?"…":"")+s.slice(l,h)+(h<s.length?"…":"")}class y extends HTMLElement{query="";sections=[];results=[];selectedIndex=-1;showDropdown=!1;locale="de";inline=!1;hideInput=!1;noDropdown=!1;i18n={};input=null;dropdown=null;resultsContainer=null;MIN=2;connectedCallback(){this.locale=this.dataset.locale??"de",this.inline=this.dataset.inline==="true",this.hideInput=this.dataset.hideInput==="true",this.noDropdown=this.dataset.noDropdown==="true",this.i18n=JSON.parse(this.dataset.i18n??"{}"),this.sections=JSON.parse(this.dataset.sections??"[]"),this.query=this.dataset.initialQuery??"",this.input=this.querySelector("[data-search-input]"),this.dropdown=this.querySelector("[data-search-dropdown]"),this.resultsContainer=this.querySelector("[data-search-results]"),this.input&&(this.input.addEventListener("input",this.#r.bind(this)),this.input.addEventListener("keydown",this.#c.bind(this)),this.input.addEventListener("focus",this.#o.bind(this)),this.input.addEventListener("blur",this.#l.bind(this))),this.hideInput&&window.addEventListener("thilo:search",this.#n.bind(this)),this.sections.length===0?this.#a():(this.#s(),this.#t())}#n(t){this.query=t.detail.query,this.#s(),this.#t()}#r(t){this.query=t.target.value,this.selectedIndex=-1,this.showDropdown=this.query.trim().length>=1,this.#s(),this.noDropdown||this.#e(),this.inline||this.#t(),this.noDropdown&&window.dispatchEvent(new CustomEvent("thilo:search",{detail:{query:this.query}}))}#o(){this.query.trim().length>=1&&(this.showDropdown=!0,this.#e())}#l(t){this.dropdown?.contains(t.relatedTarget)||setTimeout(()=>{this.showDropdown=!1,this.selectedIndex=-1,this.#e()},200)}#c(t){const e=this.inline?Math.min(this.results.length-1,2):this.results.length-1;if(!this.showDropdown||this.results.length===0){t.key==="Enter"&&this.#i();return}switch(t.key){case"ArrowDown":t.preventDefault(),this.selectedIndex=this.selectedIndex<e?this.selectedIndex+1:this.selectedIndex,this.#e();break;case"ArrowUp":t.preventDefault(),this.selectedIndex=this.selectedIndex>0?this.selectedIndex-1:-1,this.#e();break;case"Enter":t.preventDefault(),this.selectedIndex>=0&&this.selectedIndex<this.results.length?window.location.href=this.results[this.selectedIndex].url:this.#i();break;case"Escape":this.showDropdown=!1,this.selectedIndex=-1,this.#e(),this.input?.blur();break}}#i(){const t=document.querySelector('meta[name="base-url"]')?.getAttribute("content")??"",e=this.locale==="de"?`${t}/search?q=${encodeURIComponent(this.query)}`:`${t}/${this.locale}/search?q=${encodeURIComponent(this.query)}`;window.location.pathname.endsWith("/search")||window.location.pathname.endsWith("/search/")?(history.pushState({},"",e),window.dispatchEvent(new CustomEvent("thilo:search",{detail:{query:this.query}}))):window.location.href=e}async#a(){this.#t();try{const t=f?.BACKEND_URL||"https://api.thilo.scouts.ch/",e=await fetch(`${t}sections?_locale=${this.locale}`);if(!e.ok)throw new Error(`HTTP ${e.status}`);const s=await e.json();this.sections=s.data||s}catch(t){console.error("[search-widget] Failed to fetch sections:",t)}this.#s(),this.#t()}#s(){if(this.query.trim().length<this.MIN||this.sections.length===0){this.results=[];return}const t=[];for(const e of this.sections){const s=d(e.content??"",e.title??"",this.query,!0),n=d(e.content??"",e.title??"",this.query,!1),o=Math.max(s,n);o>0&&t.push({type:"section",title:e.title,content:e.content,url:g(this.locale,e.slug??""),section:e,relevance:o});for(const i of e.chapters??[]){const l=d(i.content??"",i.title??"",this.query,!0),h=d(i.content??"",i.title??"",this.query,!1),r=Math.max(l,h);r>0&&t.push({type:"chapter",title:i.title,content:i.content,url:g(this.locale,e.slug??"",i.slug),section:e,chapter:i,relevance:r})}}t.sort((e,s)=>s.relevance-e.relevance),this.results=t}#e(){if(!this.dropdown||this.noDropdown)return;if(!this.showDropdown||!this.query.trim()){this.dropdown.classList.add("hidden");return}this.dropdown.classList.remove("hidden");const t=3;let e="";if(this.query.trim().length<this.MIN)e=`<div class="px-4 py-3 text-gray-400 text-sm flex items-center gap-2">
          <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 110 20A10 10 0 0112 2z"/>
          </svg>
          ${a(this.i18n.keepTyping??"")}
        </div>`;else if(this.results.length===0)e=`<div class="px-4 py-3 text-gray-500 text-sm">${a(this.i18n.noResults??"")}</div>`;else{if(e="<ul>",this.results.slice(0,t).forEach((s,n)=>{const o=s.section.color_primary??"#521d3a",i=n===this.selectedIndex,l=i?`background-color:color-mix(in srgb, ${o} 10%, white)`:"";e+=`
            <li>
              <button
                class="w-full text-left px-4 py-3 hover:bg-gray-50 border-b border-gray-100 transition-colors${i?" bg-gray-100":""}"
                style="${l}"
                data-result-url="${a(s.url)}"
                tabindex="0"
              >
                <div class="flex items-start gap-3">
                  <div class="flex-1 min-w-0">
                    <div class="font-medium text-sm truncate" style="color:${o}">
                      ${u(s.title,this.query,`color-mix(in srgb, ${o} 30%, white)`)}
                    </div>
                    <div class="flex items-center gap-2 mt-1">
                      <span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium"
                        style="background-color:color-mix(in srgb, ${o} 15%, white);color:${o}">
                        ${a(s.type==="section"?this.i18n.section??"":this.i18n.chapter??"")}
                      </span>
                      <span class="text-xs text-gray-500 truncate">${a(s.section.title)}</span>
                    </div>
                  </div>
                </div>
              </button>
            </li>`}),this.results.length>t){const s=this.results.length-t,n=(this.i18n.moreResults??"").replace("{count}",String(s));e+=`
            <li>
              <button class="w-full px-4 py-2 text-xs text-gray-500 bg-gray-50 hover:bg-gray-100 text-center transition-colors" data-more-results>
                ${a(n)}
                <span class="hidden sm:inline"> ${a(this.i18n.moreResultsHint??"")}</span>
              </button>
            </li>`}e+="</ul>"}this.dropdown.innerHTML=e,this.dropdown.querySelectorAll("[data-result-url]").forEach((s,n)=>{s.addEventListener("click",()=>{window.location.href=s.dataset.resultUrl}),s.addEventListener("mouseenter",()=>{this.selectedIndex=n})}),this.dropdown.querySelector("[data-more-results]")?.addEventListener("click",()=>this.#i())}#t(){if(!this.resultsContainer)return;let t="";if(this.sections.length===0)t=`
          <div class="text-center py-12 text-gray-500">
            <div class="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mb-4"></div>
            <p>${a(this.i18n.loading??"")}</p>
          </div>`;else if(this.query.trim().length<this.MIN)t=`<div class="text-center py-12 text-gray-500"><p>${a(this.i18n.enterQuery??"")}</p></div>`;else if(this.results.length===0)t=`<div class="text-center py-8"><p>${a((this.i18n.noResultsFor??"").replace("{query}",this.query))}</p></div>`;else{t='<div class="space-y-4">';for(const e of this.results){const s=m(e.content??"",this.query),n=e.section.color_primary??"#521d3a";t+=`
            <div class="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
              style="--section-color:${n};border-color:${n};scroll-margin-top:80px">
              <h3 class="text-lg font-semibold mb-2">
                <a href="${a(e.url)}" class="hover:underline" style="color:${n}">
                  ${u(e.title,this.query,`color-mix(in srgb, ${n} 20%, white)`)}
                </a>
              </h3>
              <p class="text-gray-700 leading-relaxed mb-3">
                ${u(s,this.query,`color-mix(in srgb, ${n} 20%, white)`)}
              </p>
              <div class="flex items-center gap-3 text-sm">
                <span class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                  style="background-color:color-mix(in srgb, ${n} 20%, white);color:${n}">
                  ${a(e.type==="section"?this.i18n.section??"":this.i18n.chapter??"")}
                </span>
                <span style="color:${n}">${a(e.section.title)}</span>
              </div>
            </div>`}t+="</div>"}this.resultsContainer.innerHTML=t}}customElements.define("search-widget",y);
