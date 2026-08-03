/**
 * SAPE - Configuração Global da API
 * Define a URL base do backend dinamicamente.
 */
(function () {
  function getApiUrl() {
    if (window.SAPE_API_URL) {
      return window.SAPE_API_URL;
    }

    const origin = window.location.origin;
    if (!origin || origin === 'null' || origin.startsWith('file://')) {
      return 'http://localhost:3000';
    }

    try {
      const url = new URL(origin);
      if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') {
        return `${url.protocol}//${url.hostname}:3000`;
      }
      return `${url.protocol}//${url.hostname}${url.port ? `:${url.port}` : ''}`;
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
