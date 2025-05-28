document.addEventListener('DOMContentLoaded', () => {
    // Create chat icon
    const chatIcon = document.createElement('div');
    chatIcon.id = 'chat-widget-icon';
    // Using a simple chat bubble SVG icon. You can replace this with an image or icon font.
    chatIcon.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" width="32px" height="32px">
            <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H6l-2 2V4h16v12z"/>
            <path d="M0 0h24v24H0z" fill="none"/>
        </svg>`;
    document.body.appendChild(chatIcon);

    // Create chat window
    const chatWindow = document.createElement('div');
    chatWindow.id = 'chat-window';
    chatWindow.innerHTML = `
        <div class="chat-window-header">
            <h3>Campus Chaos AI</h3>
            <button class="close-chat-btn" aria-label="Close chat">&times;</button>
        </div>
        <div class="chat-messages">
            <div class="chat-message ai">Hello! I'm the Campus Chaos assistant. How can I help you today?</div>
        </div>
        <div class="chat-input-area">
            <input type="text" id="chat-user-input" placeholder="Ask me anything..." aria-label="Chat input">
            <button id="chat-send-btn" aria-label="Send message">Send</button>
        </div>
    `;
    document.body.appendChild(chatWindow);

    const chatMessagesContainer = chatWindow.querySelector('.chat-messages');
    const chatUserInput = document.getElementById('chat-user-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    const closeChatBtn = chatWindow.querySelector('.close-chat-btn');

    // Toggle chat window
    chatIcon.addEventListener('click', () => {
        chatWindow.classList.toggle('open');
        if (chatWindow.classList.contains('open')) {
            chatUserInput.focus();
        }
    });

    closeChatBtn.addEventListener('click', () => {
        chatWindow.classList.remove('open');
    });

    // Send message
    chatSendBtn.addEventListener('click', handleSendMessage);
    chatUserInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) { // Send on Enter, allow Shift+Enter for newline
            e.preventDefault();
            handleSendMessage();
        }
    });

    function handleSendMessage() {
        const messageText = chatUserInput.value.trim();
        if (messageText === '') return;

        appendMessage(messageText, 'user');
        chatUserInput.value = '';
        chatUserInput.focus();

        // Placeholder for AI response
        getAIResponse(messageText);
    }

    function appendMessage(text, senderClass) {
        const messageDiv = document.createElement('div');
        messageDiv.classList.add('chat-message', senderClass);
        messageDiv.textContent = text; // Use textContent for security
        chatMessagesContainer.appendChild(messageDiv);
        chatMessagesContainer.scrollTop = chatMessagesContainer.scrollHeight; // Auto-scroll
    }

    function getPageContext() {
        let context = "";
        const pageTitle = document.title;
        if (pageTitle) {
            context += `The current page title is "${pageTitle}". `;
        }

        const h1Element = document.querySelector('h1');
        if (h1Element && h1Element.textContent) {
            context += `The main heading (H1) on the page is "${h1Element.textContent.trim()}". `;
        }

        const metaDescription = document.querySelector('meta[name="description"]');
        if (metaDescription && metaDescription.content) {
            context += `The meta description of the page is "${metaDescription.content.trim()}".`;
        }

        return context.trim();
    }

    async function getAIResponse(userMessage) {
        appendMessage("Thinking...", "ai-thinking");
        const thinkingIndicator = chatMessagesContainer.lastChild;

        const API_CHAT_URL = (window.API_URL || '/api') + '/chat-gemini';
        const pageContext = getPageContext(); 

        try {
            const response = await fetch(API_CHAT_URL, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    message: userMessage,
                    pageContext: pageContext 
                })
            });

            if (thinkingIndicator) thinkingIndicator.remove(); // Remove "Thinking..." message

            if (!response.ok) {
                // Try to parse error from backend, or use a generic message
                let errorMsg = `Error: ${response.status} ${response.statusText}`;
                try {
                    const errorData = await response.json();
                    errorMsg = errorData.reply || errorData.error || errorMsg;
                } catch (e) {
                    // Failed to parse JSON error, stick with status text
                }
                console.error('Error fetching AI response:', errorMsg);
                appendMessage(`Sorry, I encountered an issue: ${errorMsg}`, 'ai');
                return;
            }

            const data = await response.json();
            if (data.reply) {
                appendMessage(data.reply, 'ai');
            } else {
                appendMessage("Sorry, I received an unexpected response from the AI.", 'ai');
            }

        } catch (error) {
            console.error('Network or other error fetching AI response:', error);
            if (thinkingIndicator) thinkingIndicator.remove();
            appendMessage(`Sorry, I couldn't connect to the AI service. Please check your connection or try again later. (${error.message})`, 'ai');
        }
    }
});