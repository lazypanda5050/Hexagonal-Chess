(function () {
    const script = document.createElement('script');
    // Use an explicit file path so the sourcemap resolves correctly.
    script.src = "https://cdn.jsdelivr.net/npm/eruda@3.4.1/eruda.js";
    document.body.append(script);
    script.onload = function () {
        globalThis.eruda?.init?.();
    };
})();