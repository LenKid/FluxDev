(function () {
  const createStateStore = (initialState = {}) => {
    const state = { ...initialState };
    const listeners = new Set();

    const snapshot = () => ({ ...state });

    const setState = (patch = {}) => {
      const prev = snapshot();
      const next = { ...state, ...patch };
      Object.keys(state).forEach((key) => {
        if (!(key in next)) {
          delete state[key];
        }
      });
      Object.entries(next).forEach(([key, value]) => {
        state[key] = value;
      });

      listeners.forEach((listener) => listener(snapshot(), prev));
    };

    const getState = () => snapshot();

    const subscribe = (listener) => {
      if (typeof listener !== 'function') {
        return () => {};
      }

      listeners.add(listener);
      return () => listeners.delete(listener);
    };

    return {
      getState,
      setState,
      subscribe,
      update: setState,
    };
  };

  window.FluxDevStateStore = {
    createStateStore,
  };
})();
