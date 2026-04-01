from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS
from google import genai
import PyPDF2
import math

import os
app = Flask(__name__)
CORS(app)

@app.route('/<path:filename>')
def serve_files(filename):
    if filename.startswith('api/'):
        return "Not found", 404
    if os.path.exists(os.path.join('.', filename)):
        return send_from_directory('.', filename)
    return "Not found", 404

# Initialize the Gemini client with your provided API key
client = genai.Client(api_key="AIzaSyB3ltg_gICuvce2h73ATyI3LIeGGx6VDso")

# In-memory storage for document chunks
document_chunks = []

def cosine_similarity(v1, v2):
    dot_product = sum(x * y for x, y in zip(v1, v2))
    norm_v1 = math.sqrt(sum(x * x for x in v1))
    norm_v2 = math.sqrt(sum(y * y for y in v2))
    if norm_v1 == 0 or norm_v2 == 0:
        return 0
    return dot_product / (norm_v1 * norm_v2)

@app.route('/')
def serve_index():
    return send_from_directory('.', 'index.html')

@app.route('/api/upload', methods=['POST'])
def upload_pdf():
    global document_chunks
    if 'file' not in request.files:
        return jsonify({'error': 'No file uploaded'}), 400
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No selected file'}), 400
    
    try:
        reader = PyPDF2.PdfReader(file)
        text = ""
        for page in reader.pages:
            pg_text = page.extract_text()
            if pg_text:
                text += pg_text + "\n"
        
        if not text.strip():
            return jsonify({'error': 'No text could be extracted from the PDF.'}), 400

        # Simple overlap chunking (1000 chars roughly)
        chunks = []
        chunk_size = 1000
        overlap = 200
        for i in range(0, len(text), chunk_size - overlap):
            chunks.append(text[i:i + chunk_size])
        
        # Clear previous document
        document_chunks = []
        for chunk in chunks:
            response = client.models.embed_content(
                model='gemini-embedding-001',
                contents=chunk
            )
            embedding = response.embeddings[0].values
            document_chunks.append({
                "text": chunk,
                "embedding": embedding
            })
            
        return jsonify({'message': 'File processed successfully', 'chunks_extracted': len(document_chunks)})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/chat', methods=['POST'])
def chat():
    data = request.json
    prompt = data.get('prompt')
    if not prompt:
        return jsonify({'error': 'No prompt provided'}), 400
    
    try:
        global document_chunks
        if document_chunks:
            # Generate embedding for the prompt to find relevant chunks
            response = client.models.embed_content(
                model='gemini-embedding-001',
                contents=prompt
            )
            prompt_embedding = response.embeddings[0].values
            
            # Find the top 3 most similar chunks
            similarities = []
            for chunk in document_chunks:
                sim = cosine_similarity(prompt_embedding, chunk['embedding'])
                similarities.append((sim, chunk['text']))
                
            similarities.sort(key=lambda x: x[0], reverse=True)
            top_chunks = similarities[:3]
            
            context_text = "\n\n---\n\n".join([chunk for sim, chunk in top_chunks])
            
            # Construct the RAG prompt
            full_prompt = (
                f"You have access to the following excerpts from a document uploaded by the user.\n"
                f"DOCUMENT EXCERPTS:\n{context_text}\n\n"
                f"USER QUESTION:\n{prompt}\n\n"
                f"Please answer the user's question using the provided context."
            )
        else:
            full_prompt = prompt

        # Generate content using Gemini 2.5 Flash
        response = client.models.generate_content(
            model='gemini-2.5-flash',
            contents=full_prompt
        )
        return jsonify({'response': response.text})
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    # Running the Flask app on localhost:5000
    app.run(port=5000, debug=True)
