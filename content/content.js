// content.js

let lastActiveElement = null;

// Track the last focused element
document.addEventListener('focus', (event) => {
    lastActiveElement = event.target;
}, true);

document.addEventListener('contextmenu', (event) => {
    lastActiveElement = event.target;
}, true);

browser.runtime.onMessage.addListener((message) => {
    if (message.command === "fillEmail") {
        fillEmailAction(message.domain);
    }
});

function fillEmailAction(domain) {
    let target = lastActiveElement;

    if (!target || (target.tagName !== 'INPUT' && target.tagName !== 'TEXTAREA')) {
        target = document.activeElement;
    }

    if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        // Security: Do not fill password fields
        if (target.type === 'password') {
            return;
        }

        try {
            if (!domain) {
                return;
            }

            const hostname = window.location.hostname;

            // Heuristic: Extract the main domain name (SLD) + TLD ignoring subdomains
            const parts = hostname.split('.');
            let siteIdentifier = hostname; // fallback

            if (parts.length >= 2) {
                const tld = parts[parts.length - 1];
                const secondLevel = parts[parts.length - 2];
                // List of common 2-part TLD second levels
                const commonSLDs = ['co', 'com', 'net', 'org', 'gov', 'edu', 'ac'];

                if (parts.length >= 3 && tld.length === 2 && commonSLDs.includes(secondLevel)) {
                    // e.g. amazon.co.uk -> use 'amazon.co.uk' (start from 3rd from last)
                    siteIdentifier = parts.slice(parts.length - 3).join('.');
                } else {
                    // e.g. bestsecret.com -> use 'bestsecret.com'
                    // e.g. login.bestsecret.com -> use 'bestsecret.com'
                    siteIdentifier = parts.slice(parts.length - 2).join('.');
                }
            }

            const email = `${siteIdentifier}@${domain}`;

            target.value = email;
            target.dispatchEvent(new Event('input', { bubbles: true }));
            target.dispatchEvent(new Event('change', { bubbles: true }));

        } catch (error) {
            // Create empty catch or minimal logging if absolutely necessary, but removing per user request
        }
    }
}
