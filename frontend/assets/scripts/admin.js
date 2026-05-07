document.addEventListener('DOMContentLoaded', () => {
  if (typeof loadHeaderFooter === 'function') {
    loadHeaderFooter();
  }

  const tokenInput = document.getElementById('adminToken');
  const bookingInput = document.getElementById('bookingCode');
  const walletInput = document.getElementById('walletAddress');
  const amountInput = document.getElementById('amountWei');
  const logPanel = document.getElementById('confirmLog');
  const statusPill = document.getElementById('confirmStatus');

  const storedToken = localStorage.getItem('adminToken');
  if (storedToken && tokenInput) {
    tokenInput.value = storedToken;
  }

  function setStatus(text, variant) {
    if (!statusPill) return;
    statusPill.textContent = text;
    statusPill.classList.toggle('neutral', variant === 'neutral');
  }

  function logLine(text) {
    if (!logPanel) return;
    const line = document.createElement('div');
    line.textContent = text;
    logPanel.appendChild(line);
    logPanel.scrollTop = logPanel.scrollHeight;
  }

  function getToken() {
    const value = tokenInput ? tokenInput.value.trim() : '';
    if (value) localStorage.setItem('adminToken', value);
    return value;
  }

  async function loadBooking() {
    const code = bookingInput ? bookingInput.value.trim() : '';
    if (!code) return logLine('Cần nhập mã đặt chỗ.');

    setStatus('đang tải', 'neutral');
    try {
      const resp = await fetch(`/api/bookings/status/${encodeURIComponent(code)}`);
      const data = await resp.json();
      if (!resp.ok || !data || !data.success) {
        throw new Error(data && data.message ? data.message : 'Không tìm thấy booking');
      }
      if (walletInput && data.booking && data.booking.wallet_address) {
        walletInput.value = data.booking.wallet_address;
      }
      logLine(`Đã tải booking ${code}. Trạng thái=${data.booking.status}`);
      setStatus('sẵn sàng', 'neutral');
    } catch (err) {
      logLine(`Tải thất bại: ${err.message || err}`);
      setStatus('lỗi', 'neutral');
    }
  }

  async function confirmPayment(mint) {
    const token = getToken();
    if (!token) return logLine('Cần nhập admin token.');

    const payload = {
      booking_code: bookingInput ? bookingInput.value.trim() : '',
      wallet_address: walletInput ? walletInput.value.trim() : '',
      amount_wei: amountInput && amountInput.value.trim() ? amountInput.value.trim() : null,
      mint: !!mint,
    };

    if (!payload.booking_code) return logLine('Cần nhập mã đặt chỗ.');

    setStatus('đang xử lý', 'neutral');
    try {
      const resp = await fetch('/api/payment/admin/confirm-onchain', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      const data = await resp.json();
      if (!resp.ok || !data.success) {
        throw new Error(data && data.message ? data.message : 'Xác nhận thất bại');
      }
      logLine(`Xác nhận thành công: amount_wei=${data.amount_wei}`);
      if (data.blockchain) {
        logLine(`Kết quả mint: ${data.blockchain.message || 'ok'}`);
      }
      setStatus('hoàn tất', 'neutral');
    } catch (err) {
      logLine(`Xác nhận thất bại: ${err.message || err}`);
      setStatus('lỗi', 'neutral');
    }
  }

  const loadBtn = document.getElementById('loadBookingBtn');
  const confirmBtn = document.getElementById('confirmBtn');
  const confirmMintBtn = document.getElementById('confirmMintBtn');

  if (loadBtn) loadBtn.addEventListener('click', loadBooking);
  if (confirmBtn) confirmBtn.addEventListener('click', () => confirmPayment(false));
  if (confirmMintBtn) confirmMintBtn.addEventListener('click', () => confirmPayment(true));

  // Chat
  const chatStream = document.getElementById('chatStream');
  const chatInput = document.getElementById('chatMessage');
  const sendChatBtn = document.getElementById('sendChatBtn');
  const socketStatus = document.getElementById('socketStatus');

  function renderChatMessage(text, sender, ts) {
    if (!chatStream) return;
    const bubble = document.createElement('div');
    bubble.className = `chat-bubble ${sender === 'admin' ? 'admin' : ''}`;

    const content = document.createElement('div');
    content.textContent = text;

    const meta = document.createElement('div');
    meta.className = 'chat-meta';
    const time = ts ? new Date(ts).toLocaleTimeString() : new Date().toLocaleTimeString();
    meta.textContent = `${sender || 'user'} • ${time}`;

    bubble.appendChild(content);
    bubble.appendChild(meta);
    chatStream.appendChild(bubble);
    chatStream.scrollTop = chatStream.scrollHeight;
  }

  async function loadHistory() {
    try {
      const resp = await fetch('/api/support/messages?after=0');
      const data = await resp.json();
      if (data && data.success && Array.isArray(data.messages)) {
        data.messages.forEach(msg => {
          renderChatMessage(msg.text, msg.sender, msg.ts);
        });
      }
    } catch (err) {
      renderChatMessage('Không tải được lịch sử.', 'system');
    }
  }

  function sendChat() {
    const text = chatInput ? chatInput.value.trim() : '';
    if (!text) return;

    if (window._adminSocket && window._adminSocket.connected) {
      window._adminSocket.emit('chat.message', { text, sender: 'admin' });
    } else {
      fetch('/api/support/message', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, sender: 'admin' })
      }).catch(() => null);
    }

    renderChatMessage(text, 'admin');
    chatInput.value = '';
  }

  if (sendChatBtn) sendChatBtn.addEventListener('click', sendChat);
  if (chatInput) {
    chatInput.addEventListener('keydown', (event) => {
      if (event.key === 'Enter') {
        event.preventDefault();
        sendChat();
      }
    });
  }

  if (typeof io !== 'undefined') {
    const socket = io(window.location.origin, { transports: ['websocket', 'polling'] });
    window._adminSocket = socket;

    socket.on('connect', () => {
      if (socketStatus) socketStatus.textContent = 'trực tuyến';
    });

    socket.on('disconnect', () => {
      if (socketStatus) socketStatus.textContent = 'ngoài tuyến';
    });

    socket.on('chat.message', (data) => {
      if (!data || !data.text) return;
      renderChatMessage(data.text, data.sender || 'user', data.ts);
    });
  }

  loadHistory();
});
