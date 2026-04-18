const TERMINAL_INIT_TIMEOUT_MS = 12000;

window.addEventListener('DOMContentLoaded', async () => {
  let resolved = false;

  const timeoutId = window.setTimeout(() => {
    if (resolved) {
      return;
    }

    resolved = true;
    window.dispatchEvent(new CustomEvent('terminal-unavailable', {
      detail: {
        reason: 'Tiempo de espera agotado al inicializar ghostty-web.'
      }
    }));
  }, TERMINAL_INIT_TIMEOUT_MS);

  try {
    const { init, Terminal } = await import('../node_modules/ghostty-web/dist/ghostty-web.js');
    await init();

    if (resolved) {
      return;
    }

    resolved = true;
    window.clearTimeout(timeoutId);

    window.Terminal = Terminal;
    window.FitAddon = {
      FitAddon: class {
        fit() {
          window.fitTerminal?.();
        }
      }
    };

    console.log('[FluxDev] Terminal renderer: ghostty-web');
    window.dispatchEvent(new Event('terminal-loaded'));
  } catch (error) {
    if (resolved) {
      return;
    }

    resolved = true;
    window.clearTimeout(timeoutId);

    console.warn('[FluxDev] ghostty-web no disponible:', error?.message || error);
    window.dispatchEvent(new CustomEvent('terminal-unavailable', {
      detail: {
        reason: error?.message || 'No se pudo inicializar ghostty-web.'
      }
    }));
  }
});
