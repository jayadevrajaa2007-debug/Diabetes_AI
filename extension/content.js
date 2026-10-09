/**
 * Diabetes AI Extension — Content Script
 * ========================================
 * Listens for requests from popup to extract text from open DOM or PDF views.
 */

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "extractPageText") {
        const pageText = document.body ? document.body.innerText : "";
        sendResponse({ text: pageText, title: document.title, url: window.location.href });
    }
    return true;
});
