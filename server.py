from flask import Flask, request, jsonify
from flask_cors import CORS
from mlx_lm import load, generate
import genanki
import random
import os
import requests

app = Flask(__name__)
CORS(app)

# Load the model and tokenizer using mlx_ml
try:
    model, tokenizer = load("mlx-community/Meta-Llama-3-8B-Instruct-8bit")
except Exception as e:
    print(f"Error loading model: {e}")
    model = None
    tokenizer = None

# Generate unique IDs for model and deck
MODEL_ID = random.randrange(1 << 30, 1 << 31)
DECK_ID = random.randrange(1 << 30, 1 << 31)

# Define Anki model and deck
anki_model = genanki.Model(
    MODEL_ID,
    'Simple Model',
    fields=[
        {'name': 'Question'},
        {'name': 'Answer'},
    ],
    templates=[
        {
            'name': 'Card 1',
            'qfmt': '{{Question}}',
            'afmt': '{{FrontSide}}<hr id="answer">{{Answer}}',
        },
    ])

def add_flashcard_to_anki(definition, selection, mnemonic, deck):
    try:  
        recto = definition
        verso = f"<div style='text-align: center;'><b>Selection:</b><br>{selection}<br><br><b>Mnemonic:</b><br>{mnemonic}</div>"
        
        note = genanki.Note(
            model=anki_model,
            fields=[recto, verso]
        )
        
        anki_deck = genanki.Deck(
            DECK_ID,
            deck
        )
        
        anki_deck.add_note(note)
        print(f"Flashcard added to deck: recto='{recto}', verso='{verso}'")

        package = genanki.Package(anki_deck)
        package_path = 'output.apkg'
        package.write_to_file(package_path)
        if os.path.exists(package_path):
            print(f"output.apkg file created at {os.path.abspath(package_path)}")
        else:
            print("Failed to create output.apkg file.")
        return package_path
    except Exception as e:
        print(f"Error in add_flashcard_to_anki: {e}")
        return None
    
selected_text = ""

@app.route('/generate_flashcard', methods=['POST'])
def generate_flashcard():
    if not model or not tokenizer:
        return jsonify({'status': 'Model not loaded properly'}), 500

    data = request.get_json()
    
    global selected_text
    
    selected_text = data.get('word', '')
    
    question = (f"Create a flashcard from the following text. The response should contain exactly one part formatted as '<selected text> || <definition> || <mnemonic>'. "
              f"The first part should be the selected text exactly as it is for the back of the flashcard. "
              f"The second part should be an English definition suitable for the front of the flashcard. "
              f"The third part should be a mnemonic to help remember the word. "
              f"Ensure the response is in the correct format because it will be parsed. "
              f"Example: Real time || The period during which events occur, as opposed to after the fact or in advance. || Remember 'real' as in 'actual' time.\n"
              f"Selected text: {selected_text}. Your response will be parsed by another program so ensure there is no new line or space before or after your generated response.")

    prompt = f"<|begin_of_text|><|start_header_id|>user<|end_header_id|>" + question + "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"

    try:
        response = generate(
            model,
            tokenizer,
            prompt=prompt,
            max_tokens=100,
            verbose=True
        )

        sequences = response.strip().split('||')
        if len(sequences) == 3:
            definition = sequences[1].strip()
            reformatted_text = sequences[0].strip()
            mnemonic = sequences[2].strip()
            print(f"recto : {definition}")
            print(f"verso : {reformatted_text}")
            print(f"mnemonic : {mnemonic}")
            return jsonify({
                'recto': definition,
                'verso': reformatted_text,
                'mnemonic': mnemonic
            })

        return jsonify({'status': 'Error: Valid response not found.'}), 500

    except AttributeError as e:
        print(f"Model attribute error: {e}")
        return jsonify({'status': 'Error during generation'}), 500
    except Exception as e:
        print(f"Error during generation: {e}")
        return jsonify({'status': 'Error during generation'}), 500

@app.route('/confirm_flashcard', methods=['POST'])
def confirm_flashcard():
    data = request.get_json()
    definition = data.get('recto', '')
    selection = data.get('verso', '')
    mnemonic = data.get('mnemonic', '')
    
    deck = data.get('deck')
    print(f"Flashcard confirmed in deck: {deck}")
    
    if definition and selection and mnemonic:
        package_path = add_flashcard_to_anki(definition, selection, mnemonic, deck)
        if package_path and os.path.exists(package_path):
            abs_path = os.path.abspath(package_path)
            print(f"Importing package from {abs_path}")
            try:
                result = requests.post('http://localhost:8765', json={
                    "action": "importPackage",
                    "version": 6,
                    "params": {
                        "path": abs_path
                    }
                }).json()
                print(f"Anki-Connect response: {result}")
                if result.get('error'):
                    return jsonify({'status': f"Error importing flashcard: {result['error']}"}), 500
                else:
                    return jsonify({'status': 'Flashcard added to Anki deck.'})
            except requests.exceptions.ConnectionError as e:
                print(f"Connection error: {e}")
                return jsonify({'status': 'Connection to Anki-Connect failed.'}), 500
        else:
            return jsonify({'status': 'Failed to create output.apkg'}), 500
    else:
        return jsonify({'status': 'Invalid recto or verso.'}), 400

def get_anki_decks():
    try:
        response = requests.post('http://localhost:8765', json={
            "action": "deckNames",
            "version": 6
        })
        result = response.json()
        if result.get('error'):
            print(f"Anki error: {result['error']}")
            return []
        else:
            return result.get('result', [])
    except Exception as e:
        print(f"Error fetching Anki decks: {e}")
        return []

@app.route('/get_decks', methods=['GET'])
def get_decks():
    decks = get_anki_decks()
    return jsonify(decks)

@app.route('/regenerate_front', methods=['POST'])
def regenerate_front():
    return jsonify(new_front=regenerate_content("front"))

@app.route('/regenerate_mnemonic', methods=['POST'])
def regenerate_mnemonic():
    return jsonify(new_mnemonic=regenerate_content("mnemonic"))

def regenerate_content(part):
    if not model or not tokenizer:
        return f"Model not loaded properly"
    
    global selected_text

    print(f"selected text = {selected_text}")

    if part == "front":
        question = f"Define the term '{selected_text}' in a concise way. Your response will be parsed by another program so it must only contain the definition of the term without mentioning it. Ensure there is no new line or space before or after the definition."
    elif part == "mnemonic":
        question = f"Provide a very short mnemonic to help remember the definition of the term '{selected_text}'. Your response will be parsed by another program so it must only contain the mnemonic of the term without mentioning it. Ensure there is no new line or space before or after the mnemonic."

    prompt = "<|begin_of_text|><|start_header_id|>user<|end_header_id|>" + question + "<|eot_id|><|start_header_id|>assistant<|end_header_id|>"

    try:
        response = generate(
            model,
            tokenizer,
            prompt=prompt,
            temp=0.7,
            max_tokens=100,
            verbose=True
        )
        output = response.strip()
        print(f"New {part}: {output}")
        return output
    except Exception as e:
        print(f"Error generating new {part}: {e}")
        return f"Error generating new {part}"

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5001)