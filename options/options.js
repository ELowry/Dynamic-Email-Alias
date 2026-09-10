const newDomainInput = document.querySelector("#newDomainInput");
const statusDiv = document.querySelector("#status");
const domainListContainer = document.querySelector("#domainList");
const addDomainBtn = document.querySelector("#addDomainBtn");
const useSyncToggle = document.querySelector("#useSyncToggle");

let domains = [];

async function getStorage() {
    const { useSync } = await browser.storage.local.get("useSync");
    return useSync ? browser.storage.sync : browser.storage.local;
}

function renderDomains() {
    domainListContainer.innerHTML = "";
    domains.forEach((domain, index) => {
        const item = document.createElement("div");
        item.className = "domain-item";

        const text = document.createElement("span");
        text.className = "domain-text";
        text.textContent = domain;

        const delBtn = document.createElement("button");
        delBtn.className = "delete-btn";
        delBtn.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
    `;
        delBtn.addEventListener("click", () => deleteDomain(index));

        item.appendChild(text);
        item.appendChild(delBtn);
        domainListContainer.appendChild(item);
    });
}

function showStatus(msg, type = "success") {
    statusDiv.textContent = msg;
    statusDiv.style.color = type === "error" ? "#ef4444" : "#10b981";
    setTimeout(() => {
        statusDiv.textContent = "";
    }, 2000);
}

async function saveDomains() {
    const storage = await getStorage();
    storage
        .set({
            customDomains: domains
        })
        .then(() => {
            showStatus("Domains updated");
        });
}

function addDomain() {
    const domain = newDomainInput.value.trim();
    if (!domain) {
        showStatus("Please enter a domain", "error");
        return;
    }

    if (domains.includes(domain)) {
        showStatus("Domain already exists", "error");
        return;
    }

    domains.push(domain);
    newDomainInput.value = "";
    renderDomains();
    saveDomains();
}

function deleteDomain(index) {
    domains.splice(index, 1);
    renderDomains();
    saveDomains();
}

async function restoreOptions() {
    // Restore the toggle state strictly from local storage
    const localPrefs = await browser.storage.local.get("useSync");
    if (useSyncToggle) {
        useSyncToggle.checked = !!localPrefs.useSync;
    }

    const storage = await getStorage();
    storage.get("customDomains").then(
        (result) => {
            domains = result.customDomains || [];
            renderDomains();
        },
        (error) => {
            console.log(`Error: ${error}`);
        }
    );
}

if (useSyncToggle) {
    useSyncToggle.addEventListener("change", async (e) => {
        const enableSync = e.target.checked;

        const oldStorage = enableSync ? browser.storage.local : browser.storage.sync;
        const newStorage = enableSync ? browser.storage.sync : browser.storage.local;

        const allData = await oldStorage.get(null);

        delete allData.useSync;

        if (Object.keys(allData).length > 0) {
            await newStorage.set(allData);

            const keysToRemove = Object.keys(allData);
            await oldStorage.remove(keysToRemove);
        }

        await browser.storage.local.set({ useSync: enableSync });

        showStatus(enableSync ? "Sync enabled" : "Sync disabled");
    });
}

document.addEventListener("DOMContentLoaded", restoreOptions);
addDomainBtn.addEventListener("click", addDomain);
newDomainInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") addDomain();
});
