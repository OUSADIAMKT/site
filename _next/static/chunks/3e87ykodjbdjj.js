(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,65630,e=>{"use strict";var t=e.i(43476);let a="w-full rounded-lg border border-input bg-ink-void/70 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-cinza-ink/60 focus:border-amarelo aria-[invalid=true]:border-destructive";function r({htmlFor:e,children:a,required:s}){return(0,t.jsxs)("label",{htmlFor:e,className:"mb-2 block font-mono text-xs uppercase tracking-wider text-cinza-ink",children:[a,s&&(0,t.jsx)("span",{className:"text-amarelo",children:" *"})]})}e.s(["Field",0,function({id:e,label:a,required:s,children:l,full:i}){return(0,t.jsxs)("div",{className:i?"sm:col-span-2":void 0,children:[(0,t.jsx)(r,{htmlFor:e,required:s,children:a}),l]})},"FormError",0,function({show:e}){return(0,t.jsx)("p",{role:"alert",hidden:!e,className:"rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 font-mono text-xs text-destructive",children:"Confere os campos destacados: tem coisa faltando."})},"Input",0,function(e){return(0,t.jsx)("input",{...e,className:a})},"Select",0,function(e){return(0,t.jsx)("select",{...e,className:a})},"Textarea",0,function(e){return(0,t.jsx)("textarea",{...e,className:`${a} min-h-32 resize-y`})}])},73195,e=>{"use strict";var t=e.i(43476),a=e.i(32181),r=e.i(71164),s=e.i(38544),l=e.i(71645);e.s(["Reveal",0,function({children:e,delay:i=0,className:o=""}){return!function(){r.hasReducedMotionListener.current||(0,s.initPrefersReducedMotion)();let[e]=(0,l.useState)(r.prefersReducedMotion.current);return e}()?(0,t.jsx)(a.motion.div,{className:o,initial:{opacity:0,y:24},whileInView:{opacity:1,y:0},viewport:{once:!0,margin:"-80px"},transition:{duration:.6,delay:i,ease:[.22,1,.36,1]},children:e}):(0,t.jsx)("div",{className:o,children:e})}],73195)},67854,e=>{"use strict";var t=e.i(43476),a=e.i(71645),r=e.i(57688);let s=(0,e.i(56420).default)("play",[["path",{d:"M5 5a2 2 0 0 1 3.008-1.728l11.997 6.998a2 2 0 0 1 .003 3.458l-12 7A2 2 0 0 1 5 19z",key:"10ikf1"}]]);e.s(["YouTubeLite",0,function({id:e,titulo:l,poster:i,formato:o="horizontal",className:n=""}){let[c,d]=(0,a.useState)(!1),h="vertical"===o?"aspect-[9/16]":"aspect-video";return c?(0,t.jsx)("iframe",{className:`${h} w-full ${n}`,src:`https://www.youtube-nocookie.com/embed/${e}?autoplay=1&rel=0&modestbranding=1`,title:l,allow:"accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture",allowFullScreen:!0}):(0,t.jsxs)("button",{type:"button",onClick:()=>d(!0),className:`group relative block ${h} w-full overflow-hidden bg-ink-void ${n}`,children:[(0,t.jsx)(r.default,{src:i??`https://i.ytimg.com/vi/${e}/hqdefault.jpg`,alt:"",width:800,height:450,className:`h-full w-full object-cover transition-transform duration-500 ${"vertical"===o?"group-hover:scale-105":"scale-[1.35] group-hover:scale-[1.42]"}`,"aria-hidden":!0}),(0,t.jsx)("span",{className:"absolute inset-0 bg-ink-void/30 transition-colors group-hover:bg-ink-void/10"}),(0,t.jsx)("span",{className:"absolute inset-0 grid place-items-center",children:(0,t.jsx)("span",{className:"grid h-16 w-16 place-items-center rounded-full bg-amarelo text-[#1a0b2e] shadow-lg transition-transform group-hover:scale-110",children:(0,t.jsx)(s,{size:26,fill:"currentColor",className:"ml-1"})})}),(0,t.jsxs)("span",{className:"sr-only",children:["Assistir: ",l]})]})}],67854)},11241,8590,e=>{"use strict";let t=(0,e.i(56420).default)("arrow-left",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);e.s(["ArrowLeft",0,t],11241);var a=e.i(43476);let r={iso:{w:40,h:32,body:`
      <g fill='none' stroke='#fff' stroke-width='2.4'>
        <path d='M0 2.2h40M0 29.8h40'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2.2'>
        <path d='M3 27.6L20 7L37 27.6'/>
        <path d='M10 27.6L20 15L30 27.6'/>
        <path d='M-9 4.4L0 21L9 4.4'/>
        <path d='M31 4.4L40 21L49 4.4'/>
      </g>
    `.replace(/\s*\n\s*/g,"")},ronoa:{w:48,h:32,body:`
      <g fill='none' stroke='#fff' stroke-width='2.4'>
        <path d='M0 2.2h48M0 29.8h48'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2.2'>
        <path d='M24 6.5L34 16L24 25.5L14 16Z'/>
        <path d='M-5 6.5L5 25.5M-5 25.5L5 6.5'/>
        <path d='M43 6.5L53 25.5M43 25.5L53 6.5'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M24 12L28 16L24 20L20 16Z'/>
      </g>
      <g fill='#fff'>
        <circle cx='24' cy='16' r='1.5'/>
        <path d='M6.5 4.4h6L9.5 9.8Z'/>
        <path d='M6.5 27.6h6L9.5 22.2Z'/>
        <path d='M35.5 4.4h6L38.5 9.8Z'/>
        <path d='M35.5 27.6h6L38.5 22.2Z'/>
      </g>
    `.replace(/\s*\n\s*/g,"")},shahuu:{w:30,h:30,body:`
      <g fill='none' stroke='#fff' stroke-width='2.4'>
        <path d='M0 2.2h30M0 27.8h30M1.2 2.2v25.6'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2.2'>
        <path d='M7 8h16v14H7Z'/>
      </g>
      <g fill='#fff'>
        <path d='M13 13.5h4v3h-4Z'/>
      </g>
    `.replace(/\s*\n\s*/g,"")},pushu:{w:32,h:24,body:`
      <g fill='none' stroke='#fff' stroke-width='2.4'>
        <path d='M0 2.2h32M0 21.8h32'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2.2'>
        <path d='M0 19.6L8 5.5L16 19.6L24 5.5L32 19.6'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M3.6 19.6L8 11.8L12.4 19.6M19.6 5.5L24 13.3L28.4 5.5'/>
      </g>
    `.replace(/\s*\n\s*/g,"")},faba:{w:24,h:18,body:`
      <g fill='#fff'>
        <path d='M3 11.2L12 1.2L21 11.2Z'/>
        <circle cx='0' cy='16.4' r='1.3'/>
        <circle cx='24' cy='16.4' r='1.3'/>
      </g>
      <g fill='none' stroke='#fff' stroke-width='1.8'>
        <path d='M0 13.6h24'/>
      </g>
    `.replace(/\s*\n\s*/g,"")},yapa:{w:24,h:24,body:`
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M12 0L24 12L12 24L0 12Z'/>
      </g>
    `.replace(/\s*\n\s*/g,"")}},s={quadrado:{w:16,h:16,body:`
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M1.5 1.5h13v13h-13Z'/>
      </g>
      <g fill='#fff'><path d='M6 6h4v4H6Z'/></g>
    `.replace(/\s*\n\s*/g,"")},losango:{w:16,h:16,body:`
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M8 1L15 8L8 15L1 8Z'/>
      </g>
      <g fill='#fff'><circle cx='8' cy='8' r='1.8'/></g>
    `.replace(/\s*\n\s*/g,"")},triangulo:{w:16,h:14,body:"<g fill='#fff'><path d='M1 13L8 1L15 13Z'/></g>".replace(/\s*\n\s*/g,"")}};function l(e){let t=`<svg xmlns='http://www.w3.org/2000/svg' width='${e.w}' height='${e.h}' viewBox='0 0 ${e.w} ${e.h}'>${e.body}</svg>`;return`url("data:image/svg+xml,${encodeURIComponent(t)}")`}e.s(["KeneBullet",0,function({mark:e="quadrado",size:t=10,className:r="",style:i}){let o,n;return(0,a.jsx)("span",{"aria-hidden":!0,className:`kene kene-one shrink-0 ${r}`,style:{height:t,width:t*((o=s[e]).w/o.h),...{maskImage:n=l(s[e]),WebkitMaskImage:n},...i}})},"KeneStrip",0,function({motif:e="iso",height:t=22,className:s="",style:i}){let o;return(0,a.jsx)("div",{"aria-hidden":!0,className:`kene kene-x ${s}`,style:{height:t,...{maskImage:o=l(r[e]),WebkitMaskImage:o},...i}})}],8590)},56423,16600,e=>{"use strict";var t=e.i(56420);let a=(0,t.default)("book-open",[["path",{d:"M12 5v16",key:"1f6ucr"}],["path",{d:"M20.001 19A2 2 0 0022 17V5a2 2 0 00-1.999-2L16 3.002A5 5 0 0012 5a5 5 0 00-4-2H4a2 2 0 00-2 2v12a2 2 0 001.999 2H8a5 5 0 014 2 5 5 0 014-2z",key:"1fyvmf"}]]);e.s(["BookOpen",0,a],56423);let r=(0,t.default)("clapperboard",[["path",{d:"m12.296 3.464 3.02 3.956",key:"qash78"}],["path",{d:"M20.2 6 3 11l-.9-2.4c-.3-1.1.3-2.2 1.3-2.5l13.5-4c1.1-.3 2.2.3 2.5 1.3z",key:"1h7j8b"}],["path",{d:"M3 11h18v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z",key:"4lm6w1"}],["path",{d:"m6.18 5.276 3.1 3.899",key:"zjj9t3"}]]);e.s(["Clapperboard",0,r],16600)},89664,15227,e=>{"use strict";var t=e.i(56420);let a=(0,t.default)("check",[["path",{d:"M20 6 9 17l-5-5",key:"1gmf2c"}]]);e.s(["Check",0,a],89664);let r=(0,t.default)("message-circle",[["path",{d:"M2.992 16.342a2 2 0 0 1 .094 1.167l-1.065 3.29a1 1 0 0 0 1.236 1.168l3.413-.998a2 2 0 0 1 1.099.092 10 10 0 1 0-4.777-4.719",key:"1sd12s"}]]);e.s(["MessageCircle",0,r],15227)},41987,e=>{"use strict";let t=(0,e.i(56420).default)("share-2",[["circle",{cx:"18",cy:"5",r:"3",key:"gq8acd"}],["circle",{cx:"6",cy:"12",r:"3",key:"w7nqdw"}],["circle",{cx:"18",cy:"19",r:"3",key:"1xt0gg"}],["line",{x1:"8.59",x2:"15.42",y1:"13.51",y2:"17.49",key:"47mynk"}],["line",{x1:"15.41",x2:"8.59",y1:"6.51",y2:"10.49",key:"1n3mei"}]]);e.s(["Share2",0,t],41987)}]);