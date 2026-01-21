document.addEventListener('DOMContentLoaded', () => {
    
    // Add this new function to your script.js file
const updateUserInfo = (username) => {
    // Update username in the sidebar footer
    const usernameDisplay = document.getElementById('username-display');
    if (usernameDisplay) usernameDisplay.textContent = username;

    // Update username on the profile page card
    const profileUsernameDisplay = document.getElementById('profile-username-display');
    if (profileUsernameDisplay) profileUsernameDisplay.textContent = username;

    // Update email on the profile page card (using a placeholder format)
    const profileEmailDisplay = document.getElementById('profile-email-display');
    if (profileEmailDisplay) profileEmailDisplay.textContent = `${username.toLowerCase()}@example.com`;
};

    // --- DOM ELEMENTS ---
    const authView = document.getElementById('auth-view');
    const appView = document.getElementById('app-view');
    const loginForm = document.getElementById('login-form');
    const signupForm = document.getElementById('signup-form');
    const feedbackForm = document.getElementById('feedback-form');
    const showSignup = document.getElementById('show-signup');
    const showLogin = document.getElementById('show-login');
    const logoutBtn = document.getElementById('logout-btn');
    const usernameDisplay = document.getElementById('username-display');
    const navLinks = document.querySelectorAll('.nav-link');
    const userProfileLink = document.querySelector('.user-profile-link');
    const pages = document.querySelectorAll('.page');

    // --- UTILITY FUNCTIONS ---
    const showMessage = (elementId, text, isError = false) => {
        const el = document.getElementById(elementId);
        if (!el) return;
        el.textContent = text;
        el.className = `message ${isError ? 'error' : 'success'}`;
        setTimeout(() => el.textContent = '', 4000);
    };

    const showView = (view) => {
        authView.style.display = (view === 'auth') ? 'flex' : 'none';
        appView.style.display = (view === 'app') ? 'flex' : 'none';
    };

    const loadDashboard = async () => {
        try {
            const response = await fetch('/api/dashboard-url');
            if (!response.ok) throw new Error('Could not load dashboard URL');
            const data = await response.json();
            const iframe = document.getElementById('powerbi-iframe');
            if (iframe) iframe.src = data.url;
        } catch (error) {
            console.error('Dashboard Error:', error);
        }
    };

    // --- AUTHENTICATION LOGIC ---
    const checkUserSession = async () => {
        try {
            const response = await fetch('/api/user');
            const data = await response.json();
            if (data.loggedIn) {
                updateUserInfo(data.username);
                showView('app');
                loadDashboard();
            } else {
                showView('auth');
            }
        } catch (error) {
            console.error("Session check failed:", error);
            showView('auth');
        }
    };

    showSignup.addEventListener('click', (e) => { e.preventDefault(); loginForm.classList.remove('active'); signupForm.classList.add('active'); });
    showLogin.addEventListener('click', (e) => { e.preventDefault(); signupForm.classList.remove('active'); loginForm.classList.add('active'); });

    signupForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('signup-username').value;
        const password = document.getElementById('signup-password').value;
        const response = await fetch('/api/signup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await response.json();
        if (response.ok) {
            showMessage('signup-message', data.message);
            signupForm.reset();
            setTimeout(() => showLogin.click(), 1500);
        } else {
            showMessage('signup-message', data.message, true);
        }
    });

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('login-username').value;
        const password = document.getElementById('login-password').value;
        const response = await fetch('/api/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username, password }) });
        const data = await response.json();
        if (response.ok) {
            uupdateUserInfo(data.username);
            showView('app');
            loadDashboard();
        } else {
            showMessage('login-message', data.message, true);
        }
    });

    logoutBtn.addEventListener('click', async () => { await fetch('/api/logout', { method: 'POST' }); showView('auth'); });

    // --- APP NAVIGATION ---
    const handleNavigation = (targetId) => {
        pages.forEach(p => p.classList.remove('active'));
        navLinks.forEach(l => l.classList.remove('active'));
        const activeLink = document.querySelector(`.nav-link[href="#${targetId}"]`);
        if (activeLink) activeLink.classList.add('active');
        document.getElementById(targetId).classList.add('active');
    };
    navLinks.forEach(link => { link.addEventListener('click', (e) => { e.preventDefault(); handleNavigation(link.getAttribute('href').substring(1)); }); });
    userProfileLink.addEventListener('click', (e) => { e.preventDefault(); handleNavigation('profile'); });

    // --- FEEDBACK FORM ---
    feedbackForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const feedbackType = document.getElementById('feedback-type').value;
        const subject = document.getElementById('subject').value;
        const details = document.getElementById('details').value;
        const response = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ feedbackType, subject, details }) });
        const data = await response.json();
        if (response.ok) { showMessage('feedback-message', data.message); feedbackForm.reset(); } else { showMessage('feedback-message', data.message, true); }
    });

    // --- PROFILE PAGE TABS ---
    const tabs = document.querySelectorAll('.tab-link');
    const tabContents = document.querySelectorAll('.tab-content');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            const target = document.getElementById(tab.dataset.tab);
            tabs.forEach(t => t.classList.remove('active'));
            tabContents.forEach(tc => tc.classList.remove('active'));
            tab.classList.add('active');
            target.classList.add('active');
        });
    });

    // --- CHATBOT LOGIC ---
    const chatbotContainer = document.querySelector('.chatbot-container');
    const chatbotButton = document.getElementById('chatbot-button');
    const chatBody = document.querySelector('.chatbot-body');
    const chatInput = chatbotContainer.querySelector('input');
    const chatSendButton = chatbotContainer.querySelector('button');
    const addMessageToChat = (text, type) => {
        const msgDiv = document.createElement('div');
        msgDiv.className = `chat-message ${type}`;
        msgDiv.innerHTML = `<p>${text}</p>`;
        chatBody.appendChild(msgDiv);
        chatBody.scrollTop = chatBody.scrollHeight;
    };
    const handleSendMessage = async () => {
        const message = chatInput.value.trim();
        if (!message) return;
        addMessageToChat(message, 'user');
        chatInput.value = '';
        try {
            const response = await fetch('/api/chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ message }) });
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            addMessageToChat(data.reply, 'bot');
        } catch (error) {
            console.error('Error sending message:', error);
            addMessageToChat("Sorry, something went wrong.", 'bot');
        }
    };
    chatbotButton.addEventListener('click', () => { chatbotContainer.classList.toggle('open'); });
    chatSendButton.addEventListener('click', handleSendMessage);
    chatInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') handleSendMessage(); });

    // --- INITIAL LOAD ---
    checkUserSession();
});