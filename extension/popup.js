document.getElementById("enableSummary").addEventListener("change", (e) => {
  chrome.storage.local.set({ enableSummary: e.target.checked });
});

document.getElementById("enableAltText").addEventListener("change", (e) => {
  chrome.storage.local.set({ enableAltText: e.target.checked });
});

document.getElementById("enableTranscribe").addEventListener("change", (e) => {
  chrome.storage.local.set({ enableTranscribe: e.target.checked });
});

chrome.storage.local.get(["enableSummary", "enableAltText", "enableTranscribe"], (data) => {
  document.getElementById("enableSummary").checked = data.enableSummary || false;
  document.getElementById("enableAltText").checked = data.enableAltText || false;
  document.getElementById("enableTranscribe").checked = data.enableTranscribe || false;
});
