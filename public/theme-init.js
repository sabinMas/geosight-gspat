(function () {
  try {
    var m = localStorage.getItem("geosight.theme-mode.v1");
    var t =
      m === "light"
        ? "light"
        : m === "system"
          ? window.matchMedia("(prefers-color-scheme: light)").matches
            ? "light"
            : "dark"
          : "dark";
    document.documentElement.dataset.theme = t;
    document.documentElement.style.colorScheme = t;
  } catch (e) {}
})();
