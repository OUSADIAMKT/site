(globalThis.TURBOPACK||(globalThis.TURBOPACK=[])).push(["object"==typeof document?document.currentScript:void 0,65630,e=>{"use strict";var o=e.i(43476);let a="w-full rounded-lg border border-input bg-ink-void/70 px-4 py-3 text-sm text-foreground outline-none transition-colors placeholder:text-cinza-ink/60 focus:border-amarelo aria-[invalid=true]:border-destructive";function s({htmlFor:e,children:a,required:r}){return(0,o.jsxs)("label",{htmlFor:e,className:"mb-2 block font-mono text-xs uppercase tracking-wider text-cinza-ink",children:[a,r&&(0,o.jsx)("span",{className:"text-amarelo",children:" *"})]})}e.s(["Field",0,function({id:e,label:a,required:r,children:t,full:i}){return(0,o.jsxs)("div",{className:i?"sm:col-span-2":void 0,children:[(0,o.jsx)(s,{htmlFor:e,required:r,children:a}),t]})},"FormError",0,function({show:e}){return(0,o.jsx)("p",{role:"alert",hidden:!e,className:"rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 font-mono text-xs text-destructive",children:"Confere os campos destacados: tem coisa faltando."})},"Input",0,function(e){return(0,o.jsx)("input",{...e,className:a})},"Select",0,function(e){return(0,o.jsx)("select",{...e,className:a})},"Textarea",0,function(e){return(0,o.jsx)("textarea",{...e,className:`${a} min-h-32 resize-y`})}])},73195,e=>{"use strict";var o=e.i(43476),a=e.i(32181),s=e.i(71164),r=e.i(38544),t=e.i(71645);e.s(["Reveal",0,function({children:e,delay:i=0,className:n=""}){return!function(){s.hasReducedMotionListener.current||(0,r.initPrefersReducedMotion)();let[e]=(0,t.useState)(s.prefersReducedMotion.current);return e}()?(0,o.jsx)(a.motion.div,{className:n,initial:{opacity:0,y:24},whileInView:{opacity:1,y:0},viewport:{once:!0,margin:"-80px"},transition:{duration:.6,delay:i,ease:[.22,1,.36,1]},children:e}):(0,o.jsx)("div",{className:n,children:e})}],73195)},17532,e=>{"use strict";let o={CONSCIENTE:{titulo:"Consciente",resumo:"Você conhece suas qualidades e não tem vergonha delas.",oQueDiz:"Você já enxerga com clareza o que tem de bom e também o que quer melhorar, sem se afundar nisso. Essa é uma base rara: autoconhecimento sem autocobrança excessiva.",proximoPasso:"Próximo passo: escreva 3 qualidades suas e uma situação real em que cada uma apareceu. Isso vira munição pra quando a insegurança bater."},AUTOCRITICO:{titulo:"Autocrítico",resumo:"Você se cobra mais do que qualquer outra pessoa te cobraria.",oQueDiz:"Você repara nos seus erros com uma lupa que ninguém mais usa em você. Isso mostra que você se importa, só que com a régua calibrada muito apertada.",proximoPasso:"Próximo passo: da próxima vez que errar, escreva o que diria pra um(a) amigo(a) no seu lugar. Depois, releia como se fosse pra você."},DESCOBERTA:{titulo:"Em descoberta",resumo:"Você ainda está montando o quebra-cabeça de quem você é.",oQueDiz:"Você não tem tudo fechado sobre si mesmo(a), e tudo bem: aos 15, 16, 17 anos ninguém deveria ter. Descobrir é um processo, não um atraso.",proximoPasso:"Próximo passo: pergunte a 3 pessoas próximas o que elas mais admiram em você. As respostas costumam surpreender e revelar padrões."},TRANQUILO:{titulo:"Tranquilo",resumo:"Você não se abala fácil com o que pensam ou dizem de você.",oQueDiz:"Você tem uma leveza natural com quem é, sem precisar analisar cada detalhe. Isso protege sua energia, mas vale checar se não é também uma forma de evitar se olhar mais fundo.",proximoPasso:'Próximo passo: uma vez por semana, reserve 5 minutos pra se perguntar "o que eu realmente senti hoje?". Leveza e atenção podem andar juntas.'}},a={PROTAGONISTA:{titulo:"Protagonista",resumo:"Você sabe o que quer e já está fazendo alguma coisa por isso.",oQueDiz:"Clareza e ação andando juntas: essa é a combinação mais rara do capítulo. Você não está só sonhando, está construindo, mesmo que devagar.",proximoPasso:"Próximo passo: defina uma meta pequena pras próximas 2 semanas, que te aproxime do seu objetivo. Protagonismo se treina em passos curtos."},SONHADOR:{titulo:"Sonhador",resumo:"Você sabe pra onde quer ir. Falta destravar o primeiro passo.",oQueDiz:"Ter um sonho claro já é mais do que muita gente tem. O que trava normalmente não é falta de vontade: é não saber por onde começar, ou o medo de começar errado.",proximoPasso:"Próximo passo: escolha UMA ação de 30 minutos que te aproxime do seu sonho essa semana. Só uma. O resto vem depois."},EXPLORADOR:{titulo:"Explorador",resumo:"Você está testando o terreno, sem pressa de se prender a nada.",oQueDiz:"Você está numa fase de experimentar, e isso não é enrolação. É como muita gente encontra o próprio caminho: tentando, errando, tentando de novo.",proximoPasso:"Próximo passo: liste 3 coisas que você já testou e o que cada uma te ensinou sobre você. Exploração vira direção quando você presta atenção nos padrões."},OCUPADO:{titulo:"Ocupado",resumo:"Você faz muita coisa, mas a questão é se são as coisas certas pra você.",oQueDiz:"Sua agenda está cheia e você aproveita o que aparece. Isso mostra disposição, mas também pode ser um jeito de não parar pra escolher.",proximoPasso:"Próximo passo: nas próximas 2 semanas, escreva num papel tudo que você faz. No fim, marque o que te aproxima do que você quer e o que só ocupa espaço."}},s={AUTONOMO:{titulo:"Autônomo",resumo:"Sua régua de sucesso é sua, não emprestada.",oQueDiz:"Você já sabe separar o que é sua voz do que é voz dos outros, e ainda assim consegue ouvir com respeito quem discorda. Isso é maturidade emocional de verdade.",proximoPasso:'Próximo passo: da próxima vez que comparar sua vida com a de alguém, pergunte: "isso é o que EU quero, ou o que parece que eu deveria querer?"'},ALINHADO:{titulo:"Alinhado",resumo:"O que sua família espera e o que você quer apontam pro mesmo lugar, por enquanto.",oQueDiz:"Você tem sorte de não sentir esse conflito hoje. Vale só ficar de olho: com o tempo seus planos podem mudar, e tudo bem se um dia eles não baterem mais 100%.",proximoPasso:"Próximo passo: converse com sua família sobre o que você quer, não só sobre o que eles esperam. Alinhamento fica mais forte quando é conversado, não presumido."},CONFLITO:{titulo:"Em conflito",resumo:"Você segue seu caminho, mas isso custa caro por dentro.",oQueDiz:"Você já tem clareza sobre o que quer. O problema é o preço emocional de defender isso: briga, culpa, a sensação de precisar provar algo o tempo todo.",proximoPasso:"Próximo passo: escolha uma conversa difícil que você vem adiando e planeje ela com calma, sem esperar o momento de explosão. Clareza sem guerra é possível."},PRESSIONADO:{titulo:"Pressionado",resumo:"A régua que você usa pra se avaliar é, principalmente, dos outros.",oQueDiz:"Você mede seu valor pelo que esperam de você, e isso pesa. Não é fraqueza: é um sinal de que ainda não teve espaço pra descobrir o que VOCÊ espera de você mesmo(a).",proximoPasso:'Próximo passo: escreva uma frase que comece com "eu vou me sentir bem-sucedido(a) quando eu...", sem pensar em ninguém além de você ao escrever.'}};function r(e){for(let r of[o,a,s])if(r[e])return r[e].titulo;return e}e.s(["CAP1_MATRIZ",0,{eixoX:{esquerda:"Baixa clareza",direita:"Alta clareza"},eixoY:{baixo:"Baixa aceitação",alto:"Alta aceitação"},pos:{CONSCIENTE:{x:1,y:1},AUTOCRITICO:{x:1,y:0},TRANQUILO:{x:0,y:1},DESCOBERTA:{x:0,y:0}}},"CAP1_TEXTO",0,o,"CAP2_MATRIZ",0,{eixoX:{esquerda:"Baixa clareza",direita:"Alta clareza"},eixoY:{baixo:"Baixa ação",alto:"Alta ação"},pos:{PROTAGONISTA:{x:1,y:1},SONHADOR:{x:1,y:0},OCUPADO:{x:0,y:1},EXPLORADOR:{x:0,y:0}}},"CAP2_TEXTO",0,a,"CAP3_MATRIZ",0,{eixoX:{esquerda:"Referência interna",direita:"Referência externa"},eixoY:{baixo:"Baixa pressão sentida",alto:"Alta pressão sentida"},pos:{AUTONOMO:{x:0,y:0},CONFLITO:{x:0,y:1},ALINHADO:{x:1,y:0},PRESSIONADO:{x:1,y:1}}},"CAP3_TEXTO",0,s,"DIMENSAO_LABEL",0,{EI:"Energia",SN:"Percepção",TF:"Decisão",JP:"Organização"},"LETRA_LABEL",0,{E:"Extrovertido(a)",I:"Introvertido(a)",S:"Sensorial",N:"Intuitivo(a)",T:"Racional",F:"Sensível",J:"Planejador(a)",P:"Flexível"},"MBTI_APELIDO",0,{ISTJ:"O Organizador",ISFJ:"O Guardião",INFJ:"O Idealista",INTJ:"O Estrategista",ISTP:"O Artesão",ISFP:"O Sensível",INFP:"O Mediador",INTP:"O Pensador",ESTP:"O Dinâmico",ESFP:"O Espontâneo",ENFP:"O Inspirador",ENTP:"O Inovador",ESTJ:"O Executivo",ESFJ:"O Cuidador",ENFJ:"O Mobilizador",ENTJ:"O Comandante"},"rotuloTransicao",0,function(e,o){return`Em transi\xe7\xe3o entre ${r(e)} e ${r(o)}`}])},11241,8590,e=>{"use strict";let o=(0,e.i(56420).default)("arrow-left",[["path",{d:"m12 19-7-7 7-7",key:"1l729n"}],["path",{d:"M19 12H5",key:"x3x0zl"}]]);e.s(["ArrowLeft",0,o],11241);var a=e.i(43476);let s={iso:{w:40,h:32,body:`
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
    `.replace(/\s*\n\s*/g,"")}},r={quadrado:{w:16,h:16,body:`
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M1.5 1.5h13v13h-13Z'/>
      </g>
      <g fill='#fff'><path d='M6 6h4v4H6Z'/></g>
    `.replace(/\s*\n\s*/g,"")},losango:{w:16,h:16,body:`
      <g fill='none' stroke='#fff' stroke-width='2'>
        <path d='M8 1L15 8L8 15L1 8Z'/>
      </g>
      <g fill='#fff'><circle cx='8' cy='8' r='1.8'/></g>
    `.replace(/\s*\n\s*/g,"")},triangulo:{w:16,h:14,body:"<g fill='#fff'><path d='M1 13L8 1L15 13Z'/></g>".replace(/\s*\n\s*/g,"")}};function t(e){let o=`<svg xmlns='http://www.w3.org/2000/svg' width='${e.w}' height='${e.h}' viewBox='0 0 ${e.w} ${e.h}'>${e.body}</svg>`;return`url("data:image/svg+xml,${encodeURIComponent(o)}")`}e.s(["KeneBullet",0,function({mark:e="quadrado",size:o=10,className:s="",style:i}){let n,u;return(0,a.jsx)("span",{"aria-hidden":!0,className:`kene kene-one shrink-0 ${s}`,style:{height:o,width:o*((n=r[e]).w/n.h),...{maskImage:u=t(r[e]),WebkitMaskImage:u},...i}})},"KeneStrip",0,function({motif:e="iso",height:o=22,className:r="",style:i}){let n;return(0,a.jsx)("div",{"aria-hidden":!0,className:`kene kene-x ${r}`,style:{height:o,...{maskImage:n=t(s[e]),WebkitMaskImage:n},...i}})}],8590)},6537,e=>{"use strict";let o=(0,e.i(56420).default)("lock",[["rect",{width:"18",height:"11",x:"3",y:"11",rx:"2",ry:"2",key:"1w4ew1"}],["path",{d:"M7 11V7a5 5 0 0 1 10 0v4",key:"fwvmzm"}]]);e.s(["Lock",0,o],6537)}]);