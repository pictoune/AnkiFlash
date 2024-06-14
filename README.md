# <img src="icons/icon.png" alt="AnkiFlash Logo" width="35"/> AnkiFlash <img src="icons/icon.png" alt="AnkiFlash Logo" width="35"/>

AnkiFlash is a Chrome extension that allows users to generate flashcards directly from selected text on a webpage and add them to Anki. This project is a functional prototype and is currently under development. There are many improvements to be made, such as making the code more robust, secure, and well-documented, as well as ensuring compatibility across different devices. Currently, it works primarily on Apple Silicon chips.

## Features

- Generate flashcards from selected text on any webpage.
- Review and edit the flashcards before adding them to Anki.
- Save flashcards to a selected Anki deck.

## Demo

[![AnkiFlash Demo](http://img.youtube.com/vi/NKN4oM2gEgc/0.jpg)](http://www.youtube.com/watch?v=NKN4oM2gEgc)

## Installation

### Prerequisites

- Chrome browser
- Anki desktop application
- Python 3.12
- Conda

### Step-by-Step Guide

#### 1. Clone the Repository
```sh
git clone https://github.com/yourusername/AnkiFlash.git
cd AnkiFlash
```
#### 2. Set Up the Python Environment

Create a conda environment using the provided environment.yaml file:
```sh
conda env create -f environment.yaml
conda activate AnkiFlash
```
#### 3. Install the Chrome Extension

1. Open Chrome and go to [chrome://extensions/](chrome://extensions/).
2. Enable "Developer mode" using the toggle in the upper right.
3. Click on "Load unpacked" and select the directory where you cloned the repository.

#### 4. Run the Python Server
```sh
python server.py
```
Make sure the server is running to handle requests from the Chrome extension.

## Usage

1. Select any text on a webpage.
2. Right-click and choose "Generate flashcard" from the context menu.
3. Review and regenerate parts of the flashcard if needed.
4. Select the Anki deck to add the flashcard to and confirm.

## Roadmap

- Improve code robustness and security.
- Add more comprehensive comments and documentation.
- Ensure compatibility across different operating systems and hardware.
- Enhance user interface and experience.
- Utilize other Large Language Models (LLMs), including those running on external APIs (e.g., ChatGPT API).
- Enable running the model directly in the browser.
- Allow manual editing of the flashcard before confirmation.
- Fetch definitions from a dictionary, reserving LLM usage for mnemonic creation.

*Note: This roadmap is not exhaustive and additional features may be considered in the future.*

## Current Supported Model

The current model used is LLaMA 3 8B Instruct. The quality of the generated responses depends on the performance of this model.

## Contributing

This project is in its early stages, and contributions are welcome. If you want to help improve AnkiFlash or have any questions, feel free to contact me via [LinkedIn](https://www.linkedin.com/in/victor-piriou/).


## License

This project is licensed under the [Creative Commons Attribution-NonCommercial 4.0 International License](https://creativecommons.org/licenses/by-nc/4.0/).


Thank you for using AnkiFlash!
