// content.js

// Ensure we don't register multiple listeners if injected multiple times
if (typeof window.hasSmartEmailListener === "undefined") {
    window.hasSmartEmailListener = true;

    browser.runtime.onMessage.addListener((message) => {
        if (message.command === "fillEmail") {
            fillEmailAction(message.domain, message.prefix, message.includeTld);
        }
    });

    function fillEmailAction(domain, prefix = "", includeTld = true) {
        let target = document.activeElement;

        if (target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA")) {
            // Security: Do not fill password fields
            if (target.type === "password") {
                return;
            }
            try {
                if (!domain) {
                    return;
                }

                const hostname = window.location.hostname;

                // Heuristic: Extract the main domain name (SLD) + TLD ignoring subdomains
                const parts = hostname.split(".");
                let siteIdentifier = hostname; // fallback

                if (parts.length >= 2) {
                    const tld = parts[parts.length - 1];
                    const secondLevel = parts[parts.length - 2];
                    // List of common 2-part TLD second levels
                    const commonSLDs = ["co", "com", "net", "org", "gov", "edu", "ac"];

                    if (parts.length >= 3 && tld.length === 2 && commonSLDs.includes(secondLevel)) {
                        // e.g. amazon.co.uk -> use 'amazon.co.uk' (start from 3rd from last)
                        siteIdentifier = includeTld
                            ? parts.slice(parts.length - 3).join(".")
                            : parts[parts.length - 3];
                    } else {
                        // e.g. bestsecret.com -> use 'bestsecret.com'
                        // e.g. login.bestsecret.com -> use 'bestsecret.com'
                        siteIdentifier = includeTld
                            ? parts.slice(parts.length - 2).join(".")
                            : parts[parts.length - 2];
                    }
                }

                const email = `${prefix}${siteIdentifier}@${domain}`;

                target.value = email;
                target.dispatchEvent(new Event("input", { bubbles: true }));
                target.dispatchEvent(new Event("change", { bubbles: true }));
            } catch (error) {
                // Create empty catch or minimal logging if absolutely necessary, but removing per user request
            }
        }
    }
}
