// Customer Support Chat Page JavaScript

document.addEventListener('DOMContentLoaded', function() {
    // Initialize page
    initializePage();
    initializeChat();
    setupEventListeners();
});

// Initialize page functionality
function initializePage() {
    // Load header and footer
    loadHeaderFooter();
    
    // Apply translations
    setTimeout(() => {
        applySupportTranslations();
    }, 100);
}

// Load header and footer components
function loadHeaderFooter() {
    // Load header
    fetch('components/header.html')
        .then(response => response.text())
        .then(data => {
            const headerMount = document.getElementById('header-container') || document.getElementById('header-placeholder');
            if (headerMount) headerMount.innerHTML = data;
            // Initialize header behaviors: language + mobile menu
            if (typeof initializeLanguageSelector === 'function') initializeLanguageSelector();
            if (typeof initializeMobileMenu === 'function') initializeMobileMenu();
            const lang = getCurrentLanguage();
            if (typeof updateSelectedLanguage === 'function') updateSelectedLanguage(lang);
        });

    // Load footer
    fetch('components/footer.html')
        .then(response => response.text())
        .then(data => {
            const footerMount = document.getElementById('footer-container') || document.getElementById('footer-placeholder');
            if (footerMount) footerMount.innerHTML = data;
        });
}

// Initialize chat functionality
function initializeChat() {
    const chatMessages = document.getElementById('chatMessages');
    const chatContainer = document.querySelector('.chat-container');
    
    // Auto-scroll to bottom
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Create floating chat launcher (hidden by default when chat visible)
    if (!document.getElementById('chatLauncher')) {
        const launcher = document.createElement('button');
        launcher.id = 'chatLauncher';
        launcher.className = 'chat-launcher';
        launcher.title = 'Chat';
        launcher.innerHTML = '<i class="fas fa-headset"></i>';
        launcher.addEventListener('click', () => {
            if (chatContainer) {
                chatContainer.classList.remove('hidden');
                chatContainer.classList.remove('collapsed');
                launcher.classList.add('hidden');
            }
        });
        document.body.appendChild(launcher);
    }
}

// Setup event listeners
function setupEventListeners() {
    // Chat input and send button
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');
    
    if (chatInput && sendBtn) {
        // Send message on button click
        sendBtn.addEventListener('click', handleSendMessage);
        
        // Send message on Enter key
        chatInput.addEventListener('keypress', function(e) {
            if (e.key === 'Enter') {
                handleSendMessage();
            }
        });
        
        // Auto-resize input and enable/disable send button
        chatInput.addEventListener('input', function() {
            const isEmpty = this.value.trim() === '';
            sendBtn.disabled = isEmpty;
            sendBtn.style.opacity = isEmpty ? '0.5' : '1';
        });
    }
    
    // Quick reply buttons
    const quickReplyBtns = document.querySelectorAll('.quick-reply-btn');
    quickReplyBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const topic = this.getAttribute('data-topic');
            const message = this.textContent.trim();
            handleQuickReply(topic, message);
        });
    });
    
    // Action buttons
    const actionBtns = document.querySelectorAll('.action-btn');
    const chatContainer = document.querySelector('.chat-container');
    actionBtns.forEach(btn => {
        btn.addEventListener('click', function() {
            const icon = this.querySelector('i');
            if (!chatContainer) return;
            if (icon.classList.contains('fa-minus')) {
                // Toggle collapsed state
                chatContainer.classList.toggle('collapsed');
            } else if (icon.classList.contains('fa-times')) {
                // Hide chat and show launcher
                chatContainer.classList.add('hidden');
                const launcher = document.getElementById('chatLauncher');
                if (launcher) launcher.classList.remove('hidden');
            }
        });
    });

    // Ticket modal events
    const openTicketBtn = document.getElementById('openTicketBtn');
    const ticketModal = document.getElementById('ticketModal');
    const closeTicketBtn = document.getElementById('closeTicketBtn');
    const cancelTicketBtn = document.getElementById('cancelTicketBtn');
    const ticketForm = document.getElementById('ticketForm');

    if (openTicketBtn && ticketModal) {
        openTicketBtn.addEventListener('click', () => {
            ticketModal.classList.remove('hidden');
            document.body.classList.add('no-scroll');
        });
    }
    const closeModal = () => {
        if (ticketModal) ticketModal.classList.add('hidden');
        document.body.classList.remove('no-scroll');
    };
    if (closeTicketBtn) closeTicketBtn.addEventListener('click', closeModal);
    if (cancelTicketBtn) cancelTicketBtn.addEventListener('click', closeModal);
    if (ticketModal) {
        ticketModal.addEventListener('click', (e) => {
            if (e.target === ticketModal) closeModal();
        });
    }
    if (ticketForm) {
        ticketForm.addEventListener('submit', (e) => {
            e.preventDefault();
            const email = document.getElementById('email').value.trim();
            const subject = document.getElementById('subject').value.trim();
            const message = document.getElementById('message').value.trim();
            
            // Get current language and translations
            const currentLang = getCurrentLanguage();
            const t = (window.supportTranslations && window.supportTranslations[currentLang]) || {};
            
            // Validation with toast notifications
            if (!email) {
                const errorText = t.emailRequiredError || 'Vui lòng nhập email';
                if (window.showToast) {
                    window.showToast(errorText, 'error');
                } else {
                    alert(errorText);
                }
                return;
            }
            
            if (!subject) {
                const errorText = t.subjectRequiredError || 'Vui lòng nhập tiêu đề';
                if (window.showToast) {
                    window.showToast(errorText, 'error');
                } else {
                    alert(errorText);
                }
                return;
            }
            
            if (!message) {
                const errorText = t.messageRequiredError || 'Vui lòng nhập nội dung';
                if (window.showToast) {
                    window.showToast(errorText, 'error');
                } else {
                    alert(errorText);
                }
                return;
            }
            
            // Email format validation
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                const errorText = t.emailFormatError || 'Email không hợp lệ';
                if (window.showToast) {
                    window.showToast(errorText, 'error');
                } else {
                    alert(errorText);
                }
                return;
            }
            // Simulate submit
            try {
                const payload = {
                    category: document.getElementById('ticketCategory').value,
                    bookingCode: document.getElementById('bookingCode').value.trim(),
                    email,
                    subject,
                    message,
                    createdAt: new Date().toISOString(),
                };
                localStorage.setItem('lastSupportTicket', JSON.stringify(payload));
            } catch (_) {}
            // Toast success
            const lang = getCurrentLanguage();
            const translations = (window.supportTranslations && window.supportTranslations[lang]) || {};
            const successText = translations.ticketSubmitSuccess || 'Đã gửi yêu cầu hỗ trợ. Chúng tôi sẽ liên hệ sớm!';
            if (window.showToast) {
                window.showToast(successText, 'success');
            } else {
                alert(successText);
            }
            // Reset and close
            ticketForm.reset();
            closeModal();
        });
    }
}

// Handle sending message
function handleSendMessage() {
    const chatInput = document.getElementById('chatInput');
    const message = chatInput.value.trim();
    
    if (message === '') {
        // Get current language and translations
        const currentLang = getCurrentLanguage();
        const t = (window.supportTranslations && window.supportTranslations[currentLang]) || {};
        const errorText = t.chatMessageRequiredError || 'Vui lòng nhập tin nhắn';
        
        if (window.showToast) {
            window.showToast(errorText, 'error');
        } else {
            alert(errorText);
        }
        return;
    }
    
    // Add user message
    addMessage(message, 'user');
    
    // Clear input
    chatInput.value = '';
    
    // Disable send button
    const sendBtn = document.getElementById('sendBtn');
    sendBtn.disabled = true;
    sendBtn.style.opacity = '0.5';
    
    // Simulate bot response
    setTimeout(() => {
        handleBotResponse(message);
    }, 1000 + Math.random() * 2000); // Random delay 1-3 seconds
}

// Handle quick reply
function handleQuickReply(topic, message) {
    // Add user message
    addMessage(message, 'user');
    
    // Generate appropriate bot response
    setTimeout(() => {
        let botResponse = '';
        const currentLang = getCurrentLanguage();
        
        switch(topic) {
            case 'booking':
                botResponse = currentLang === 'en' ? 
                    'I can help you with booking. What specific information do you need about booking flights?' :
                    'Tôi có thể giúp bạn về việc đặt vé. Bạn cần thông tin gì cụ thể về đặt vé máy bay?';
                break;
            case 'cancel':
                botResponse = currentLang === 'en' ?
                    'For cancellations, you can go to "My Trips" section. Would you like me to guide you through the process?' :
                    'Để hủy vé, bạn có thể vào mục "Chuyến bay của tôi". Bạn có muốn tôi hướng dẫn quy trình không?';
                break;
            case 'payment':
                botResponse = currentLang === 'en' ?
                    'We accept various payment methods including credit cards, VNPay, MoMo, and bank transfer. What payment issue are you experiencing?' :
                    'Chúng tôi hỗ trợ nhiều phương thức thanh toán như thẻ tín dụng, VNPay, MoMo, chuyển khoản. Bạn gặp vấn đề gì về thanh toán?';
                break;
            case 'baggage':
                botResponse = currentLang === 'en' ?
                    'For baggage information: Carry-on max 7kg, checked baggage can be purchased additionally. What baggage question do you have?' :
                    'Thông tin hành lý: Xách tay tối đa 7kg, hành lý ký gửi có thể mua thêm. Bạn có câu hỏi gì về hành lý?';
                break;
            default:
                botResponse = currentLang === 'en' ?
                    'I\'m here to help! Please let me know what specific assistance you need.' :
                    'Tôi ở đây để giúp bạn! Hãy cho tôi biết bạn cần hỗ trợ gì cụ thể.';
        }
        
        addMessage(botResponse, 'bot');
    }, 1500);
}

// Handle bot response
function handleBotResponse(userMessage) {
    const lowerMessage = userMessage.toLowerCase();
    const currentLang = getCurrentLanguage();
    let botResponse = '';
    
    // Simple keyword-based responses
    if (lowerMessage.includes('đặt vé') || lowerMessage.includes('booking') || lowerMessage.includes('book')) {
        botResponse = currentLang === 'en' ?
            'To book a flight, please visit our homepage and enter your travel details. I can also help you with specific booking questions.' :
            'Để đặt vé, bạn vào trang chủ và nhập thông tin chuyến bay. Tôi cũng có thể giúp trả lời các câu hỏi cụ thể về đặt vé.';
    } else if (lowerMessage.includes('hủy') || lowerMessage.includes('cancel')) {
        botResponse = currentLang === 'en' ?
            'You can cancel your booking in the "My Trips" section. Cancellation fees may apply depending on your ticket type.' :
            'Bạn có thể hủy vé trong mục "Chuyến bay của tôi". Phí hủy có thể áp dụng tùy theo loại vé.';
    } else if (lowerMessage.includes('thanh toán') || lowerMessage.includes('payment') || lowerMessage.includes('pay')) {
        botResponse = currentLang === 'en' ?
            'We accept credit cards, VNPay, MoMo, ZaloPay, and bank transfers. Is there a specific payment issue I can help with?' :
            'Chúng tôi hỗ trợ thẻ tín dụng, VNPay, MoMo, ZaloPay, và chuyển khoản. Có vấn đề thanh toán nào tôi có thể giúp?';
    } else if (lowerMessage.includes('hành lý') || lowerMessage.includes('baggage') || lowerMessage.includes('luggage')) {
        botResponse = currentLang === 'en' ?
            'Carry-on baggage: max 7kg. You can purchase additional checked baggage during booking or later in My Trips.' :
            'Hành lý xách tay: tối đa 7kg. Bạn có thể mua thêm hành lý ký gửi khi đặt vé hoặc sau đó trong Chuyến bay của tôi.';
    } else if (lowerMessage.includes('check-in') || lowerMessage.includes('checkin')) {
        botResponse = currentLang === 'en' ?
            'Online check-in is available 24 hours before departure. You can select seats and download your boarding pass.' :
            'Check-in online mở 24 tiếng trước giờ bay. Bạn có thể chọn ghế và tải boarding pass.';
    } else if (lowerMessage.includes('xin chào') || lowerMessage.includes('hello') || lowerMessage.includes('hi')) {
        botResponse = currentLang === 'en' ?
            'Hello! I\'m here to help you with any questions about SkyPlan services. What can I assist you with today?' :
            'Xin chào! Tôi ở đây để giúp bạn với bất kỳ câu hỏi nào về dịch vụ SkyPlan. Hôm nay tôi có thể hỗ trợ gì cho bạn?';
    } else {
        // Generic response
        botResponse = currentLang === 'en' ?
            'Thank you for your message. Our customer service team will be with you shortly. Is there anything specific I can help you with right now?' :
            'Cảm ơn tin nhắn của bạn. Đội ngũ chăm sóc khách hàng sẽ liên hệ với bạn sớm. Có điều gì cụ thể tôi có thể giúp bạn ngay bây giờ không?';
    }
    
    addMessage(botResponse, 'bot');
}

// Add message to chat
function addMessage(message, sender) {
    const chatMessages = document.getElementById('chatMessages');
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${sender}-message`;
    
    const currentTime = new Date().toLocaleTimeString('vi-VN', { 
        hour: '2-digit', 
        minute: '2-digit' 
    });
    
    const avatarIcon = sender === 'bot' ? 'fas fa-robot' : 'fas fa-user';
    
    messageDiv.innerHTML = `
        <div class="message-avatar">
            <i class="${avatarIcon}"></i>
        </div>
        <div class="message-content">
            <span>${message}</span>
            <div class="message-time">${currentTime}</div>
        </div>
    `;
    
    chatMessages.appendChild(messageDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
    
    // Add subtle animation
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
    setTimeout(() => {
        messageDiv.style.transition = 'all 0.3s ease';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    }, 100);
}

// Apply support page translations
function applySupportTranslations() {
    if (typeof window.supportTranslations === 'undefined') return;
    
    const currentLang = getCurrentLanguage();
    const translations = window.supportTranslations[currentLang];
    
    if (!translations) return;
    
    // Update document title (use meta key distinct from footer's supportTitle)
    if (translations.supportMetaTitle) {
        document.title = translations.supportMetaTitle;
    }
    
    // Apply translations to elements with data-i18n
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        if (translations[key]) {
            if ((element.tagName === 'INPUT' && (element.type === 'text' || element.type === 'email')) || element.tagName === 'TEXTAREA') {
                element.placeholder = translations[key];
            } else {
                element.textContent = translations[key];
            }
        }
    });
}

// Get current language
function getCurrentLanguage() {
    // Use the same key across the site for consistency
    return localStorage.getItem('preferredLanguage') || document.documentElement.lang || 'vi';
}

// Listen for language changes
document.addEventListener('languageChanged', function(e) {
    applySupportTranslations();
    
    // Update existing bot messages with new language context
    const existingMessages = document.querySelectorAll('.bot-message .message-content span');
    existingMessages.forEach((msgElement, index) => {
        if (index === 0) { // First message is welcome message
            const currentLang = getCurrentLanguage();
            const welcomeKey = 'welcomeMessage';
            if (window.supportTranslations && window.supportTranslations[currentLang] && window.supportTranslations[currentLang][welcomeKey]) {
                msgElement.textContent = window.supportTranslations[currentLang][welcomeKey];
            }
        }
    });
});

// Provide a generic changeLanguage hook so common.js can call it
// This stores preference and reapplies translations on this page.
window.changeLanguage = function(lang) {
    try {
        localStorage.setItem('preferredLanguage', lang);
    } catch (_) {}
    // Update any header language UI if present
    if (typeof updateSelectedLanguage === 'function') {
        updateSelectedLanguage(lang);
    }
    // Re-apply translations and notify listeners
    applySupportTranslations();
    const evt = new CustomEvent('languageChanged', { detail: { lang } });
    document.dispatchEvent(evt);
};