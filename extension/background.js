/**
 * Diabetes AI Extension — Background Service Worker (Manifest V3)
 * =================================================================
 * Manages extension context menus, tab listeners, and message relaying.
 */

chrome.runtime.onInstalled.addListener(() => {
    console.log("Diabetes AI Extension installed successfully.");

    // Create Context Menu for selected medical text
    chrome.contextMenus.create({
        id: "scanSelectedMedicalText",
        title: "Scan Selected Text for Diabetes Metrics",
        contexts: ["selection"]
    });
});

// Handle Context Menu clicks
chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "scanSelectedMedicalText" && info.selectionText) {
        chrome.storage.local.set({ scannedText: info.selectionText }, () => {
            console.log("Selected medical text saved to storage.");
            // Open popup action if supported
            if (chrome.action && chrome.action.openPopup) {
                chrome.action.openPopup().catch(() => {
                    // Ignore if popup cannot open programmatically
                });
            }
        });
    }
});
