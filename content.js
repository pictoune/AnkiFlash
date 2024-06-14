console.log("content.js is loaded");

document.addEventListener('DOMContentLoaded', () => {
    const regenerateButtons = document.querySelectorAll('#regenerateFront, #regenerateBack, #regenerateMnemonic');

    if (typeof chrome !== "undefined" && chrome.runtime && chrome.runtime.getURL) {
        const iconURL = chrome.runtime.getURL('icons/refresh_logo.svg');

        regenerateButtons.forEach(button => {
            button.style.backgroundImage = `url(${iconURL})`;
            button.style.backgroundSize = '20px 20px';
            button.style.backgroundRepeat = 'no-repeat';
            button.style.backgroundPosition = 'center';
            button.style.width = '40px';
            button.style.height = '40px';
            button.style.display = 'inline-block';
            button.style.border = 'none';
            button.style.backgroundColor = 'transparent';
        });
    } else {
        console.error("chrome.runtime.getURL is not available. Ensure this script is running as part of a Chrome extension.");
    }
});

function regenerateContent(part) {
    let toastMessage = '';
    if (part === 'front') {
        toastMessage = 'Regenerating definition';
    } else if (part === 'mnemonic') {
        toastMessage = 'Regenerating mnemonic';
    }
    showToast(toastMessage, true, true);

    const reviewModal = document.getElementById('reviewModal');
    const modalBackdrop = document.getElementById('modalBackdrop');
    if (reviewModal) reviewModal.style.display = 'none';
    if (modalBackdrop) modalBackdrop.style.display = 'none';

    return fetch(`http://localhost:5001/regenerate_${part}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ currentText: document.querySelector(`#reviewModal .${part}`).textContent })
    })
    .then(response => response.json())
    .then(data => {
        document.querySelector(`#reviewModal .${part}`).textContent = data[`new_${part}`];

        if (reviewModal) reviewModal.style.display = 'block';
        if (modalBackdrop) modalBackdrop.style.display = 'block';

        removeCreationToast();
        return data[`new_${part}`];
    })
    .catch(error => {
        console.error(`Error regenerating ${part}:`, error);
        showToast("Error regenerating content. Please try again.");

        if (reviewModal) reviewModal.style.display = 'block';
        if (modalBackdrop) modalBackdrop.style.display = 'block';

        removeCreationToast();
    });
}

document.addEventListener('click', (event) => {
    if (event.target && event.target.id === 'regenerateFront') {
        regenerateContent('front');
    } else if (event.target && event.target.id === 'regenerateBack') {
        regenerateContent('back');
    } else if (event.target && event.target.id === 'regenerateMnemonic') {
        regenerateContent('mnemonic');
    }
});

let creationToast;

function showToast(message, keepOpen = false, withEllipsis = false) {
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.appendChild(toastContainer);
    }

    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = withEllipsis ? `${message}<span class="ellipsis"></span>` : message;
    if (keepOpen) toast.classList.add('no-fadeout');
    toastContainer.appendChild(toast);

    setTimeout(() => toast.classList.add('show'), 100);

    if (!keepOpen) {
        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => {
                toastContainer.removeChild(toast);
            }, 500);
        }, 3000);
    } else {
        creationToast = toast;
    }
}

function removeCreationToast(delay = 500) {
    if (creationToast) {
        creationToast.classList.remove('show');
        setTimeout(() => {
            creationToast.parentElement.removeChild(creationToast);
        }, delay);
    }
}

function fetchDecks() {
    return fetch('http://localhost:5001/get_decks')
        .then(response => response.json())
        .then(data => data)
        .catch(error => {
            console.error('Error fetching decks:', error);
            return [];
        });
}

function showDeckSelectionModal(data) {
    fetchDecks().then(decks => {
        let modalHtml;
        if (decks.length === 0) {
            modalHtml = `
                <div id="flashcardModal">
                    <h2 style="color: red;">Error</h2>
                    <p>Please ensure Anki is open and try again.</p>
                    <div style="display: flex; justify-content: center; gap: 10px;">
                        <button id="cancelButton" class="modal-button" style="background-color: #f44336;">Cancel</button>
                        <button id="retryButton" class="modal-button" style="background-color: #4CAF50;">Try again</button>
                    </div>
                </div>
                <div id="modalBackdrop" style="position: fixed; z-index: 999; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5);"></div>
            `;
        } else {
            const deckItems = decks.map(deck => `<li class="deck-item" data-deck="${deck}">${deck}</li>`).join('');
            modalHtml = `
                <div id="flashcardModal">
                    <h2>Select the deck</h2>
                    <ul id="deckList">
                        ${deckItems}
                    </ul>
                    <br><br>
                    <button id="cancelButton" class="modal-button" style="background-color: #f44336;">Cancel</button>
                </div>
                <div id="modalBackdrop" style="position: fixed; z-index: 999; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5);"></div>
            `;
        }

        document.body.insertAdjacentHTML('beforeend', modalHtml);

        if (decks.length === 0) {
            document.getElementById('retryButton').addEventListener('click', () => {
                document.getElementById('flashcardModal').remove();
                document.getElementById('modalBackdrop').remove();
                showDeckSelectionModal(data);
            });
        } else {
            document.querySelectorAll('.deck-item').forEach(item => {
                item.addEventListener('click', (event) => {
                    const selectedDeck = event.target.getAttribute('data-deck');

                    fetch('http://localhost:5001/confirm_flashcard', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({ ...data, deck: selectedDeck })
                    })
                        .then(response => response.json())
                        .then(data => {
                            showToast(`Flashcard added to Anki deck: ${selectedDeck}`);
                        })
                        .catch(error => console.error('Error confirming flashcard:', error));

                    document.getElementById('flashcardModal').remove();
                    document.getElementById('modalBackdrop').remove();
                });
            });
        }

        document.getElementById('cancelButton').addEventListener('click', () => {
            showToast("Flashcard creation canceled.");
            document.getElementById('flashcardModal').remove();
            document.getElementById('modalBackdrop').remove();
        });
    });
}

function showReviewModal(data) {
    const iconURL = chrome.runtime.getURL('icons/refresh_logo.svg');
    const modalHtml = `<div id="reviewModal">
            <h2>Review Flashcard</h2>
            <div class="section">
                <h3>Front</h3>
                <div class="sub-section-content">
                    <p class="front" style="margin: 0; text-align: center;">${data.recto}</p>
                    <button id="regenerateFront" style="background-image: url(${iconURL}); background-size: 20px 20px; background-repeat: no-repeat; background-position: center;"></button>
                </div>
            </div>
            <br>
            <div class="section">
                <h3>Back</h3>
                <div class="sub-section">
                    <h4>Definition</h4>
                    <div class="sub-section-content">
                        <p class="back" style="margin: 0; text-align: center;">${data.verso}</p>
                    </div>
                </div>
                <div class="sub-section">
                    <h4>Mnemonic</h4>
                    <div class="sub-section-content">
                        <p class="mnemonic" style="margin: 0; text-align: center;">${data.mnemonic}</p>
                        <button id="regenerateMnemonic" style="background-image: url(${iconURL}); background-size: 20px 20px; background-repeat: no-repeat; background-position: center;"></button>
                    </div>
                </div>
            </div>
            <button id="cancelReviewButton" class="modal-button" style="background-color: #f44336;">Cancel</button>
            <button id="validateButton" class="modal-button" style="background-color: #4CAF50;">Validate</button>
        </div>
    <div id="modalBackdrop" style="position: fixed; z-index: 999; left: 0; top: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5);"></div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Add event listeners for buttons
    document.getElementById('validateButton').addEventListener('click', () => {
        const updatedData = {
            recto: document.querySelector('#reviewModal .front').textContent,
            verso: document.querySelector('#reviewModal .back').textContent,
            mnemonic: document.querySelector('#reviewModal .mnemonic').textContent
        };

        document.getElementById('reviewModal').remove();
        document.getElementById('modalBackdrop').remove();
        showDeckSelectionModal(updatedData);
    });

    document.getElementById('cancelReviewButton').addEventListener('click', () => {
        document.getElementById('reviewModal').remove();
        document.getElementById('modalBackdrop').remove();
        showToast("Flashcard creation canceled.");
    });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.text) {
        showToast("Creating the flashcard", true, true); // Keep this toast open until the modal appears with ellipsis
        const model = "phi-3-mini-4k-instruct";  // Use the Phi-3-mini-4k-instruct model

        fetch('http://localhost:5001/generate_flashcard', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ word: request.text, model: model })
        })
        .then(response => {
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            return response.json();
        })
        .then(data => {
            removeCreationToast();
            showReviewModal(data);
        })
        .catch(error => {
            console.error("Error generating flashcard:", error);
            removeCreationToast(0); // Remove the creation toast in case of error
            showToast("Please make sure the desktop app is running before generating the flashcard."); // No ellipsis for this message
        });
    }
});