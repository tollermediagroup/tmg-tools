/* ==========================================================================
   TMG Toolbench — shell compartilhado
   Fonte única da lista de ferramentas: para adicionar uma nova, basta
   acrescentar uma entrada em TOOLS e criar o arquivo em /tools.
   Carregue este script de forma SÍNCRONA logo depois de <div id="topbar">.
   ========================================================================== */
(function (global) {
  "use strict";

  var TOOLS = [
    {
      id: 'comentarios',
      href: 'comentarios.html',
      nav: 'Comentários',
      title: 'Gerador de comentários',
      desc: 'Comentários do Instagram e do TikTok em PNG transparente, um por vez ou em lote via CSV.',
      icon: '💬',
      meta: 'PNG · lote · CSV'
    },
    {
      id: 'textbox',
      href: 'textbox.html',
      nav: 'Text box',
      title: 'Gerador de text box',
      desc: 'Legenda estilo TikTok e Reels com uma caixa por linha, larguras independentes e sem emenda.',
      icon: '🔤',
      meta: 'PNG · 9:16 · 4:5 · 1:1'
    },
    {
      id: 'luma',
      href: 'luma-grade.html',
      nav: 'Luma Grade',
      title: 'Luma Grade',
      desc: 'Transforma uma imagem de referência em LUT .cube sob medida para Premiere, DaVinci e CapCut.',
      icon: '🎞',
      meta: '.cube · 33³ · local'
    },
    {
      id: 'caixinha',
      href: 'caixinha.html',
      nav: 'Caixinha',
      title: 'Caixinha de perguntas',
      desc: 'A caixinha de perguntas do Instagram em PNG transparente, uma por vez ou várias de uma vez.',
      icon: '❓',
      meta: 'PNG · lote · .zip'
    },
    {
      id: 'safezone',
      href: 'safe-zones.html',
      nav: 'Áreas seguras',
      title: 'Áreas seguras',
      desc: 'Confere se a legenda cai atrás da interface do TikTok, Reels ou Shorts antes de exportar.',
      icon: '📐',
      meta: 'overlay · PNG'
    }
  ];

  /* ---------- caminho relativo ---------- */
  // Todos os arquivos ficam na raiz do site, então não há prefixo a montar.
  // Se um dia as ferramentas voltarem para subpastas, é só esta função que muda.
  function base() {
    return '';
  }

  /* ---------- topbar ---------- */
  function mountTopbar(activeId) {
    var host = document.getElementById('topbar');
    if (!host) return;
    var b = base();

    var bar = document.createElement('div');
    bar.className = 'tb';

    var mark = document.createElement('a');
    mark.className = 'tb-mark';
    mark.href = b + 'index.html';
    mark.innerHTML =
      '<span class="glyph">T</span>' +
      '<span><b>Toolbench</b> <span>ugc · tmg</span></span>';
    bar.appendChild(mark);

    var nav = document.createElement('nav');
    nav.className = 'tb-nav';
    nav.setAttribute('aria-label', 'Ferramentas');
    TOOLS.forEach(function (t) {
      var a = document.createElement('a');
      a.href = b + t.href;
      a.textContent = t.nav;
      if (t.id === activeId) a.setAttribute('aria-current', 'page');
      nav.appendChild(a);
    });
    bar.appendChild(nav);

    var end = document.createElement('div');
    end.className = 'tb-end';
    end.innerHTML = '<span class="tb-note"><span class="dot"></span>tudo roda no seu navegador</span>';
    bar.appendChild(end);

    host.appendChild(bar);
  }

  /* ---------- toast ---------- */
  var toastEl = null, toastTimer = null;
  function toast(msg) {
    if (!toastEl) {
      toastEl = document.createElement('div');
      toastEl.className = 'toast';
      toastEl.setAttribute('role', 'status');
      document.body.appendChild(toastEl);
    }
    toastEl.textContent = msg;
    toastEl.classList.add('on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { toastEl.classList.remove('on'); }, 2600);
  }

  /* ---------- utilitários de arquivo ---------- */
  // Baixar um Blob. O object URL é sempre revogado — evita vazamento de memória
  // quando a pessoa exporta dezenas de arquivos numa sessão.
  function saveBlob(blob, name) {
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 2000);
  }

  function canvasBlob(canvas) {
    return new Promise(function (res, rej) {
      canvas.toBlob(function (b) {
        b ? res(b) : rej(new Error('toBlob retornou vazio'));
      }, 'image/png');
    });
  }

  // Carrega um File como <img> já decodificado, revogando o object URL depois.
  function loadImageFile(file) {
    return new Promise(function (res, rej) {
      if (!file || String(file.type).indexOf('image/') !== 0) {
        rej(new Error('não é imagem'));
        return;
      }
      var url = URL.createObjectURL(file);
      var img = new Image();
      img.onload = function () { URL.revokeObjectURL(url); res(img); };
      img.onerror = function () { URL.revokeObjectURL(url); rej(new Error('falha ao decodificar')); };
      img.src = url;
    });
  }

  function safeName(s, fallback) {
    return String(s == null ? '' : s)
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9_.-]/gi, '')
      .slice(0, 40) || (fallback || 'arquivo');
  }

  /* ---------- preferências por ferramenta ---------- */
  // localStorage pode falhar (modo privado, storage cheio, iframe sem permissão).
  // Todo acesso é protegido para nunca derrubar a ferramenta.
  function store(key) {
    var full = 'tmg.toolbench.' + key;
    return {
      get: function (fallback) {
        try {
          var raw = localStorage.getItem(full);
          return raw ? JSON.parse(raw) : fallback;
        } catch (e) { return fallback; }
      },
      set: function (value) {
        try { localStorage.setItem(full, JSON.stringify(value)); return true; }
        catch (e) { return false; }
      },
      clear: function () {
        try { localStorage.removeItem(full); } catch (e) {}
      }
    };
  }

  /* ---------- boot ---------- */
  var active = (document.body && document.body.dataset && document.body.dataset.tool)
    || (document.documentElement.getAttribute('data-tool'))
    || '';
  mountTopbar(active);

  global.Shell = {
    TOOLS: TOOLS,
    base: base,
    toast: toast,
    saveBlob: saveBlob,
    canvasBlob: canvasBlob,
    loadImageFile: loadImageFile,
    safeName: safeName,
    store: store
  };
})(window);
