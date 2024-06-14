chrome.runtime.onInstalled.addListener(() => {
    chrome.contextMenus.create({
        id: "selectText",
        title: "Generate flashcard",
        contexts: ["selection"]
    });
});

chrome.contextMenus.onClicked.addListener((info, tab) => {
    if (info.menuItemId === "selectText") {
        chrome.tabs.sendMessage(tab.id, { text: info.selectionText }, (response) => {
            if (chrome.runtime.lastError) {
                console.error(`Error sending message: ${chrome.runtime.lastError.message}`);
            } else {
                console.log(`Message sent successfully with response: ${response}`);
            }
        });
    }
});