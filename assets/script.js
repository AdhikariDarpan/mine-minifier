let filesData = [];
let currentTabId = null;
let successCounter = 0;
let failureCounter = 0;

function minifyJS(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\/|([^\\:]|^)\/\/.*$/gm, "$1")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}()<>!=+,|~^;?:-])\s*/g, "$1")
    .replace(/;}/g, "}");
}

function minifyCSS(code) {
  return code
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\s+/g, " ")
    .replace(/\s*([{}:;,])\s*/g, "$1")
    .replace(/;}/g, "}")
    .replace(/:\s+/g, ":");
}

function createTab(fileData) {
  const tabsContainer = document.getElementById("tabsContainer");
  const tabId = Date.now().toString();

  // Create tab header
  const tabHeader = document.createElement("div");
  tabHeader.className = "tab";
  tabHeader.innerHTML = `
          ${fileData.name}
          <span class="tab-close" onclick="removeTab('${tabId}')">×</span>
      `;
  tabHeader.addEventListener("click", () => showTabContent(tabId));

  // Create tab content data
  filesData.push({
    id: tabId,
    ...fileData,
    element: tabHeader,
  });

  // Update tabs container
  if (!tabsContainer.querySelector(".tab-header")) {
    tabsContainer.innerHTML = `
              <div class="tab-header"></div>
              <div class="tab-body"></div>
          `;
  }

  const headerContainer = tabsContainer.querySelector(".tab-header");
  headerContainer.appendChild(tabHeader);

  if (!currentTabId) {
    showTabContent(tabId);
  }
}

function showTabContent(tabId) {
  const fileData = filesData.find((f) => f.id === tabId);
  if (!fileData) return;

  // Update tab styling
  filesData.forEach((f) => {
    f.element.classList.remove("active");
  });
  fileData.element.classList.add("active");
  currentTabId = tabId;

  // Update content
  document.getElementById("fileStats").innerHTML =
    fileData.isAlreadyMinified
      ? `<div class="warning-message">⚠️ File is already minified</div>`
      : `Original size: ${fileData.originalSize} bytes<br>
             Minified size: ${fileData.minifiedSize} bytes<br>
             Reduction: ${fileData.reduction}%`;

  document.getElementById("output").value = fileData.minified;
}

function removeTab(tabId) {
  const index = filesData.findIndex((f) => f.id === tabId);
  if (index === -1) return;

  // Remove from DOM and array
  filesData[index].element.remove();
  filesData.splice(index, 1);

  // Show next tab if available
  if (filesData.length > 0) {
    showTabContent(filesData[0].id);
  } else {
    document.getElementById("output").value = "";
    document.getElementById("fileStats").innerHTML = "";
  }
}

async function minifyFiles() {
  const fileInput = document.getElementById("fileInput");
  if (!fileInput.files.length) {
    showAlert(`Please select files first!`,'info')
    return;
  }

  for (const file of fileInput.files) {
    // Check for duplicate file name
    if (filesData.some((f) => f.name === file.name)) {
      failureCounter += 1;
      showAlert(`File "${file.name}" is already added.`,'error')
      document.getElementById("failure-count").textContent = failureCounter;
      continue;
    }

    const reader = new FileReader();
    await new Promise((resolve) => {
      reader.onload = function (e) {
        const originalCode = e.target.result;

        // Check for empty file
        if (originalCode.trim() === "") {
          failureCounter += 1;
        showAlert(`File "${file.name}" is empty and will not be processed.`,'error')
        document.getElementById("failure-count").textContent = failureCounter;
          return resolve();
        }

        const isJS = file.name.endsWith(".js");
        const isCSS = file.name.endsWith(".css");

        if (!isJS && !isCSS) {
          failureCounter += 1;
          showAlert(`Skipped ${file.name}: Unsupported file type`,'error')
          document.getElementById("failure-count").textContent = failureCounter;
          return resolve();
        }

        successCounter += 1;
        showAlert(`File "${file.name}" is successfully added.`,'success')
        document.getElementById("success-count").textContent = successCounter;
        const minifiedCode = isJS
          ? minifyJS(originalCode)
          : minifyCSS(originalCode);
        const isAlreadyMinified = originalCode === minifiedCode;
        const originalSize = originalCode.length;
        const minifiedSize = minifiedCode.length;
        const reduction = isAlreadyMinified
          ? 0
          : Math.round((1 - minifiedSize / originalSize) * 100);

        createTab({
          name: file.name,
          original: originalCode,
          minified: minifiedCode,
          originalSize,
          minifiedSize,
          reduction,
          type: isJS ? "js" : "css",
          isAlreadyMinified,
        });

        resolve();
      };
      reader.readAsText(file);
    });
  }
  fileInput.value = "";
}

function downloadCurrentFile() {
    const fileData = filesData.find(f => f.id === currentTabId);
    if (!fileData) return;

    const isMinFile = /\.min\.(js|css)$/i.test(fileData.name);
    const fileNameParts = fileData.name.split('.');
    let baseName = fileNameParts[0];
    const extensions = fileNameParts.slice(1).join('.');
    
    // Check if filename already contains _drp
    const hasExistingDrp = baseName.includes('_drp');
    
    // Only add _drp if it doesn't already exist
    if (!hasExistingDrp) {
        baseName += '_drp';
    }

    let downloadName;

    if (!fileData.isAlreadyMinified && !isMinFile) {
        downloadName = `${baseName}.min.${fileData.type}`;
    } else {
        downloadName = `${baseName}.${extensions}`;
    }

    // Special case: Handle files that already had .min in name but weren't minified
    if (downloadName === fileData.name && !fileData.isAlreadyMinified) {
        downloadName = `${baseName}.min.${fileData.type}`;
    }

    const blob = new Blob([fileData.minified], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = downloadName;
    a.click();
    URL.revokeObjectURL(url);
}

function copyToClipboard() {
  const output = document.getElementById("output");
  output.select();
  document.execCommand("copy");
  showAlert(`Copied to clipboard!`,'info')
}

function showAlert(message, status) {
    const alertBox = document.createElement("div");
    alertBox.classList.add("custom-alert", status);
    alertBox.textContent = message;
    
    document.body.appendChild(alertBox);
    
    setTimeout(() => {
        alertBox.classList.add("show");
    }, 10);
    
    setTimeout(() => {
        const alerts = document.querySelectorAll(".custom-alert");
        if (alerts.length > 0) {
            hideAlertSequentially(Array.from(alerts).reverse());
        }
    }, 3000);
}

function hideAlertSequentially(alerts) {
    let delay = 0;
    alerts.forEach((alert, index) => {
        setTimeout(() => {
            alert.classList.remove("show");
            alert.style.opacity = "0";
            setTimeout(() => document.body.removeChild(alert), 500);
        }, delay);
        delay += 500; // Each alert hides with a 500ms delay difference
    });
}

// Add basic styles for the alert
const style = document.createElement("style");
style.textContent = `
    .custom-alert {
        position: fixed;
        bottom: 20px;
        left: -100%;
        padding: 15px 25px;
        border-radius: 8px;
        font-size: 16px;
        font-weight: bold;
        color: white;
        box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        transition: left 0.5s ease-in-out, opacity 0.5s ease-in-out;
        opacity: 1;
        z-index: 1000;
    }
    .custom-alert.show {
        left: 20px;
    }
    .success { background: #28a745; }
    .error { background: #dc3545; }
    .info { background: #17a2b8; }
`;
document.head.appendChild(style);

