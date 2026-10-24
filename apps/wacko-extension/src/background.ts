console.log("Wacko background service worker initialized");

if (typeof chrome !== "undefined" && chrome.runtime?.onInstalled) {
  chrome.runtime.onInstalled.addListener((details: any) => {
    console.log("Wacko extension installed:", details);
  });
}
