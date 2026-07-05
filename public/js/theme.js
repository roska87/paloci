/* Theme — light/dark toggle. The OS preference is the default; the toggle
   stamps data-theme on <html>, which the token overrides make win. */

export function initTheme() {
  const btn = document.getElementById("themebtn");
  const curDark = () => {
    const t = document.documentElement.getAttribute("data-theme");
    return t ? t === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  };
  const syncIcon = () => { btn.textContent = curDark() ? "☀" : "☾"; };
  btn.addEventListener("click", () => {
    document.documentElement.setAttribute("data-theme", curDark() ? "light" : "dark");
    syncIcon();
  });
  syncIcon();
}
