/* header.js
   Injeta o cabeçalho padrão em todas as páginas e implementa
   comportamento do botão de menu no modo responsivo.

   Notas:
   - Para páginas em subpastas (ex.: /register/), calculamos um
     `prefix` para ajustar caminhos relativos (./ vs ../).
   - O template HTML é criado como string e inserido no <body>.
*/

document.addEventListener('DOMContentLoaded', () => {
  // Pastas que usam um prefixo "../" quando estamos dentro delas
  const subfolders = ['login', 'register', 'pag3'];

  // Detecta se a página atual está numa subpasta e ajusta o prefixo
  let prefix = '';
  for (const f of subfolders) {
    if (location.pathname.includes('/' + f + '/')) {
      prefix = '../';
      break;
    }
  }

  // Template do cabeçalho (acessível e responsivo). Mantê-lo simples facilita
  // atualizações e manutenção. Use crase (`) para permitir interpolação.
  const headerHtml = `
    <a class="skip-link" href="#conteudo">Pular para o conteúdo</a>
    <header class="site-header" role="banner">
      <div class="brand">
        <a href="${prefix}index.html" class="brand-link" aria-label="Ir para o início">
          <div class="logo"><img src="${prefix}assent/logo.png" alt="Logo da Escola"></div>
        </a>
        <div class="brand-text">
          <p class="school-name">Sistema de Suporte à Atenção Psicopedagógica Estudantil</p>
          <p class="school-tag">Escola Estadual ETE Urbano Gomes de Sá</p>
        </div>
      </div>

      <button class="nav-toggle" aria-controls="site-navigation" aria-expanded="false" aria-label="Abrir menu">
        <span class="hamburger" aria-hidden="true"></span>
        <span class="visually-hidden">Menu</span>
      </button>

      <nav id="site-navigation" class="site-nav" role="navigation" aria-label="Principal">
        <ul class="nav-list">
          <li><a href="${prefix}index.html">Início</a></li>
          <li><a href="${prefix}index.html#neurodiversidade">Neurodiversidade</a></li>
          <li><a href="${prefix}pag3/index.html">Diagnóstico e Apoio</a></li>
          <li><a href="${prefix}login/index.html">Login</a></li>
          <li><a href="${prefix}register/index.html">Cadastre-se</a></li>
        </ul>
      </nav>
    </header>
  `;

  // Inserção do cabeçalho: substitui um existente ou insere no topo do <body>
  const existing = document.querySelector('header.site-header');
  if (existing) {
    existing.replaceWith(document.createRange().createContextualFragment(headerHtml));
  } else {
    document.body.insertAdjacentHTML('afterbegin', headerHtml);
  }

  // Comportamento do botão de menu (somente se existir na página)
  const navToggle = document.querySelector('.nav-toggle');
  const siteNav = document.getElementById('site-navigation');
  if (navToggle && siteNav) {
    // Alterna estado ARIA e classe que mostra/oculta o menu
    navToggle.addEventListener('click', () => {
      const expanded = navToggle.getAttribute('aria-expanded') === 'true';
      navToggle.setAttribute('aria-expanded', String(!expanded));
      siteNav.classList.toggle('open');
    });

    // Fecha o menu ao clicar fora dele
    document.addEventListener('click', (e) => {
      if (!siteNav.contains(e.target) && !navToggle.contains(e.target)) {
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
      }
    });

    // Fecha com Escape e devolve foco ao toggle para acessibilidade
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        siteNav.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.focus();
      }
    });
  }
});
