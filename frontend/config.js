/**
 * SAPE - Configuração Global da API
 * Define a URL base do backend dinamicamente.
 */
(function () {
  function getApiUrl() {
    // Se houver uma URL explicitamente injetada globalmente
    if (window.SAPE_API_URL) {
      return window.SAPE_API_URL;
    }

    const origin = window.location.origin;

    // Se a página for aberta direto do sistema de arquivos (file://) ou sem origi
    if (!origin || origin === 'null' || origin.startsWith('file://')) {
      return 'http://localhost:3000';
    }

    try {
      const url = new URL(origin);
      // Se o servidor frontend estiver rodando em ambiente de dev local (ex: porta 5500 ou 8080)
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return `${url.protocol}//${url.hostname}:3000`;
      }
      // Em produção (mesmo domínio/porta ou com proxy reverso)
      return origin;
    } catch (e) {
      return 'http://localhost:3000';
    }
  }

  const API_URL = getApiUrl();

  window.SAPE_CONFIG = {
    API_URL: API_URL,
    STORAGE_KEY: 'sape_user',
    TOKEN_KEY: 'sape_token'
  };

  window.API_URL = API_URL;
})();
