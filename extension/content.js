const summariseUrl = 'https://us-central1-autoacess.cloudfunctions.net/summarisePage';
const altTextUrl = 'https://asia-south1-autoacess.cloudfunctions.net/altText';
const transcribeUrl = 'https://us-central1-autoacess.cloudfunctions.net/transcribeVideoFromUrl';

console.log("[AutoAccess] content.js loaded ✅");

window.__autoaccess_loaded = true;

function showSummaryPopup(summaryText, status = "loading") {
  let popup = document.getElementById("__autoaccess_popup");
  if (!popup) {
    popup = document.createElement("div");
    popup.id = "__autoaccess_popup";
    popup.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      width: 320px;
      max-height: 240px;
      z-index: 99999;
      padding: 15px 18px;
      background-color: #333;
      color: white;
      border-radius: 10px;
      font-family: sans-serif;
      box-shadow: 0 2px 12px rgba(0,0,0,0.3);
      display: flex;
      flex-direction: column;
      gap: 10px;
      overflow: hidden;
      transition: background-color 0.3s ease;
    `;
    document.body.appendChild(popup);
  }

  if (status === "done") {
    popup.style.backgroundColor = "#4CAF50";
  } else if (status === "error") {
    popup.style.backgroundColor = "#d32f2f";
  } else {
    popup.style.backgroundColor = "#333";
  }

  popup.innerHTML = `
    <div style="flex-grow:1; overflow-y:auto; white-space: pre-wrap; font-size: 13px; line-height: 1.3;">
      ${summaryText || "Processing..."}
    </div>
    <div style="text-align: right;">
      ${summaryText ? '<button id="autoaccess_speak_btn" style="background:#2196F3; border:none; color:#fff; padding:6px 12px; border-radius:5px; cursor:pointer; font-weight:600;">🔊 Speak Summary</button>' : ''}
      <button id="autoaccess_close_btn" style="background:#555; border:none; color:#fff; padding:6px 12px; border-radius:5px; cursor:pointer; margin-left: 8px;">✖ Close</button>
    </div>
  `;

  const speakBtn = document.getElementById("autoaccess_speak_btn");
  if (speakBtn) {
    speakBtn.onclick = () => {
      const utter = new SpeechSynthesisUtterance(summaryText);
      speechSynthesis.speak(utter);
    };
  }

  const closeBtn = document.getElementById("autoaccess_close_btn");
  closeBtn.onclick = () => {
    popup.remove();
  };
}

(async function () {
  const { enableSummary, enableAltText, enableTranscribe } = await chrome.storage.local.get([
    "enableSummary",
    "enableAltText",
    "enableTranscribe"
  ]);

  const pageUrl = location.href;

  // === Summarization ===
  if (enableSummary) {
    showSummaryPopup("Summarizing this page...");

    const cached = localStorage.getItem(`summary:${pageUrl}`);
    if (cached) {
      console.log("[AutoAccess] Loaded summary from cache.");
      showSummaryPopup(cached, "done");
      const utterance = new SpeechSynthesisUtterance(cached);
      speechSynthesis.speak(utterance);
    } else {
      try {
        const h1Text = Array.from(document.querySelectorAll("h1")).map(el => el.innerText.trim()).join('\n');
        const pText = Array.from(document.querySelectorAll("p")).map(el => el.innerText.trim()).join('\n');
        const metaDesc = document.querySelector('meta[name="description"]')?.getAttribute('content') || '';
        const combinedText = `${metaDesc}\n${h1Text}\n${pText}`.trim();

        const res = await fetch(summariseUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ text: combinedText })
        });

        const data = await res.json();
        console.log("[AutoAccess] Summary response:", data);

        if (data.summary) {
          localStorage.setItem(`summary:${pageUrl}`, data.summary);
          showSummaryPopup(data.summary, "done");
          const utterance = new SpeechSynthesisUtterance(data.summary);
          speechSynthesis.speak(utterance);
        } else {
          showSummaryPopup("No summary generated ❌", "error");
        }
      } catch (err) {
        console.error("[AutoAccess] Error in summarization:", err);
        showSummaryPopup("Summary failed ❌", "error");
      }
    }
  }

  // === Alt Text ===
  if (enableAltText) {
    console.log("[AutoAccess] Scanning images for alt text...");
    const images = Array.from(document.querySelectorAll("img")).filter(img => img.src);

    for (const img of images) {
      try {
        const res = await fetch(altTextUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: img.src })
        });
        const data = await res.json();
        if (data.altText) {
          img.alt = data.altText;
          img.style.border = "4px solid #4CAF50";
          img.setAttribute("data-autoaccess-alt", data.altText);
          console.log(`[AutoAccess] Alt for ${img.src}:`, data.altText);

          img.addEventListener("click", () => {
            const utter = new SpeechSynthesisUtterance(data.altText);
            speechSynthesis.speak(utter);
          });
        }
      } catch (err) {
        console.error("[AutoAccess] Error setting alt text for image:", img.src, err);
      }
    }
  }

  // === Video Transcription ===
  if (enableTranscribe) {
    const videos = Array.from(document.querySelectorAll("video"));

    for (const video of videos) {
      if (video.nextElementSibling?.classList?.contains("autoaccess-transcript")) continue;

      const source = video.querySelector("source")?.src || video.src;
      if (!source || !source.startsWith("http")) continue;

      try {
        const res = await fetch(transcribeUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ videoUrl: source })
        });

        const data = await res.json();
        if (data.transcript) {
          const transcriptBox = document.createElement("div");
          transcriptBox.className = "autoaccess-transcript";
          transcriptBox.style.cssText = `
            margin-top: 8px;
            padding: 10px;
            background: #f3f3f3;
            color: #111;
            font-size: 14px;
            border: 1px solid #ccc;
            border-radius: 6px;
            max-height: 200px;
            overflow-y: auto;
            white-space: pre-wrap;
          `;
          transcriptBox.innerText = data.transcript;
          video.insertAdjacentElement("afterend", transcriptBox);

          document.addEventListener("fullscreenchange", () => {
            if (document.fullscreenElement === video) {
              transcriptBox.style.position = "fixed";
              transcriptBox.style.bottom = "10px";
              transcriptBox.style.left = "10px";
              transcriptBox.style.right = "10px";
              transcriptBox.style.zIndex = "99999";
              transcriptBox.style.background = "rgba(0,0,0,0.7)";
              transcriptBox.style.color = "#fff";
            } else {
              transcriptBox.style.position = "";
              transcriptBox.style.background = "#f3f3f3";
              transcriptBox.style.color = "#111";
            }
          });
        }
      } catch (err) {
        console.error("[AutoAccess] Video transcription failed:", err);
      }
    }
  }
})();
