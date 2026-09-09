const newDomainInput = document.querySelector("#newDomainInput");
const newPrefixInput = document.querySelector("#newPrefixInput");
const statusDiv = document.querySelector("#status");
const domainListContainer = document.querySelector("#domainList");
const addDomainBtn = document.querySelector("#addDomainBtn");
const includeTldToggle = document.querySelector("#includeTldToggle");

let domains = [];

function renderDomains() {
    domainListContainer.innerHTML = "";
    domains.forEach((item, index) => {
        // Fallback for legacy string data
        const domainName = item.domain || item;
        const prefixStr = item.prefix || "";

        const div = document.createElement("div");
        div.className = "domain-item";

        const text = document.createElement("span");
        text.className = "domain-text";
        text.textContent = prefixStr ? `${prefixStr}[site]@${domainName}` : `[site]@${domainName}`;

        const delBtn = document.createElement("button");
        delBtn.className = "delete-btn";
        delBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
        delBtn.addEventListener("click", () => deleteDomain(index));

        div.appendChild(text);
        div.appendChild(delBtn);
        domainListContainer.appendChild(div);
    });
}

function showStatus(msg, type = "success") {
    statusDiv.textContent = msg;
    statusDiv.style.color = type === "error" ? "#ef4444" : "#10b981";
    setTimeout(() => {
        statusDiv.textContent = "";
    }, 2000);
}

function saveDomains() {
    browser.storage.sync.set({ customDomains: domains }).then(() => {
        showStatus("Domains updated");
    });
}

function addDomain() {
    if (!newPrefixInput.checkValidity()) {
        newPrefixInput.reportValidity();
        return;
    }
    if (!newDomainInput.checkValidity()) {
        newDomainInput.reportValidity();
        return;
    }

    const domainVal = newDomainInput.value.trim();
    const prefixVal = newPrefixInput.value.trim();

    if (!domainVal) {
        showStatus("Please enter a domain", "error");
        return;
    }

    // Check for duplicates
    const exists = domains.some((d) => (d.domain || d) === domainVal);
    if (exists) {
        showStatus("Domain already exists", "error");
        return;
    }

    domains.push({ domain: domainVal, prefix: prefixVal });
    newDomainInput.value = "";
    newPrefixInput.value = "";
    renderDomains();
    saveDomains();
}

function deleteDomain(index) {
    domains.splice(index, 1);
    renderDomains();
    saveDomains();
}

function restoreOptions() {
    browser.storage.sync.get(["customDomains", "includeTld"]).then(
        (result) => {
            // Map legacy string arrays to the new object format automatically
            const rawDomains = result.customDomains || [];
            domains = rawDomains.map((d) =>
                typeof d === "string" ? { domain: d, prefix: "" } : d
            );

            includeTldToggle.checked = result.includeTld !== false;
            renderDomains();
        },
        (error) => {
            console.log(`Error: ${error}`);
        }
    );
}

function saveSettings() {
    browser.storage.sync.set({ includeTld: includeTldToggle.checked }).then(() => {
        showStatus("Settings saved");
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
addDomainBtn.addEventListener("click", addDomain);
newDomainInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addDomain();
});
includeTldToggle.addEventListener("change", saveSettings);
