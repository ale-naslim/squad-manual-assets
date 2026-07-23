(function(){
"use strict";

/* ====== BACKEND ====== */
var ENDPOINT='https://script.google.com/macros/s/AKfycbwJXDFuBCJT5l1nF62c_vTQCfLC8YHYOpsTEl3eNTmPUuiW0vIq4znCehM-CSrZfs9i/exec';
/* NONCE anti-bot. NAO e segredo: esta pagina e publica e qualquer pessoa le isto
   no codigo-fonte. Ele so encarece o trabalho de bot; a protecao real esta no
   servidor (honeypot, tempo de preenchimento, validacao, dedupe, vazao). */
var NONCE='mnl_pp_cda72178f1164c5a80ec';
var CONSENT_VERSAO='2026-07-20.v1';
var T0=Date.now(); // marca de tempo pra medir preenchimento humano

/* URL do documento de termos e condicoes da parceria (enviado pela Janaina no
   Slack em 22/07). Enquanto estava vazia, o aceite aparecia SEM link e com um
   aviso - nao se pede aceite de um documento que a pessoa nao pode ler.
   ATENCAO: o arquivo no Drive precisa estar compartilhado como "qualquer pessoa
   com o link pode VER", senao o candidato bate num pedido de acesso. */
var TERMOS_URL='https://drive.google.com/file/d/1ugd0mhGshXy8CCcAHkJ8zSULIJ-JcwMv/view';

/* ====== SCHEMA - espelha o Google Forms
   "AFILIADOS | FORMS PARA LP PROSPECÇÃO SQUAD MANUAL" (7 seções; a 1ª é vazia).
   Mesma ordem de campos do forms. Diferenças deliberadas, todas comentadas:
   - Seção PJ é condicional (no forms, quem não tem CNPJ trava em campo obrigatório);
   - "complemento" é opcional (nem todo endereço tem);
   - "rede para a parceria" é escolha única (a pergunta é no singular);
   - "tratamento capilar" é opcional, com consentimento específico (dado de saúde). */
var SCHEMA=[
 {id:'s1', eyebrow:'Bloco 01', title:'Dados do criador de conteúdo', sub:'Usamos estes dados nos nossos registros internos. Confira antes de seguir.', qs:[
   {id:'nome', t:'text', req:1, q:'Nome completo', ph:'Seu nome'},
   {id:'cpf', t:'cpf', req:1, q:'CPF', qh:'Somente números.', ph:'000.000.000-00'},
   {id:'nascimento', t:'date', req:1, q:'Data de nascimento', qh:'Só entram no programa criadores maiores de 18 anos.'},
   {id:'estado_civil', t:'radio', req:1, q:'Estado civil', o:['Solteiro(a)','Casado(a)','Divorciado(a)','Viúvo(a)','União estável']},
   {id:'email', t:'email', req:1, q:'E-mail', qh:'Este e-mail será usado para o aceite dos termos, então use um que você acesse com facilidade.', ph:'voce@email.com'},
   {id:'whatsapp', t:'tel', req:1, q:'WhatsApp', qh:'Usamos para criar o grupo de gestão da parceria.', ph:'(00) 00000-0000'}
 ]},
 {id:'s2', eyebrow:'Bloco 02', title:'Redes sociais', sub:'Queremos seus canais mapeados pra acompanhar o seu conteúdo de perto.', qs:[
   {id:'redes', t:'check', req:1, q:'Quais redes sociais você utiliza ativamente?', o:['Instagram','TikTok','YouTube','Twitch','Outras']},
   {id:'rede_parceria', t:'radio', req:1, q:'Qual rede social você gostaria de usar na parceria com a MANUAL?', o:['Instagram','TikTok','YouTube','Twitch','Outra']},
   {id:'insta', t:'text', req:0, q:'Instagram', ph:'link do perfil (se ativo)'},
   {id:'tiktok', t:'text', req:0, q:'TikTok', ph:'link do perfil (se ativo)'},
   {id:'youtube', t:'text', req:0, q:'YouTube', ph:'link do canal (se ativo)'},
   {id:'twitch', t:'text', req:0, q:'Twitch', ph:'link do canal (se ativo)'},
   {id:'outras_redes', t:'text', req:0, q:'Outras redes', ph:'links das suas outras redes'},
   {id:'seguidores', t:'seguidores', req:0, q:'Conte pra gente o seu número de seguidores', qh:'Um campo para cada rede que você marcou acima. Pode ser aproximado.', ph:'Ex: 25 mil'},
   {id:'cupom', t:'cupom', req:1, q:'Sugestão de nome para o seu cupom', qh:'Pelo menos 3 opções, em ordem de preferência. Vale algo curto e simples, fácil da sua audiência usar (NOME10, SEUNOME, CANALMANUAL). Vamos verificar a disponibilidade de cada uma.', ph:'Ex: SEUNOME10'}
 ]},
 {id:'s3', eyebrow:'Bloco 03', title:'Endereço para logística', sub:'Pra que produtos, brindes e correspondências cheguem até você sem imprevisto.', qs:[
   /* CEP vem primeiro (no forms está por último) porque ele preenche os demais
      campos automaticamente. Buscar o CEP depois de digitar tudo não serviria. */
   {id:'cep', t:'cep', req:1, q:'CEP', qh:'Digite o CEP que a gente completa o endereço pra você.', ph:'00000-000'},
   {id:'logradouro', t:'text', req:1, q:'Logradouro (rua/avenida)', ph:'Ex: Av. dos Sonhos'},
   {id:'numero', t:'text', req:1, q:'Número', ph:'Ex: 228'},
   {id:'complemento', t:'text', req:0, q:'Complemento', qh:'Se houver.', ph:'Ex: Apartamento 22'},
   {id:'bairro', t:'text', req:1, q:'Bairro', ph:'Ex: Sumaré'},
   {id:'cidade', t:'text', req:1, q:'Cidade', ph:'Ex: São Paulo'},
   {id:'uf', t:'text', req:1, q:'Estado (UF)', ph:'Ex: SP'},
   {id:'tratamento', t:'radio', req:0, saude:1, q:'Você faz algum tratamento para queda capilar?', qh:'Opcional e não influencia na seleção. Não precisa ser calvo nem estar em tratamento pra entrar no Squad. Por ser informação de saúde, só guardamos se você autorizar no fim do formulário.', o:['Sim, com a MANUAL','Sim, com outra empresa','Não','Prefiro não informar']}
 ]},
 {id:'s4', eyebrow:'Bloco 04', title:'Faturamento e pagamento', sub:'O pagamento de comissões e bônus é feito mediante nota fiscal (PJ), emitida pelo mesmo CNPJ informado aqui. Não pagamos pessoa física nem terceiros. Dados bancários não são pedidos neste formulário — eles são combinados depois da aprovação.', qs:[
   {id:'tem_cnpj', t:'radio', req:1, q:'Você possui CNPJ?', qh:'Necessário pra receber as comissões.', o:['Sim, possuo','Não','Não, mas vou abrir']}
 ]},
 /* Condicional: só aparece pra quem já tem CNPJ. No Google Forms esta seção é
    obrigatória pra todo mundo, então quem responde "Não" fica sem conseguir enviar. */
 {id:'s5', eyebrow:'Bloco 05', title:'Dados da empresa', sub:'Dados do CNPJ que vai emitir a nota fiscal.', cond:{campo:'tem_cnpj', valores:['Sim, possuo']}, qs:[
   {id:'razao_social', t:'text', req:1, q:'Razão social', qh:'Conforme consta no cartão CNPJ.', ph:'Nome empresarial'},
   {id:'cnpj', t:'cnpj', req:1, q:'CNPJ', qh:'Somente números.', ph:'00.000.000/0000-00'}
 ]},
 {id:'s6', eyebrow:'Bloco 06', title:'Termos da parceria', sub:'Antes de finalizar, leia os termos e condições da parceria. Eles detalham regras de conduta, prazos de pagamento, propriedade intelectual e diretrizes da marca MANUAL.', final:1, qs:[]}
];

/* ====== STATE ====== */
var answers={}; var step=0;
var host=document.getElementById('panelHost');

/* ====== HELPERS ====== */
function el(tag,cls,html){var e=document.createElement(tag);if(cls)e.className=cls;if(html!=null)e.innerHTML=html;return e;}
function validEmail(v){return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);}
function maiorDeIdade(v){var d=new Date(v);if(isNaN(d.getTime()))return false;var lim=new Date();lim.setFullYear(lim.getFullYear()-18);return d.getTime()<=lim.getTime();}
function validCPF(c){c=(c||'').replace(/\D/g,'');if(c.length!==11||/^(\d)\1{10}$/.test(c))return false;var s=0,i,r;for(i=0;i<9;i++)s+=+c[i]*(10-i);r=(s*10)%11;if(r>=10)r=0;if(r!==+c[9])return false;s=0;for(i=0;i<10;i++)s+=+c[i]*(11-i);r=(s*10)%11;if(r>=10)r=0;return r===+c[10];}
function maskCPF(v){v=v.replace(/\D/g,'').slice(0,11);return v.replace(/(\d{3})(\d)/,'$1.$2').replace(/(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4');}
function maskCNPJ(v){v=v.replace(/\D/g,'').slice(0,14);return v.replace(/^(\d{2})(\d)/,'$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/,'$1.$2.$3').replace(/\.(\d{3})(\d)/,'.$1/$2').replace(/(\d{4})(\d)/,'$1-$2');}
function maskCEP(v){v=v.replace(/\D/g,'').slice(0,8);return v.length>5?v.replace(/(\d{5})(\d{1,3})/,'$1-$2'):v;}
function validCEP(v){return /^\d{5}-?\d{3}$/.test((v||'').trim());}
function maskTel(v){v=v.replace(/\D/g,'').slice(0,11);if(v.length>10)return v.replace(/(\d{2})(\d{5})(\d{1,4})/,'($1) $2-$3');if(v.length>6)return v.replace(/(\d{2})(\d{4})(\d{1,4})/,'($1) $2-$3');if(v.length>2)return v.replace(/(\d{2})(\d{1,5})/,'($1) $2');if(v.length>0)return v.replace(/(\d{1,2})/,'($1');return v;}

/* ====== RAIL ====== */
/* ====== BLOCOS CONDICIONAIS ======
   Um bloco com `cond` só entra no fluxo se a resposta indicada casar. Toda a
   navegação (trilha, progresso, avançar/voltar) anda sobre os blocos VISÍVEIS,
   nunca sobre o SCHEMA cru - senão a pessoa cairia num bloco que não deveria ver. */
function visivel(s){
  if(!s.cond)return true;
  return s.cond.valores.indexOf(answers[s.cond.campo])>=0;
}
function blocos(){ return SCHEMA.filter(visivel); }
function posicaoAtual(){                        // índice do bloco atual entre os visíveis
  var id=SCHEMA[step].id, vs=blocos();
  for(var i=0;i<vs.length;i++) if(vs[i].id===id) return i;
  return 0;
}
function proximoVisivel(de){ for(var i=de+1;i<SCHEMA.length;i++) if(visivel(SCHEMA[i])) return i; return -1; }
function anteriorVisivel(de){ for(var i=de-1;i>=0;i--) if(visivel(SCHEMA[i])) return i; return -1; }

function renderRail(){
  var r=document.getElementById('rail'); r.innerHTML='';
  var atual=posicaoAtual();
  blocos().forEach(function(s,i){
    var st=el('div','step'+(i<atual?' done':'')+(i===atual?' cur':''));
    st.innerHTML='<div class="num">'+(i<atual?'✓':(i+1))+'</div><div class="cc"><div class="sn">'+s.title+'</div></div>';
    if(i<atual){ st.style.cursor='pointer'; st.addEventListener('click',function(){irParaBloco(s.id);}); }
    r.appendChild(st);
  });
}

/* ====== QUESTION ====== */
function advanceFrom(wrap){
  var next=wrap.nextElementSibling;
  if(next&&next.classList&&next.classList.contains('q')){
    setTimeout(function(){next.scrollIntoView({behavior:'smooth',block:'start'});},150);
  }else{
    var p=wrap.closest('.panel'), nav=p&&p.querySelector('.nav');
    if(nav)setTimeout(function(){nav.scrollIntoView({behavior:'smooth',block:'center'});},150);
  }
}
/* Redesenha perguntas cujo conteúdo depende de outra resposta do mesmo bloco. */
function redesenhaDependentes(){
  var s=SCHEMA[step];
  s.qs.forEach(function(q){
    if(q.t!=='seguidores')return;
    var antigo=host.querySelector('[data-qid="'+q.id+'"]');
    if(!antigo)return;
    var novo=qEl(q);
    antigo.parentNode.replaceChild(novo,antigo);
  });
}

/* Busca o endereço pelo CEP. Se falhar (CEP inexistente, offline, serviço fora),
   nao trava ninguem: libera os campos pra digitacao manual. */
function buscaCEP(cep,wrap){
  var limpo=(cep||'').replace(/\D/g,'');
  var aviso=wrap.querySelector('.cepmsg');
  if(limpo.length!==8){ if(aviso)aviso.textContent=''; return; }
  if(aviso){ aviso.className='cepmsg buscando'; aviso.textContent='Buscando endereço…'; }
  var ok=false;
  var t=setTimeout(function(){ if(!ok&&aviso){aviso.className='cepmsg manual';aviso.textContent='A busca demorou. Preencha o endereço manualmente abaixo.';} },6000);
  fetch('https://viacep.com.br/ws/'+limpo+'/json/')
    .then(function(r){return r.json();})
    .then(function(d){
      ok=true; clearTimeout(t);
      if(!d||d.erro){
        if(aviso){aviso.className='cepmsg manual';aviso.textContent='Não encontramos esse CEP. Confira o número ou preencha o endereço manualmente abaixo.';}
        return;
      }
      var mapa={logradouro:d.logradouro,bairro:d.bairro,cidade:d.localidade,uf:d.uf};
      Object.keys(mapa).forEach(function(id){
        if(!mapa[id])return;
        answers[id]=mapa[id];
        var no=host.querySelector('[data-qid="'+id+'"]');
        if(no){ var i=no.querySelector('input'); if(i)i.value=mapa[id]; no.classList.remove('invalid'); }
      });
      if(aviso){aviso.className='cepmsg achou';aviso.textContent='Endereço preenchido: '+[d.logradouro,d.bairro,d.localidade,d.uf].filter(Boolean).join(', ')+'. Confira e complete o número.';}
      var num=host.querySelector('[data-qid="numero"] input'); if(num)num.focus();
    })
    .catch(function(){
      ok=true; clearTimeout(t);
      if(aviso){aviso.className='cepmsg manual';aviso.textContent='Não conseguimos buscar agora. Pode preencher o endereço manualmente abaixo.';}
    });
}

function qEl(q){
  var wrap=el('div','q'); wrap.dataset.qid=q.id;
  wrap.innerHTML='<div class="qt">'+q.q+'</div>'+(q.qh?'<div class="qh">'+q.qh+'</div>':'');
  var val=answers[q.id];

  if(q.t==='radio'||q.t==='check'){
    var opts=el('div','opts');
    q.o.forEach(function(o){
      var b=el('button','opt'); b.type='button'; b.dataset.t=(q.t==='radio'?'radio':'check');
      b.innerHTML='<span class="mark"></span><span>'+o+'</span>';
      var on = q.t==='radio' ? (val===o) : (Array.isArray(val)&&val.indexOf(o)>=0);
      if(on)b.classList.add('sel');
      b.addEventListener('click',function(){
        if(q.t==='radio'){ answers[q.id]=o; opts.querySelectorAll('.opt').forEach(function(x){x.classList.remove('sel');}); b.classList.add('sel'); }
        else{ var a=answers[q.id]||[]; var k=a.indexOf(o); if(k>=0){a.splice(k,1);b.classList.remove('sel');}else{a.push(o);b.classList.add('sel');} answers[q.id]=a; }
        wrap.classList.remove('invalid');
        /* mudou as redes: o bloco de seguidores precisa refletir a nova seleção */
        if(q.id==='redes') redesenhaDependentes();
        if(q.t==='radio') advanceFrom(wrap);
      });
      opts.appendChild(b);
    });
    wrap.appendChild(opts);
  }
  else if(q.t==='para'){
    var ta=el('textarea'); ta.placeholder=q.ph||''; if(val)ta.value=val;
    ta.addEventListener('input',function(){answers[q.id]=ta.value;wrap.classList.remove('invalid');});
    wrap.appendChild(ta);
  }
  /* Um campo por rede marcada na pergunta anterior. Se a pessoa voltar e mudar
     as redes, este bloco se redesenha (ver o handler de 'redes'). */
  else if(q.t==='seguidores'){
    var cx=el('div','multi'); cx.dataset.multi=q.id;
    if(typeof answers[q.id]!=='object'||!answers[q.id]) answers[q.id]={};
    var redes=Array.isArray(answers.redes)?answers.redes:[];
    if(!redes.length){
      cx.appendChild(el('div','vazio','Marque acima as redes que você usa e os campos aparecem aqui.'));
    } else {
      redes.forEach(function(rede){
        var lin=el('div','linha');
        lin.innerHTML='<span class="rot">'+rede+'</span>';
        var i=el('input'); i.type='text'; i.placeholder=q.ph||'';
        i.value=answers[q.id][rede]||'';
        i.addEventListener('input',function(){answers[q.id][rede]=i.value;wrap.classList.remove('invalid');});
        lin.appendChild(i); cx.appendChild(lin);
      });
      /* limpa rede que foi desmarcada, pra não enviar resposta órfã */
      Object.keys(answers[q.id]).forEach(function(k){ if(redes.indexOf(k)<0) delete answers[q.id][k]; });
    }
    wrap.appendChild(cx);
  }
  /* 3 caixas por padrão e um botão pra adicionar mais. */
  else if(q.t==='cupom'){
    if(!Array.isArray(answers[q.id])) answers[q.id]=['','',''];
    var lista=el('div','multi');
    var addBtn=el('button','addmais','<span>+</span> Adicionar outra opção'); addBtn.type='button';
    function desenha(){
      lista.innerHTML='';
      answers[q.id].forEach(function(v,ix){
        var lin=el('div','linha');
        lin.innerHTML='<span class="rot num">'+(ix+1)+'º</span>';
        var i=el('input'); i.type='text'; i.placeholder=q.ph||''; i.value=v;
        i.addEventListener('input',function(){answers[q.id][ix]=i.value;wrap.classList.remove('invalid');});
        lin.appendChild(i);
        if(answers[q.id].length>3){                       // nunca deixa cair abaixo de 3
          var rm=el('button','remove','×'); rm.type='button'; rm.title='Remover';
          rm.addEventListener('click',function(){answers[q.id].splice(ix,1);desenha();});
          lin.appendChild(rm);
        }
        lista.appendChild(lin);
      });
    }
    addBtn.addEventListener('click',function(){
      if(answers[q.id].length>=8)return;
      answers[q.id].push(''); desenha();
      var ins=lista.querySelectorAll('input'); ins[ins.length-1].focus();
    });
    desenha();
    wrap.appendChild(lista); wrap.appendChild(addBtn);
  }
  else {
    var inp=el('input');
    inp.type = q.t==='email'?'email' : q.t==='date'?'date' : (q.t==='tel'||q.t==='cnpj'||q.t==='num'||q.t==='cpf'||q.t==='cep')?'tel' : 'text';
    inp.placeholder=q.ph||''; if(val)inp.value=val;
    if(q.t==='cep'){
      inp.inputMode='numeric';
      inp.addEventListener('input',function(){
        inp.value=maskCEP(inp.value); answers[q.id]=inp.value; wrap.classList.remove('invalid');
        if(inp.value.replace(/\D/g,'').length===8) buscaCEP(inp.value,wrap);   // busca ao completar
      });
      inp.addEventListener('blur',function(){ buscaCEP(inp.value,wrap); });
    }
    else if(q.t==='cpf'){ inp.inputMode='numeric'; inp.addEventListener('input',function(){inp.value=maskCPF(inp.value);answers[q.id]=inp.value;wrap.classList.remove('invalid');}); }
    else if(q.t==='cnpj'){ inp.inputMode='numeric'; inp.addEventListener('input',function(){inp.value=maskCNPJ(inp.value);answers[q.id]=inp.value;wrap.classList.remove('invalid');}); }
    else if(q.t==='tel'){ inp.inputMode='numeric'; inp.addEventListener('input',function(){inp.value=maskTel(inp.value);answers[q.id]=inp.value;wrap.classList.remove('invalid');}); }
    else if(q.t==='num'){ inp.inputMode='numeric'; inp.addEventListener('input',function(){inp.value=inp.value.replace(/[^\d.,]/g,'');answers[q.id]=inp.value;wrap.classList.remove('invalid');}); }
    else { inp.addEventListener('input',function(){answers[q.id]=inp.value;wrap.classList.remove('invalid');}); }
    wrap.appendChild(inp);
  }
  if(q.t==='cep') wrap.appendChild(el('div','cepmsg'));
  wrap.appendChild(el('div','err','Essa resposta é obrigatória.'));

  /* PROTECAO CONTRA GRAVADOR DE SESSAO.
     Hotjar, Clarity, Lucky Orange e afins gravam o que a pessoa digita. Se
     alguem plugar uma dessas ferramentas na pagina, o CPF iria junto. Estes
     atributos sao os sinais que essas ferramentas respeitam pra NAO capturar
     o campo. Custam nada e valem por qualquer ferramenta que entre depois. */
  [].slice.call(wrap.querySelectorAll('input,textarea')).forEach(function(campo){
    campo.setAttribute('data-hj-suppress','');          // Hotjar
    campo.setAttribute('data-clarity-mask','true');     // Microsoft Clarity
    campo.setAttribute('data-dd-privacy','mask');       // Datadog
    campo.setAttribute('data-sl','mask');               // SmartLook / Quantum
    /* identificadores fortes nao ficam no preenchimento automatico do navegador,
       o que importa em computador compartilhado */
    if(['cpf','cnpj','date','cep'].indexOf(q.t)>=0) campo.setAttribute('autocomplete','off');
  });
  return wrap;
}

/* ====== SECTION ====== */
function renderSection(){
  var s=SCHEMA[step]; host.innerHTML='';
  var panel=el('div','panel');
  panel.innerHTML='<div class="sec-eyebrow">'+s.eyebrow+'</div><h2 class="sec-title">'+s.title+'</h2>'+(s.sub?'<div class="sec-sub">'+s.sub+'</div>':'');
  var qhost=el('div');
  s.qs.forEach(function(q){ qhost.appendChild(qEl(q)); });
  panel.appendChild(qhost);

  if(s.final){
    /* Consentimento GRANULAR (LGPD Art. 8º e Art. 11, I):
       1) obrigatório - tratar os dados para avaliar a candidatura;
       2) opcional e destacado - dado de SAÚDE, que é sensível e exige
          consentimento específico. Um não pode ser condição do outro. */
    /* Texto curto por padrao; o detalhamento legal fica atras de "Leia mais".
       O clique no "Leia mais" NAO pode marcar a caixa - daí o stopPropagation. */
    /* NAO usar <label> aqui: <button> e um elemento "labelable", entao o label
       encaminha o clique do card para o botao "Leia mais" e o detalhe abre/fecha
       sozinho ao marcar a caixa. Usamos div com semantica de checkbox. */
    function caixaConsentimento(cfg){
      var c=el('div','consent'+(cfg.extraCls||'')+(answers[cfg.chave]?' on':'')); c.id=cfg.id;
      c.setAttribute('role','checkbox');
      c.setAttribute('tabindex','0');
      c.setAttribute('aria-checked',answers[cfg.chave]?'true':'false');
      c.innerHTML='<div class="box"></div><div class="ctxt"><p>'+cfg.curto+'</p>'
        +'<button type="button" class="cmore" aria-expanded="false">Leia mais</button>'
        +'<div class="cdet">'+cfg.longo+'</div></div>';
      function alterna(){
        answers[cfg.chave]=!answers[cfg.chave];
        c.classList.toggle('on',answers[cfg.chave]);
        c.setAttribute('aria-checked',answers[cfg.chave]?'true':'false');
        c.style.borderColor='';
      }
      c.addEventListener('click',function(ev){
        if(ev.target.tagName==='A')return;                       // deixa o link abrir
        if(ev.target.classList.contains('cmore')){               // so expande
          ev.preventDefault(); ev.stopPropagation();
          var aberto=c.classList.toggle('exp');
          ev.target.textContent=aberto?'Leia menos':'Leia mais';
          ev.target.setAttribute('aria-expanded',aberto?'true':'false');
          return;
        }
        alterna();
      });
      c.addEventListener('keydown',function(ev){                 // acessivel por teclado
        if(ev.target!==c)return;
        if(ev.key===' '||ev.key==='Enter'){ ev.preventDefault(); alterna(); }
      });
      return c;
    }

    /* 1) Aceite dos termos da parceria. Sem a URL do documento, não faz sentido
       pedir aceite - a pessoa não tem como ler o que está aceitando. */
    var linkTermos = TERMOS_URL
      ? '<a href="'+TERMOS_URL+'" target="_blank" rel="noopener">termos e condições da parceria</a>'
      : '<b>termos e condições da parceria</b>';
    panel.appendChild(caixaConsentimento({
      id:'aceiteTermos', chave:'__aceite_termos',
      curto:'<b>Li e concordo</b> com os '+linkTermos+' do #SQUADMANUAL.',
      longo:'Os termos detalham regras de conduta, prazos de pagamento, propriedade intelectual e diretrizes da marca MANUAL. Estou ciente de que o descumprimento pode levar à suspensão da minha participação no programa.'
        +(TERMOS_URL?'':' <b style="color:#B4553F">Atenção: o link do documento ainda não foi configurado nesta página.</b>')
    }));

    /* 2) Declaração de veracidade das informações. */
    panel.appendChild(caixaConsentimento({
      id:'aceiteVeracidade', chave:'__aceite_veracidade',
      curto:'<b>Declaro que as informações são verdadeiras</b> e de minha responsabilidade.',
      longo:'Isso vale para todos os dados deste formulário: pessoais, de faturamento e de redes sociais. Informações incorretas podem inviabilizar o pagamento das comissões ou a sua participação no programa.'
    }));

    /* 3) Consentimento LGPD para o tratamento dos dados. */
    panel.appendChild(caixaConsentimento({
      id:'consentBox', chave:'__consent',
      curto:'<b>Autorizo a MANUAL a tratar meus dados</b> para avaliar minha candidatura e falar comigo sobre o programa.',
      longo:'Seus dados ficam armazenados no Google Workspace, que atua como operador. Você pode retirar este consentimento a qualquer momento e pedir acesso, correção ou exclusão pelo canal indicado no <a href="/privacidade" target="_blank" rel="noopener">Aviso de Privacidade</a>. Candidaturas não aprovadas são eliminadas em até 12 meses.'
    }));

    /* 4) Consentimento específico do dado de saúde - só aparece se a pessoa
       realmente respondeu a pergunta; caso contrário não há o que autorizar. */
    if(answers.tratamento && answers.tratamento!=='Prefiro não informar'){
      panel.appendChild(caixaConsentimento({
        id:'consentSaude', chave:'__consent_saude',
        curto:'<b>Opcional:</b> autorizo guardar minha resposta sobre tratamento capilar.',
        longo:'Essa é uma informação de saúde e, por isso, tem autorização separada. Sem ela, o formulário segue normalmente e a resposta é <b>descartada</b>: não é guardada nem influencia na seleção. Você não precisa ser calvo nem estar em tratamento pra entrar no Squad.'
      }));
    }

    /* honeypot: invisível pra humano, irresistível pra bot */
    var hp=el('div','hp'); hp.setAttribute('aria-hidden','true');
    hp.innerHTML='<label>Não preencha este campo<input type="text" id="hp_site" tabindex="-1" autocomplete="off"></label>';
    panel.appendChild(hp);
  }

  var nav=el('div','nav');
  var back=el('button','btn btn-ghost','← Voltar'); back.addEventListener('click',prev);
  if(step===0)back.style.visibility='hidden';
  var next=el('button','btn btn-primary', s.final?'Enviar cadastro ✓':'Continuar →');
  next.addEventListener('click',nextStep);
  var reqN=s.qs.filter(function(q){return q.req;}).length;
  var cnt=el('div','cnt', s.final?'3 aceites obrigatórios':(reqN===1?'1 obrigatória neste bloco':reqN+' obrigatórias neste bloco'));
  nav.appendChild(back); nav.appendChild(el('div','spacer')); nav.appendChild(cnt); nav.appendChild(next);
  panel.appendChild(nav);

  host.appendChild(panel);
  updateProgress(); renderRail();
  window.scrollTo({top:0,behavior:'smooth'});
}

/* ====== VALIDATION ====== */
function validateSection(){
  var s=SCHEMA[step], ok=true, firstBad=null;
  s.qs.forEach(function(q){
    var v=answers[q.id], bad=false;
    if(q.req){
      if(q.t==='check') bad=!Array.isArray(v)||!v.length;
      /* cupom: o time precisa de 3 alternativas pra checar disponibilidade */
      else if(q.t==='cupom') bad=!Array.isArray(v)||v.filter(function(x){return x&&x.trim();}).length<3;
      else bad=!v||!String(v).trim();
      if(!bad && q.t==='email') bad=!validEmail(v);
      if(!bad && q.t==='cpf') bad=!validCPF(v);
      if(!bad && q.t==='cep') bad=!validCEP(v);
      if(!bad && q.t==='date' && q.id==='nascimento') bad=!maiorDeIdade(v);
    } else if(q.t==='email' && v) bad=!validEmail(v);
    var node=host.querySelector('[data-qid="'+q.id+'"]');
    if(bad){ ok=false; if(node){node.classList.add('invalid'); var er=node.querySelector('.err'); if(q.t==='email')er.textContent='Digite um e-mail válido.'; else if(q.t==='cpf')er.textContent='CPF inválido, confira os números.'; else if(q.t==='cupom')er.textContent='Sugira pelo menos 3 nomes para o cupom.'; else if(q.t==='cep')er.textContent='CEP inválido. Use o formato 00000-000.'; else if(q.id==='nascimento')er.textContent='O Squad é só para maiores de 18 anos.'; else er.textContent='Essa resposta é obrigatória.'; if(!firstBad)firstBad=node;} }
  });
  if(s.final){
    /* Três aceites obrigatórios e independentes: termos da parceria,
       veracidade dos dados e consentimento LGPD. O de saúde é opcional. */
    [['__aceite_termos','aceiteTermos'],['__aceite_veracidade','aceiteVeracidade'],['__consent','consentBox']]
      .forEach(function(par){
        if(answers[par[0]])return;
        ok=false;
        var cx=document.getElementById(par[1]);
        if(cx){ cx.style.borderColor='var(--coral-ink)'; if(!firstBad)firstBad=cx; }
      });
  }
  if(firstBad) firstBad.scrollIntoView({behavior:'smooth',block:'center'});
  return ok;
}

/* ====== NAV ====== */
function nextStep(){
  if(!validateSection())return;
  if(SCHEMA[step].final){ submit(); return; }
  var p=proximoVisivel(step);
  if(p<0){ submit(); return; }
  step=p; renderSection();
}
function prev(){ var a=anteriorVisivel(step); if(a>=0){step=a;renderSection();} }
function irParaBloco(id){
  for(var i=0;i<SCHEMA.length;i++) if(SCHEMA[i].id===id){ if(i<step){step=i;renderSection();} return; }
}

function updateProgress(){
  document.getElementById('pbar').style.display='block';
  document.getElementById('pStep').textContent=step+1;
  var vs=blocos(), atual=posicaoAtual();
  document.getElementById('pStep').textContent=atual+1;
  document.getElementById('pTotal').textContent=vs.length;
  document.getElementById('pName').textContent=SCHEMA[step].title;
  document.getElementById('pFill').style.width=Math.round(atual/vs.length*100)+'%';
}

/* ====== SUBMIT ====== */
function submit(){
  document.getElementById('pFill').style.width='100%';
  var payload=JSON.parse(JSON.stringify(answers));

  /* SEGURANCA: nada de PII no navegador. A versao anterior gravava o payload
     inteiro (CPF, CNPJ, endereco, telefone) em localStorage, em texto plano e
     para sempre - vazamento direto em computador compartilhado. */
  try{ Object.keys(localStorage).forEach(function(k){ if(k.indexOf('squad_manual_')===0) localStorage.removeItem(k); }); }catch(e){}

  /* Seguidores vira "Instagram: 84 mil | TikTok: 31 mil" e cupom vira
     "1. NOME10 | 2. SEUNOME | 3. CANALMANUAL": a planilha guarda texto legivel,
     nao JSON. Campos vazios sao descartados. */
  if(payload.seguidores && typeof payload.seguidores==='object'){
    payload.seguidores=Object.keys(payload.seguidores)
      .filter(function(k){return payload.seguidores[k]&&String(payload.seguidores[k]).trim();})
      .map(function(k){return k+': '+String(payload.seguidores[k]).trim();}).join(' | ');
  }
  if(Array.isArray(payload.cupom)){
    payload.cupom=payload.cupom
      .map(function(v){return (v||'').trim();}).filter(Boolean)
      .map(function(v,i){return (i+1)+'. '+v;}).join(' | ');
  }

  /* Blocos que ficaram ocultos nao devem enviar resposta: se a pessoa marcou
     "Sim, possuo", preencheu o CNPJ e depois voltou e mudou para "Nao", os
     dados da empresa continuariam no payload sem ela ver. */
  SCHEMA.forEach(function(s){
    if(visivel(s))return;
    s.qs.forEach(function(q){ delete payload[q.id]; });
  });

  /* Dado de saude so viaja se houve consentimento especifico (Art. 11, I).
     O servidor tambem descarta - cliente nunca e a unica barreira. */
  if(!payload.__consent_saude) delete payload.tratamento;
  if(payload.tratamento==='Prefiro não informar') delete payload.tratamento;

  payload.__consent_v=CONSENT_VERSAO;
  payload.__ts=new Date().toISOString();
  payload._dwell=Date.now()-T0;                                   // tempo de preenchimento
  var hp=document.getElementById('hp_site'); payload._hp=hp?hp.value:'';

  if(ENDPOINT && ENDPOINT.indexOf('http')===0){
    var body=JSON.stringify(Object.assign({token:NONCE},payload));
    fetch(ENDPOINT,{method:'POST',mode:'no-cors',headers:{'Content-Type':'text/plain;charset=utf-8'},body:body})
      .catch(function(){});
  }
  /* apaga o payload da memoria assim que sai */
  payload=null; answers={};

  document.getElementById('form').classList.add('hidden');
  document.getElementById('pbar').style.display='none';
  document.getElementById('thanks').classList.remove('hidden');
  window.scrollTo({top:0,behavior:'smooth'});
}
/* ====== START ====== */
document.getElementById('beginBtn').addEventListener('click',function(){
  document.getElementById('intro').classList.add('hidden');
  document.getElementById('form').classList.remove('hidden');
  step=0; renderSection();
});

/* ====== NAO DEIXAR RASTRO AO SAIR DA PAGINA ======
   O navegador guarda a pagina viva no cache de historico (bfcache): voltar pelo
   botao "voltar" a restaura com tudo preenchido, inclusive CPF. Num computador
   compartilhado isso entrega os dados de quem usou antes. Ao sair, limpamos as
   respostas; ao voltar do cache, recomecamos do zero. */
(function(){
  function limpar(){
    answers={};
    try{
      document.querySelectorAll('#form input,#form textarea').forEach(function(c){c.value='';});
    }catch(e){}
  }
  addEventListener('pagehide',limpar);
  addEventListener('pageshow',function(ev){
    if(!ev.persisted)return;                 // carregamento normal: nao mexe
    limpar(); step=0;
    document.getElementById('form').classList.add('hidden');
    document.getElementById('thanks').classList.add('hidden');
    document.getElementById('intro').classList.remove('hidden');
    document.getElementById('pbar').style.display='none';
  });
})();
})();
