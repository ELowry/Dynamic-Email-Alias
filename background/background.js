// background.js

function onCreated() {
    if (browser.runtime.lastError) {
        // Keep internal runtime errors visible for development if needed,
        // or remove if strict "no logs" is desired.
        // Usually harmless to keep runtime.lastError check.
        console.error(`Error: ${browser.runtime.lastError}`);
    }
}

function updateContextMenus(domains) {
    browser.contextMenus.removeAll().then(() => {
        if (!domains || domains.length === 0) {
            // Show "Configure" everywhere if no domains are set
            browser.contextMenus.create(
                {
                    id: "configure-extension",
                    title: "Configure SmartEmail...",
                    contexts: ["all"]
                },
                onCreated
            );
            return;
        }

        if (domains.length === 1) {
            const d = domains[0];
            const dName = d.domain || d;
            const pName = d.prefix || "";
            browser.contextMenus.create(
                {
                    id: `fill-${dName}`,
                    title: pName
                        ? `Generate Alias (${pName}[site]@${dName})`
                        : "Generate Email Alias",
                    contexts: ["editable"]
                },
                onCreated
            );
        } else {
            const parentId = "fill-parent";
            browser.contextMenus.create(
                { id: parentId, title: "Generate Email Alias", contexts: ["editable"] },
                onCreated
            );

            domains.forEach((d) => {
                const dName = d.domain || d;
                const pName = d.prefix || "";
                browser.contextMenus.create(
                    {
                        id: `fill-${dName}`,
                        parentId: parentId,
                        title: pName ? `${pName}[site]@${dName}` : `@${dName}`,
                        contexts: ["editable"]
                    },
                    onCreated
                );
            });
        }
    }); // Errors caught silently or actionable errors only
}

function loadAndCreateMenus() {
    browser.storage.sync.get("customDomains").then((result) => {
        const domains = result.customDomains || [];
        // Migrate legacy single domain if exists and array is empty
        if (domains.length === 0) {
            browser.storage.sync.get("customDomain").then((legacyResult) => {
                if (legacyResult.customDomain) {
                    const newDomains = [{ domain: legacyResult.customDomain, prefix: "" }];
                    browser.storage.sync.set({ customDomains: newDomains });
                    updateContextMenus(newDomains);
                } else {
                    updateContextMenus([]);
                }
            });
        } else {
            updateContextMenus(domains);
        }
    });
}

// Initial load
loadAndCreateMenus();

// Listen for storage changes
browser.storage.onChanged.addListener((changes, area) => {
    if (area === "sync" && changes.customDomains) {
        updateContextMenus(changes.customDomains.newValue);
    }
});

// Ensure menus are created on install/update
browser.runtime.onInstalled.addListener(() => {
    loadAndCreateMenus();
});

browser.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "configure-extension") {
        browser.runtime.openOptionsPage();
        return;
    }

    if (info.menuItemId.startsWith("fill-")) {
        const clickedDomain = info.menuItemId.replace("fill-", "");

        browser.storage.sync.get(["customDomains", "includeTld"]).then((result) => {
            const domains = result.customDomains || [];

            // Identify the specific config object that corresponds to the clicked domain
            const matchedDomainObj = domains.find((d) => (d.domain || d) === clickedDomain);
            const prefix =
                matchedDomainObj && matchedDomainObj.prefix ? matchedDomainObj.prefix : "";

            browser.scripting
                .executeScript({
                    target: { tabId: tab.id },
                    files: ["content/content.js"]
                })
                .then(() => {
                    browser.tabs.sendMessage(tab.id, {
                        command: "fillEmail",
                        domain: clickedDomain,
                        prefix: prefix,
                        includeTld: result.includeTld !== false
                    });
                })
                .catch((error) => {
                    console.error("Failed to inject script: ", error);
                });
        });
    }
});
