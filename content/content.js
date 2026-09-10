if (typeof window.hasSmartEmailListener === "undefined") {
    window.hasSmartEmailListener = true;
    let iconElement = null;
    let activeInput = null;

    async function getStorage() {
        const { useSync } = await browser.storage.local.get("useSync");
        return useSync ? browser.storage.sync : browser.storage.local;
    }

    browser.runtime.onMessage.addListener((message) => {
        if (message.command === "fillEmail") {
            fillEmailAction(
                message.domain,
                message.prefix,
                message.includeTld,
                document.activeElement
            );
        }
    });

    document.addEventListener("focusin", (e) => {
        const target = e.target;
        if (target && target.tagName === "INPUT") {
            // Only show icon on email fields or generic text fields named like emails
            const type = target.type.toLowerCase();
            const name = (target.name || "").toLowerCase();

            if (type === "email" || name.includes("email")) {
                activeInput = target;
                showIcon(target);
            }
        }
    });

    // Hide icon when clicking away (with a slight delay so clicks on the icon register)
    document.addEventListener("focusout", (_) => {
        setTimeout(() => {
            if (iconElement && document.activeElement !== activeInput) {
                iconElement.remove();
                iconElement = null;
                activeInput = null;
            }
        }, 150);
    });

    function showIcon(inputTarget) {
        if (!iconElement) {
            iconElement = document.createElement("div");
            iconElement.className = "smart-email-icon-wrapper";

            // Handle icon click on mobile
            iconElement.addEventListener("mousedown", async (e) => {
                e.preventDefault(); // Prevent input from losing focus
                e.stopPropagation();

                const storage = await getStorage();
                const result = await storage.get(["customDomains", "includeTld"]);
                const domains = result.customDomains || [];

                if (domains.length > 0) {
                    // Mobile default: use the first configured domain in the list
                    const firstDomain = domains[0];
                    const domainName = firstDomain.domain || firstDomain;
                    const prefix = firstDomain.prefix || "";
                    const includeTld = result.includeTld !== false;

                    fillEmailAction(domainName, prefix, includeTld, inputTarget);
                }
            });
            document.body.appendChild(iconElement);
        }

        // Position the icon securely inside the right edge of the input
        const rect = inputTarget.getBoundingClientRect();
        iconElement.style.top = `${window.scrollY + rect.top + rect.height / 2 - 12}px`;
        iconElement.style.left = `${window.scrollX + rect.right - 32}px`;
    }

    function fillEmailAction(domain, prefix = "", includeTld = true, targetInput) {
        let target = targetInput || document.activeElement;

        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
            if (target.type === "password") return;

            try {
                if (!domain) return;
                const hostname = window.location.hostname;
                const parts = hostname.split(".");
                let siteIdentifier = hostname;

                if (parts.length >= 2) {
                    const tld = parts[parts.length - 1];
                    const secondLevel = parts[parts.length - 2];
                    const commonSLDs = ["co", "com", "net", "org", "gov", "edu", "ac"];

                    if (parts.length >= 3 && tld.length === 2 && commonSLDs.includes(secondLevel)) {
                        siteIdentifier = includeTld
                            ? parts.slice(parts.length - 3).join(".")
                            : parts[parts.length - 3];
                    } else {
                        siteIdentifier = includeTld
                            ? parts.slice(parts.length - 2).join(".")
                            : parts[parts.length - 2];
                    }
                }

                target.value = `${prefix}${siteIdentifier}@${domain}`;
                target.dispatchEvent(new Event("input", { bubbles: true }));
                target.dispatchEvent(new Event("change", { bubbles: true }));

                // Hide icon after filling
                if (iconElement) {
                    iconElement.remove();
                    iconElement = null;
                }
            } catch (error) {
                // Ignore silently per user request
            }
        }
    }
}
