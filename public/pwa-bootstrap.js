// Capture install availability before the React bundle finishes loading.
window.addEventListener('beforeinstallprompt', function (event) {
  event.preventDefault();
  window.__mySCPInstallPrompt = event;
  window.dispatchEvent(new Event('myscp-install-ready'));
});
window.addEventListener('appinstalled', function () {
  window.__mySCPInstallPrompt = undefined;
  window.__mySCPInstalled = true;
});
