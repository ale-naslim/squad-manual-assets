(function(){
  var $=function(s,c){return (c||document).querySelector(s);};
  var $$=function(s,c){return Array.prototype.slice.call((c||document).querySelectorAll(s));};
  document.documentElement.classList.add('js');
  var RM=matchMedia('(prefers-reduced-motion:reduce)').matches;
  var hasGSAP=window.gsap&&window.ScrollTrigger, hasLenis=window.Lenis;

  $$('.media[data-img]').forEach(function(el){el.style.backgroundImage="url('https://cdn.jsdelivr.net/gh/ale-naslim/squad-manual-assets@main/assets/img/"+el.getAttribute('data-img')+".jpg')";});
  function playVids(){$$('video:not(#vsquad)').forEach(function(v){try{v.muted=true;v.defaultMuted=true;v.setAttribute('muted','');v.setAttribute('playsinline','');v.setAttribute('webkit-playsinline','');var p=v.play&&v.play();if(p&&p.catch)p.catch(function(){});}catch(e){}});}
  playVids();
  ['touchstart','pointerdown','scroll','click'].forEach(function(ev){addEventListener(ev,playVids,{once:true,passive:true});});
  if('IntersectionObserver' in window){var vio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){var v=e.target;v.muted=true;var p=v.play&&v.play();if(p&&p.catch)p.catch(function(){});}});},{threshold:.1});$$('video:not(#vsquad)').forEach(function(v){vio.observe(v);});}
  /* vídeo do Squad: click-to-play com som */
  /* Vídeo do Squad: só injeta o iframe do YouTube depois do clique (nenhum
     contato com o YouTube em quem apenas rola a página). youtube-nocookie
     evita os cookies de rastreio do player. */
  (function(){
    var vf=$('#vframe'); if(!vf)return;
    var id=vf.getAttribute('data-yt'); if(!id)return;
    var aberto=false;
    function playSquad(){
      if(aberto)return; aberto=true;
      var f=document.createElement('iframe');
      f.src='https://www.youtube-nocookie.com/embed/'+id+'?autoplay=1&rel=0&modestbranding=1';
      f.title='Vídeo do #SQUADMANUAL';
      f.allow='accelerometer; autoplay; encrypted-media; picture-in-picture';
      f.setAttribute('allowfullscreen','');
      f.setAttribute('referrerpolicy','strict-origin-when-cross-origin');
      vf.appendChild(f);
      vf.classList.add('playing');
      var p=$('#vposter'); if(p)p.style.display='none';
    }
    vf.addEventListener('click',playSquad);
    vf.addEventListener('keydown',function(e){ if(e.key==='Enter'||e.key===' ')playSquad(); });
  })();

  var lenis=null;
  if(hasGSAP){
    gsap.registerPlugin(ScrollTrigger);
    if(hasLenis&&!RM){
      lenis=new Lenis({duration:1.15,smoothWheel:true});
      lenis.on('scroll',ScrollTrigger.update);
      gsap.ticker.add(function(t){lenis.raf(t*1000);}); gsap.ticker.lagSmoothing(0);
    }
  }
  $$('a[href^="#"]').forEach(function(a){a.addEventListener('click',function(e){var id=a.getAttribute('href');if(id.length>1){var el=$(id);if(el){e.preventDefault();if(lenis)lenis.scrollTo(el,{offset:-8});else el.scrollIntoView({behavior:RM?'auto':'smooth'});}}});});

  var nav=$('#nav');
  function navDark(on){nav.classList.toggle('on-dark',on);}
  if(hasGSAP){
    ['#hero','#prizes','#final'].forEach(function(sel){var s=$(sel);if(!s)return;ScrollTrigger.create({trigger:s,start:'top 62px',end:'bottom 62px',onToggle:function(self){navDark(self.isActive);}});});
  }

  if(hasGSAP){
    $$('.fade:not(.step)').forEach(function(el){ScrollTrigger.create({trigger:el,start:'top 84%',onEnter:function(){el.classList.add('in');}});});
    (function(){var box=$('#como .steps');if(!box)return;var steps=$$('.step',box);
      if(RM){steps.forEach(function(s){s.classList.add('in');});return;}
      ScrollTrigger.create({trigger:box,start:'top 80%',onEnter:function(){steps.forEach(function(s,i){setTimeout(function(){s.classList.add('in');},i*120);});}});})();
  } else { $$('.fade,.step').forEach(function(el){el.classList.add('in');}); }

  if(hasGSAP&&!RM){
    gsap.set('#hero .bg .media',{scale:1.04,transformOrigin:'50% 50%'});
    gsap.to('#hero .bg .media',{scale:1.16,ease:'none',scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:true}});
    gsap.to('#hero .inner',{yPercent:-20,opacity:0,ease:'none',scrollTrigger:{trigger:'#hero',start:'top top',end:'bottom top',scrub:true}});
  }

  if(hasGSAP&&!RM){
    gsap.fromTo('#manifesto .disc',{yPercent:-70,rotate:-16},{yPercent:70,rotate:2,ease:'none',scrollTrigger:{trigger:'#manifesto',start:'top bottom',end:'bottom top',scrub:true}});

    /* PARALLAX PALAVRA A PALAVRA no manifesto.
       Envolve cada palavra num <span> preservando os elementos que ja existem
       (<em> dos destaques e o <span class="ann"> manuscrito coral), senao o
       estilo deles se perderia. Depois cada palavra ganha um ritmo proprio. */
    (function(){
      var linhas=$$('#manifesto .ln'); if(!linhas.length)return;
      linhas.forEach(function(ln){
        var novos=[];
        [].slice.call(ln.childNodes).forEach(function(no){
          if(no.nodeType===3){                                  // texto solto: quebra em palavras
            no.textContent.split(/(\s+)/).forEach(function(t){
              if(!t)return;
              if(!t.trim()){novos.push(document.createTextNode(t));return;}
              var s=document.createElement('span'); s.className='pw'; s.textContent=t; novos.push(s);
            });
          } else {                                              // <em> / <span class="ann">: move inteiro
            var s=document.createElement('span'); s.className='pw'; s.appendChild(no.cloneNode(true)); novos.push(s);
          }
        });
        ln.textContent='';
        novos.forEach(function(n){ln.appendChild(n);});
      });

      /* Ritmos alternados e deterministicos: palavras vizinhas nunca andam
         juntas, o que e o que faz o parallax ficar percebivel. Amplitudes bem
         separadas entre si (de 52 a 205) pra leitura ficar viva; a rotacao
         minima tira a sensacao de bloco deslizando. */
      var ritmos=[150,62,205,96,175,52,124];
      var giros =[-1.4,0.9,-2.2,1.3,-1.8,0.7,1.6];
      $$('#manifesto .pw').forEach(function(w,i){
        var v=ritmos[i%ritmos.length], g=giros[i%giros.length];
        gsap.fromTo(w,{yPercent:v*0.55,rotate:g},{yPercent:-v*0.45,rotate:-g,ease:'none',
          scrollTrigger:{trigger:'#manifesto',start:'top bottom',end:'bottom top',scrub:0.55}});
      });
    })();
  }

  /* depoimentos mouse-follow */
  (function(){
    if(matchMedia('(hover:none)').matches||innerWidth<=860)return;
    var wrap=$('#depo'),rows=$$('.erow',wrap),floatEl=$('#efloat'),imgs=$$('.media',floatEl);
    if(!floatEl||!rows.length)return;
    var mx=innerWidth/2,my=innerHeight/2,fx=mx,fy=my,raf=null;
    function loop(){fx+=(mx-fx)*0.14;fy+=(my-fy)*0.14;floatEl.style.left=fx+'px';floatEl.style.top=fy+'px';raf=requestAnimationFrame(loop);}
    addEventListener('mousemove',function(e){mx=e.clientX;my=e.clientY;});
    rows.forEach(function(row,i){
      row.addEventListener('mouseenter',function(){wrap.classList.add('hovering');row.classList.add('active');imgs.forEach(function(im,j){im.classList.toggle('on',j===i);});floatEl.classList.add('show');if(!raf)loop();});
      row.addEventListener('mouseleave',function(){row.classList.remove('active');});
    });
    $('.erows',wrap).addEventListener('mouseleave',function(){wrap.classList.remove('hovering');floatEl.classList.remove('show');rows.forEach(function(r){r.classList.remove('active');});if(raf){cancelAnimationFrame(raf);raf=null;}});
  })();

  /* FAQ */
  $$('.faq-q').forEach(function(q){q.addEventListener('click',function(){
    var item=q.parentElement,a=$('.faq-a',item),open=item.classList.contains('open');
    $$('.faq-item.open').forEach(function(o){o.classList.remove('open');$('.faq-a',o).style.maxHeight=null;});
    if(!open){item.classList.add('open');a.style.maxHeight=a.scrollHeight+'px';}
  });});

  /* FORM */
  var form=$('#form'),msg=$('#msg'),submit=$('#submit'),whats=$('#whats');
  function maskTel(v){v=v.replace(/\D/g,'').slice(0,11);if(v.length>10)v=v.replace(/(\d{2})(\d{5})(\d{1,4})/,'($1) $2-$3');else if(v.length>6)v=v.replace(/(\d{2})(\d{4})(\d{1,4})/,'($1) $2-$3');else if(v.length>2)v=v.replace(/(\d{2})(\d{1,5})/,'($1) $2');else if(v.length>0)v=v.replace(/(\d{1,2})/,'($1');return v;}
  if(whats)whats.addEventListener('input',function(){whats.value=maskTel(whats.value);});
  if(form)form.addEventListener('submit',function(e){e.preventDefault();msg.className='msg';msg.textContent='';
    if(!form.nome.value.trim()){msg.textContent='Preenche seu nome.';msg.classList.add('err');return;}
    if(!form.email.value.includes('@')){msg.textContent='Confere o e-mail.';msg.classList.add('err');form.email.focus();return;}
    if(whats.value.replace(/\D/g,'').length<10){msg.textContent='Confere o WhatsApp com DDD.';msg.classList.add('err');whats.focus();return;}
    if(!form.perfil.value.trim()){msg.textContent='Coloca o @ do seu perfil.';msg.classList.add('err');form.perfil.focus();return;}
    if(!$('#consent').checked){msg.textContent='Você precisa autorizar o contato pra participar.';msg.classList.add('err');return;}
    submit.disabled=true;submit.textContent='Enviando...';
    setTimeout(function(){form.style.display='none';$('#okState').classList.add('show');if(lenis)lenis.scrollTo('#cadastro',{offset:-10});},500);
  });

  /* depoimentos: encurtar texto longo com "Ver completo" */
  (function(){
    var cards=$$('.tcard');
    /* Remede a cada resize: o corte da citação muda com a largura (no mobile o
       bento é mais estreito), então "cabe ou não cabe" nao pode ser medido uma
       vez só, senão o botão some justamente onde ele é mais necessário. */
    function afere(){
      cards.forEach(function(card){
        var qt=$('.qt',card), btn=$('.tmore',card); if(!qt||!btn)return;
        if(card.classList.contains('open'))return;              // aberto: nao mexe
        var cabe=qt.scrollHeight<=qt.clientHeight+4;
        btn.style.display=cabe?'none':'';
        qt.style.webkitMaskImage=cabe?'none':'';
        qt.style.maskImage=cabe?'none':'';
      });
    }
    cards.forEach(function(card){
      var btn=$('.tmore',card); if(!btn)return;
      btn.addEventListener('click',function(){
        var op=card.classList.toggle('open'); btn.textContent=op?'Ver menos':'Ver completo';
      });
    });
    setTimeout(afere,80);
    var t; addEventListener('resize',function(){clearTimeout(t);t=setTimeout(afere,150);});
  })();

  /* CTA flutuante: aparece após o hero, some sobre cadastro/final */
  (function(){
    var fcta=$('#floatcta'); if(!fcta) return;
    var heroEl=$('#hero');
    function inView(s){if(!s)return false;var r=s.getBoundingClientRect();return r.top<innerHeight*0.85 && r.bottom>innerHeight*0.15;}
    function upd(){
      var past=scrollY>(heroEl?heroEl.offsetHeight*0.7:600);
      fcta.classList.toggle('show', past && !inView($('#cadastro')) && !inView($('#final')));
    }
    addEventListener('scroll',upd,{passive:true}); addEventListener('resize',upd); setTimeout(upd,200);
  })();

  if(hasGSAP)ScrollTrigger.refresh();
})();
