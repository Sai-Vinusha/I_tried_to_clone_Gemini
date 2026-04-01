document.addEventListener('DOMContentLoaded', () => {
    const app = document.getElementById('app');
    
    // Set app to take full width and display contents to keep body flexbox working properly
    app.style.width = '100%';
    app.style.height = '100vh';
    app.style.display = 'flex';
    app.style.justifyContent = 'center';

    // Main container
    const mainContainer = document.createElement('div');
    mainContainer.className = 'main-container';

    // Chat Container (initially hidden)
    const chatContainer = document.createElement('div');
    chatContainer.className = 'chat-container';
    chatContainer.style.display = 'none';
    chatContainer.style.width = '100%';
    chatContainer.style.maxWidth = '800px';
    chatContainer.style.flexDirection = 'column';
    chatContainer.style.gap = '20px';
    chatContainer.style.flex = '1';
    chatContainer.style.overflowY = 'auto';
    chatContainer.style.padding = '20px 0';
    chatContainer.style.scrollbarWidth = 'none';

    // Inject dynamic styles for chat bubbles
    const styleEl = document.createElement('style');
    styleEl.innerHTML = `
        .chat-container::-webkit-scrollbar { display: none; }
        .message { padding: 15px 20px; border-radius: 12px; max-width: 80%; line-height: 1.5; font-size: 16px; font-weight: 300; }
        .message-user { background-color: #e3e3e3; align-self: flex-end; border-bottom-right-radius: 4px; color: #1f1f1f; }
        .message-bot { background-color: transparent; align-self: flex-start; color: #1f1f1f; }
        .loading { font-style: italic; color: #666; }
    `;
    document.head.appendChild(styleEl);

    // Initial Elements
    const greeting = document.createElement('h1');
    greeting.className = 'greeting';
    greeting.textContent = 'Meet Class, your personal AI assistant';

    const searchContainer = document.createElement('div');
    searchContainer.className = 'search-container';
    searchContainer.style.marginTop = 'auto'; // Helps with layout shifting

    // Search Container inner elements
    const plusButton = document.createElement('button');
    plusButton.className = 'icon-button plus-button';
    plusButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M5 12H19" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'application/pdf';
    fileInput.style.display = 'none';

    const searchInput = document.createElement('input');
    searchInput.type = 'text';
    searchInput.className = 'search-input';
    searchInput.placeholder = 'Ask Class';

    const modelSelector = document.createElement('div');
    modelSelector.className = 'model-selector';
    modelSelector.innerHTML = `
        <span>Fast</span>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M6 9L12 15L18 9" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;

    const micButton = document.createElement('button');
    micButton.className = 'icon-button mic-button';
    micButton.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 2C10.34 2 9 3.34 9 5V11C9 12.66 10.34 14 12 14C13.66 14 15 12.66 15 11V5C15 3.34 13.66 2 12 2Z" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M19 10V11C19 14.87 15.87 18 12 18C8.13 18 5 14.87 5 11V10" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            <path d="M12 18V22M8 22H16" stroke="#666" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
    `;

    // Append to search container
    searchContainer.appendChild(plusButton);
    searchContainer.appendChild(fileInput);
    searchContainer.appendChild(searchInput);
    searchContainer.appendChild(modelSelector);
    searchContainer.appendChild(micButton);

    const suggestionPills = document.createElement('div');
    suggestionPills.className = 'suggestion-pills';

    const pillLabels = ['Write', 'Plan', 'Research', 'Learn'];
    pillLabels.forEach(label => {
        const pill = document.createElement('button');
        pill.className = 'pill';
        pill.textContent = label;
        pill.addEventListener('click', () => {
            searchInput.value = label;
            searchInput.focus();
            handleSend(label);
        });
        suggestionPills.appendChild(pill);
    });

    // Append everything to main container
    mainContainer.appendChild(greeting);
    mainContainer.appendChild(chatContainer); // placed between greeting and search bar
    mainContainer.appendChild(searchContainer);
    mainContainer.appendChild(suggestionPills);

    // Append main container to app
    app.appendChild(mainContainer);

    let isFirstMessage = true;

    plusButton.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Transition UI on first action
        if (isFirstMessage) {
            greeting.style.display = 'none';
            suggestionPills.style.display = 'none';
            chatContainer.style.display = 'flex';
            mainContainer.style.justifyContent = 'flex-end';
            mainContainer.style.paddingTop = '10px';
            mainContainer.style.paddingBottom = '30px';
            isFirstMessage = false;
        }

        const userMsg = document.createElement('div');
        userMsg.className = 'message message-user';
        userMsg.textContent = `Attached: ${file.name}`;
        chatContainer.appendChild(userMsg);

        const botMsg = document.createElement('div');
        botMsg.className = 'message message-bot loading';
        botMsg.textContent = 'Uploading and parsing document...';
        chatContainer.appendChild(botMsg);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        const formData = new FormData();
        formData.append('file', file);

        try {
            const res = await fetch('http://127.0.0.1:5000/api/upload', {
                method: 'POST',
                body: formData
            });
            const data = await res.json();
            
            botMsg.classList.remove('loading');
            if (data.error) {
                botMsg.textContent = 'Upload Error: ' + data.error;
                botMsg.style.color = 'red';
            } else {
                botMsg.innerHTML = `Successfully processed <b>${file.name}</b>. You can now ask questions about the document!`;
                botMsg.style.color = '#00796b';
            }
        } catch (err) {
            botMsg.classList.remove('loading');
            botMsg.textContent = 'Upload failed: ' + err.message;
            botMsg.style.color = 'red';
        }
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
        fileInput.value = ''; // Reset input
    });

    async function handleSend(text) {
        if (!text.trim()) return;

        // Transition UI on first message
        if (isFirstMessage) {
            greeting.style.display = 'none';
            suggestionPills.style.display = 'none';
            chatContainer.style.display = 'flex';
            mainContainer.style.justifyContent = 'flex-end';
            mainContainer.style.paddingTop = '10px';
            mainContainer.style.paddingBottom = '30px';
            isFirstMessage = false;
        }

        // Add user message to UI
        const userMsg = document.createElement('div');
        userMsg.className = 'message message-user';
        userMsg.textContent = text;
        chatContainer.appendChild(userMsg);
        
        searchInput.value = '';
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Add loading state
        const botMsg = document.createElement('div');
        botMsg.className = 'message message-bot loading';
        botMsg.textContent = 'Thinking...';
        chatContainer.appendChild(botMsg);
        chatContainer.scrollTop = chatContainer.scrollHeight;

        // Perform fetch to backend
        try {
            const res = await fetch('http://127.0.0.1:5000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ prompt: text })
            });

            const data = await res.json();
            
            botMsg.classList.remove('loading');
            if (data.error) {
                botMsg.textContent = 'Error: ' + data.error;
                botMsg.style.color = 'red';
            } else {
                // simple markdown parsing replace
                let formattedText = data.response
                    .replace(/\*\*(.*?)\*\*/g, '<b>$1</b>') // bold
                    .replace(/\n/g, '<br>'); // line breaks
                botMsg.innerHTML = formattedText;
            }
        } catch (err) {
            botMsg.classList.remove('loading');
            botMsg.textContent = 'Failed to fetch response: ensure the Flask backend is running on port 5000.';
            botMsg.style.color = 'red';
        }
        
        chatContainer.scrollTop = chatContainer.scrollHeight;
    }

    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleSend(searchInput.value);
        }
    });

});
