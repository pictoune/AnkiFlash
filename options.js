document.addEventListener('DOMContentLoaded', () => {
    const modelInput = document.getElementById('model');
    const saveButton = document.getElementById('saveModel');

    saveButton.addEventListener('click', () => {
        const model = modelInput.value;
        chrome.storage.sync.set({ model }, () => showToast('Model name saved.'));
    });

    chrome.storage.sync.get('model', (data) => {
        modelInput.value = data.model || '';
    });
});