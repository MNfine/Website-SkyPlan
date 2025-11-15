// Customer Support Chat Page JavaScript

document.addEventListener('DOMContentLoaded', function () {
    initializePage();
    initializeChat();
    setupEventListeners();
});

/* =========================================================
 * 1. PAGE INIT (HEADER / FOOTER / I18N)
 * =======================================================*/

function initializePage() {
    // Header & footer thường đã được định nghĩa trong common.js
    if (typeof loadHeaderFooter === 'function') {
        loadHeaderFooter();
    } else {
        // Fallback: tự fetch nếu common.js chưa load kịp
        // Header
        fetch('components/header.html')
            .then(r => r.text())
            .then(html => {
                let headerMount = document.getElementById('header-container') || document.getElementById('header-placeholder');
                if (!headerMount) {
                    headerMount = document.createElement('div');
                    headerMount.id = 'header-container';
                    document.body.prepend(headerMount);
                }
                headerMount.innerHTML = html;
            });
        // Footer
        fetch('components/footer.html')
            .then(r => r.text())
            .then(html => {
                let footerMount = document.getElementById('footer-container') || document.getElementById('footer-placeholder');
                if (!footerMount) {
                    footerMount = document.createElement('div');
                    footerMount.id = 'footer-container';
                    document.body.appendChild(footerMount);
                }
                footerMount.innerHTML = html;
            });
    }

    // Áp dụng dịch trang support (nếu có)
    setTimeout(() => {
        if (typeof applyTranslationsForPage === 'function') {
            applyTranslationsForPage('support');
        }
    }, 300);
}

/* =========================================================
 * 2. CHAT STATE & INIT
 * =======================================================*/

// Chỉ dùng ts do server trả về, không dùng Date.now để filter
let _lastMessageTs = 0;

// Polling state
let _pollerId = null;
const POLL_INTERVAL_MS = 1500;

// Socket.IO client instance (nếu có)
let _socket = null;

// Đã render message nào (theo id) để tránh duplicate giữa polling & socket
const _renderedMessageIds = new Set();

/**
 * Khởi tạo chat UI (cuộn đáy, launcher nổi ...)
 */
function initializeChat() {
    const chatMessages = document.getElementById('chatMessages');
    const chatContainer = document.querySelector('.chat-container');

    // Auto-scroll đáy lần đầu
    if (chatMessages) {
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    // Nút launcher chat nổi (cho mobile / khi ẩn khung chat)
    if (!document.getElementById('chatLauncher')) {
        const launcher = document.createElement('button');
        launcher.id = 'chatLauncher';
        launcher.className = 'chat-launcher';
        launcher.title = 'Chat';

        launcher.innerHTML = '<i class="fas fa-comments"></i>';
        launcher.addEventListener('click', () => {
            if (chatContainer) {
                chatContainer.scrollIntoView({ behavior: 'smooth' });
            }
        });

        document.body.appendChild(launcher);
    }

    // Bắt đầu polling trước, socket sẽ tự stop polling nếu connect OK
    startMessagePolling();
    initSocketIO();
}

/* =========================================================
 * 3. POLLING API /api/support/messages
 * =======================================================*/

function startMessagePolling() {
    if (_pollerId) return;
    fetchMessages();
    _pollerId = setInterval(fetchMessages, POLL_INTERVAL_MS);
}

function stopMessagePolling() {
    if (_pollerId) {
        clearInterval(_pollerId);
        _pollerId = null;
    }
}

function fetchMessages() {
    const url = `/api/support/messages?after=${_lastMessageTs || 0}`;

    fetch(url, { credentials: 'same-origin' })
        .then(r => r.json())
        .then(json => {
            if (!json || !json.success || !Array.isArray(json.messages)) return;

            json.messages.forEach(msg => {
                const sender = (msg.sender === 'user') ? 'user' : 'bot';
                addMessage(msg.text, sender, { id: msg.id, ts: msg.ts });

                if (typeof msg.ts === 'number' && msg.ts > _lastMessageTs) {
                    _lastMessageTs = msg.ts;
                }
            });
        })
        .catch(err => {
            console.debug('[support] fetchMessages error', err);
        });
}

/* =========================================================
 * 4. GỬI MESSAGE LÊN SERVER (SOCKET ƯU TIÊN, HTTP Fallback)
 * =======================================================*/

function sendMessageToServer(text) {
    // Không gửi ts nữa, để server tự sinh ts chuẩn
    const payload = { text: text, sender: 'user' };

    // Nếu socket bật & connected → ưu tiên real-time
    try {
        if (_socket && _socket.connected) {
            console.debug('[support] sending via socket', payload);
            _socket.emit('chat.message', payload);
            // giả lập dạng response giống fetch
            return Promise.resolve({ success: true, message: 'sent-via-socket' });
        } else {
            console.debug('[support] socket not connected, will use HTTP', {
                hasSocket: !!_socket,
                connected: _socket ? _socket.connected : false
            });
        }
    } catch (e) {
        console.debug('[support] socket emit error', e);
    }

    // Fallback: HTTP POST
    return fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        credentials: 'same-origin'
    }).then(r => r.json());
}

/* =========================================================
 * 5. SOCKET.IO CLIENT
 * =======================================================*/

function initSocketIO() {
    if (_socket) return;

    if (typeof io === 'undefined') {
        console.error('[support] socket.io client not found! Make sure CDN script is loaded BEFORE support.js.');
        return;
    }

    let opts = {
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: 10,
        reconnectionDelay: 500,
        timeout: 5000
    };

    // Nếu có AuthState thì gắn token làm auth
    try {
        if (window.AuthState && typeof AuthState.getToken === 'function') {
            const token = AuthState.getToken();
            if (token) opts.auth = { token };
        }
    } catch (_) { }

    try {
        _socket = io(window.location.origin, opts);

        _socket.on('connect', () => {
            console.debug('[support] socket connected', _socket.id);
            // Khi có socket thì dừng polling tránh trùng request
            stopMessagePolling();
        });

        _socket.on('connect_error', (err) => {
            console.debug('[support] socket connect_error', err);
        });

        _socket.on('reconnect_attempt', () => {
            console.debug('[support] socket reconnect_attempt');
        });

        _socket.on('disconnect', (reason) => {
            console.debug('[support] socket disconnected', reason);
            // Mất socket → bật lại polling
            startMessagePolling();
        });

        _socket.on('chat.message', (data) => {
            try {
                if (!data || typeof data.text !== 'string') return;
                const sender = (data.sender === 'user') ? 'user' : 'bot';

                addMessage(data.text, sender, { id: data.id, ts: data.ts });

                if (typeof data.ts === 'number' && data.ts > _lastMessageTs) {
                    _lastMessageTs = data.ts;
                }
            } catch (e) {
                console.debug('[support] error handling chat.message', e);
            }
        });
    } catch (err) {
        console.debug('[support] initSocketIO error', err);
        _socket = null;
    }
}

/* =========================================================
 * 6. UI EVENT LISTENERS
 * =======================================================*/

function setupEventListeners() {
    // Chat input & send button
    const chatInput = document.getElementById('chatInput');
    const sendBtn = document.getElementById('sendBtn');

    if (chatInput && sendBtn) {
        sendBtn.addEventListener('click', handleSendMessage);

        chatInput.addEventListener('keypress', function (e) {
            if (e.key === 'Enter') {
                e.preventDefault();
                handleSendMessage();
            }
        });

        chatInput.addEventListener('input', function () {
            const isEmpty = this.value.trim() === '';
            sendBtn.disabled = isEmpty;
            sendBtn.style.opacity = isEmpty ? '0.5' : '1';
        });
    }

    // Quick reply buttons
    const quickReplyBtns = document.querySelectorAll('.quick-reply-btn');
    quickReplyBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const topic = this.getAttribute('data-topic');
            const message = this.textContent.trim();
            handleQuickReply(topic, message);
        });
    });

    // Ticket modal open/close
    const openTicketBtn = document.getElementById('openTicketBtn');
    const ticketModal = document.getElementById('ticketModal');
    const closeTicketBtn = document.querySelector('.ticket-modal-close');

    if (openTicketBtn && ticketModal) {
        openTicketBtn.addEventListener('click', () => {
            ticketModal.style.display = 'flex';
        });
    }

    if (closeTicketBtn && ticketModal) {
        closeTicketBtn.addEventListener('click', () => {
            ticketModal.style.display = 'none';
        });
    }

    if (ticketModal) {
        ticketModal.addEventListener('click', (e) => {
            if (e.target === ticketModal) {
                ticketModal.style.display = 'none';
            }
        });
    }

    // Ticket form submit
    const ticketForm = document.getElementById('ticketForm');
    if (ticketForm) {
        ticketForm.addEventListener('submit', function (e) {
            e.preventDefault();

            const email = document.getElementById('email').value.trim();
            const subject = document.getElementById('subject').value.trim();
            const message = document.getElementById('message').value.trim();

            const currentLang = getCurrentLanguage();
            const t = (window.supportTranslations && window.supportTranslations[currentLang]) || {};

            if (!email) {
                const errorText = t.emailRequiredError || 'Vui lòng nhập email';
                if (window.showToast) window.showToast(errorText, 'error'); else alert(errorText);
                return;
            }

            if (!subject) {
                const errorText = t.subjectRequiredError || 'Vui lòng nhập tiêu đề';
                if (window.showToast) window.showToast(errorText, 'error'); else alert(errorText);
                return;
            }

            if (!message) {
                const errorText = t.messageRequiredError || 'Vui lòng nhập nội dung';
                if (window.showToast) window.showToast(errorText, 'error'); else alert(errorText);
                return;
            }

            const payload = { email, subject, message };

            fetch('/api/support/ticket', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload)
            })
                .then(r => r.json())
                .then(json => {
                    if (json && json.success) {
                        const successText = t.ticketCreatedSuccess || 'Tạo yêu cầu thành công! Chúng tôi sẽ phản hồi sớm.';
                        if (window.showToast) window.showToast(successText, 'success'); else alert(successText);
                        ticketForm.reset();
                        ticketModal.style.display = 'none';
                    } else {
                        const errorText = t.ticketCreatedError || 'Không thể tạo yêu cầu lúc này. Vui lòng thử lại sau.';
                        if (window.showToast) window.showToast(errorText, 'error'); else alert(errorText);
                    }
                })
                .catch(err => {
                    console.error('[support] ticket submit error', err);
                    const errorText = t.networkError || 'Có lỗi mạng xảy ra. Vui lòng thử lại.';
                    if (window.showToast) window.showToast(errorText, 'error'); else alert(errorText);
                });
        });
    }
}

/* =========================================================
 * 7. CHAT HANDLERS (SEND / QUICK REPLY / ADD MESSAGE)
 * =======================================================*/

function handleSendMessage() {
    const chatInput = document.getElementById('chatInput');
    if (!chatInput) return;

    const message = chatInput.value.trim();

    if (message === '') {
        const currentLang = getCurrentLanguage();
        const t = (window.supportTranslations && window.supportTranslations[currentLang]) || {};
        const errorText = t.chatMessageRequiredError || 'Vui lòng nhập tin nhắn';

        if (window.showToast) window.showToast(errorText, 'error'); else alert(errorText);
        return;
    }

    // Render local message ngay lập tức, KHÔNG truyền ts/id để không bị dedup chặn
    addMessage(message, 'user');

    // Clear input + disable send trong lúc chờ
    chatInput.value = '';
    const sendBtn = document.getElementById('sendBtn');
    if (sendBtn) {
        sendBtn.disabled = true;
        sendBtn.style.opacity = '0.5';
    }

    sendMessageToServer(message)
        .catch(err => {
            console.debug('[support] sendMessage error', err);
        })
        .finally(() => {
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.style.opacity = '1';
            }
        });
}

/**
 * Quick reply: hiển thị message user + trả lời bot đơn giản (FE side)
 */
function handleQuickReply(topic, message) {
    addMessage(message, 'user');

    const currentLang = getCurrentLanguage();
    let botResponse = '';

    if (topic === 'booking') {
        botResponse = currentLang === 'en'
            ? 'To book a flight, please provide your departure, destination, date, and number of passengers. I can guide you through each step.'
            : 'Để đặt vé, bạn vui lòng cung cấp điểm khởi hành, điểm đến, ngày bay và số lượng hành khách. Tôi có thể hướng dẫn bạn từng bước.';
    } else if (topic === 'cancel') {
        botResponse = currentLang === 'en'
            ? 'To cancel a booking, please provide your booking code and passenger name. Note that cancellation fees may apply depending on the fare conditions.'
            : 'Để hủy vé, bạn vui lòng cung cấp mã đặt chỗ và tên hành khách. Lưu ý có thể áp dụng phí hủy tùy theo điều kiện vé.';
    } else if (topic === 'payment') {
        botResponse = currentLang === 'en'
            ? 'We support multiple payment methods including credit cards and e-wallets. If you have trouble with a payment, please share the error message so we can assist you.'
            : 'Chúng tôi hỗ trợ nhiều phương thức thanh toán như thẻ tín dụng và ví điện tử. Nếu bạn gặp lỗi khi thanh toán, hãy gửi nội dung lỗi để chúng tôi hỗ trợ.';
    } else if (topic === 'baggage') {
        botResponse = currentLang === 'en'
            ? 'Baggage allowance depends on your ticket type and route. Please tell me your route and ticket type so I can check the exact allowance for you.'
            : 'Hạn mức hành lý phụ thuộc vào loại vé và chặng bay. Hãy cho tôi biết hành trình và loại vé của bạn để tôi kiểm tra chính xác.';
    } else {
        botResponse = currentLang === 'en'
            ? 'Hello! I\'m here to help you with any questions about SkyPlan services. What can I assist you with today?'
            : 'Xin chào! Tôi ở đây để giúp bạn với bất kỳ câu hỏi nào về dịch vụ SkyPlan. Hôm nay tôi có thể hỗ trợ gì cho bạn?';
    }

    addMessage(botResponse, 'bot');
}

/**
 * Thêm 1 message vào khung chat
 * options: { id, ts } là dữ liệu từ server (có thể thiếu)
 */
function addMessage(message, sender, options = {}) {
    const { id, ts } = options || {};

    // Dedup theo id từ server: nếu id đã render rồi thì bỏ qua
    if (id && _renderedMessageIds.has(id)) return;
    if (id) _renderedMessageIds.add(id);

    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

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

    // Hiệu ứng nhỏ cho đẹp
    messageDiv.style.opacity = '0';
    messageDiv.style.transform = 'translateY(10px)';
    requestAnimationFrame(() => {
        messageDiv.style.transition = 'all 0.3s ease';
        messageDiv.style.opacity = '1';
        messageDiv.style.transform = 'translateY(0)';
    });

    // Cập nhật _lastMessageTs nếu server có gửi ts (cho trường hợp addMessage được gọi từ polling/socket)
    if (typeof ts === 'number' && ts > _lastMessageTs) {
        _lastMessageTs = ts;
    }
}

/* =========================================================
 * 8. LANGUAGE HELPER
 * =======================================================*/

function getCurrentLanguage() {
    try {
        if (window.currentLanguage) return window.currentLanguage;
        const stored = localStorage.getItem('skyplan_lang');
        if (stored) return stored;
    } catch (_) { }
    return 'vi';
}
