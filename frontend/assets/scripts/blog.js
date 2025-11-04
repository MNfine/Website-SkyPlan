// Blog Page Logic and AI Chat
// This file handles blog interactions and AI chat functionality

// Blog State
let currentCategory = 'all';
let currentPage = 1;
const postsPerPage = 6;
let searchQuery = '';

// Get current language
const getCurrentLang = () => localStorage.getItem('preferredLanguage') || 'vi';

// Get translations
const getTranslations = () => {
    const lang = getCurrentLang();
    return window.blogTranslations?.[lang] || window.blogTranslations?.vi || {};
};

// Initialize Blog
function initBlog() {
    renderBlogPosts();
    initCategoryFilters();
    initSearch();
    initPagination();
    initChatModal();
}

// Render Blog Posts
function renderBlogPosts() {
    const blogGrid = document.getElementById('blogGrid');
    if (!blogGrid) return;

    const translations = getTranslations();
    const postsData = window.blogPostsData || [];
    const lang = getCurrentLang();
    
    // Filter posts
    let filteredPosts = postsData.filter(post => {
        const postInfo = translations.posts?.[post.id];
        if (!postInfo) return false;
        
        // Category filter
        if (currentCategory !== 'all' && postInfo.category !== currentCategory) {
            return false;
        }
        
        // Search filter
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const titleMatch = postInfo.title.toLowerCase().includes(searchLower);
            const excerptMatch = postInfo.excerpt.toLowerCase().includes(searchLower);
            return titleMatch || excerptMatch;
        }
        
        return true;
    });

    // Pagination
    const totalPages = Math.ceil(filteredPosts.length / postsPerPage);
    const startIndex = (currentPage - 1) * postsPerPage;
    const endIndex = startIndex + postsPerPage;
    const paginatedPosts = filteredPosts.slice(startIndex, endIndex);

    // Render
    if (paginatedPosts.length === 0) {
        blogGrid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem;">
                <i class="fas fa-search" style="font-size: 3rem; color: #cbd5e0; margin-bottom: 1rem;"></i>
                <p style="font-size: 1.125rem; color: #718096;">
                    ${lang === 'vi' ? 'Không tìm thấy bài viết nào' : 'No posts found'}
                </p>
            </div>
        `;
        updatePagination(0, 0);
        return;
    }

    blogGrid.innerHTML = paginatedPosts.map(post => {
        const postInfo = translations.posts[post.id];
        const categoryName = translations[postInfo.category] || postInfo.category;
        
        return `
            <article class="blog-card" data-post-id="${post.id}">
                <img src="${post.image}" alt="${postInfo.title}" class="blog-image" loading="lazy" onerror="this.src='assets/images/placeholder.jpg'">
                <div class="blog-card-body">
                    <span class="blog-category">${categoryName}</span>
                    <h3 class="blog-title">${postInfo.title}</h3>
                    <p class="blog-excerpt">${postInfo.excerpt}</p>
                    <div class="blog-meta">
                        <span class="blog-date">
                            <i class="far fa-calendar-alt"></i>
                            ${formatDate(post.date, lang)}
                        </span>
                        <span class="blog-read-time">
                            <i class="far fa-clock"></i>
                            ${post.readTime} ${translations.readTime || 'min'}
                        </span>
                    </div>
                </div>
            </article>
        `;
    }).join('');

    updatePagination(currentPage, totalPages);

    // Add click handlers
    document.querySelectorAll('.blog-card').forEach(card => {
        card.addEventListener('click', () => {
            const postId = card.dataset.postId;
            showPostDetail(postId);
        });
    });
}

// Make renderBlogPosts global for language changes
window.renderBlogPosts = renderBlogPosts;

// Category Filters
function initCategoryFilters() {
    const categoryItems = document.querySelectorAll('.category-item');
    
    categoryItems.forEach(item => {
        item.addEventListener('click', () => {
            categoryItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            
            currentCategory = item.dataset.category;
            currentPage = 1;
            renderBlogPosts();
        });
    });
}

// Search
function initSearch() {
    const searchInput = document.getElementById('searchInput');
    if (!searchInput) return;

    let searchTimeout;
    searchInput.addEventListener('input', (e) => {
        clearTimeout(searchTimeout);
        searchTimeout = setTimeout(() => {
            searchQuery = e.target.value.trim();
            currentPage = 1;
            renderBlogPosts();
        }, 300);
    });
}

// Pagination
function initPagination() {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');

    if (prevBtn) {
        prevBtn.addEventListener('click', () => {
            if (currentPage > 1) {
                currentPage--;
                renderBlogPosts();
                scrollToTop();
            }
        });
    }

    if (nextBtn) {
        nextBtn.addEventListener('click', () => {
            const totalPages = Math.ceil(getFilteredCount() / postsPerPage);
            if (currentPage < totalPages) {
                currentPage++;
                renderBlogPosts();
                scrollToTop();
            }
        });
    }
}

function updatePagination(current, total) {
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const pageNumbers = document.getElementById('pageNumbers');

    if (prevBtn) prevBtn.disabled = current <= 1;
    if (nextBtn) nextBtn.disabled = current >= total || total === 0;

    if (pageNumbers) {
        if (total === 0) {
            pageNumbers.innerHTML = '';
            return;
        }

        let pages = [];
        for (let i = 1; i <= total; i++) {
            if (i === 1 || i === total || (i >= current - 1 && i <= current + 1)) {
                pages.push(i);
            } else if (pages[pages.length - 1] !== '...') {
                pages.push('...');
            }
        }

        pageNumbers.innerHTML = pages.map(page => {
            if (page === '...') {
                return '<span style="padding: 0 0.375rem;">...</span>';
            }
            return `
                <div class="page-number ${page === current ? 'active' : ''}" data-page="${page}">
                    ${page}
                </div>
            `;
        }).join('');

        pageNumbers.querySelectorAll('.page-number').forEach(btn => {
            btn.addEventListener('click', () => {
                currentPage = parseInt(btn.dataset.page);
                renderBlogPosts();
                scrollToTop();
            });
        });
    }
}

function getFilteredCount() {
    const translations = getTranslations();
    const postsData = window.blogPostsData || [];
    
    return postsData.filter(post => {
        const postInfo = translations.posts?.[post.id];
        if (!postInfo) return false;
        
        if (currentCategory !== 'all' && postInfo.category !== currentCategory) {
            return false;
        }
        
        if (searchQuery) {
            const searchLower = searchQuery.toLowerCase();
            const titleMatch = postInfo.title.toLowerCase().includes(searchLower);
            const excerptMatch = postInfo.excerpt.toLowerCase().includes(searchLower);
            return titleMatch || excerptMatch;
        }
        
        return true;
    }).length;
}

// Chat Modal
function initChatModal() {
    const modal = document.getElementById('chatModal');
    const openBtn = document.getElementById('openChatBtn');
    const closeBtn = document.getElementById('closeChatBtn');
    const sendBtn = document.getElementById('sendButton');
    const chatInput = document.getElementById('chatInput');
    const suggestionChips = document.querySelectorAll('.suggestion-chip');

    if (openBtn) {
        openBtn.addEventListener('click', () => {
            modal.classList.add('active');
            chatInput?.focus();
        });
    }

    if (closeBtn) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
        });
    }

    modal?.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });

    if (sendBtn && chatInput) {
        const sendMessage = () => {
            const message = chatInput.value.trim();
            if (message) {
                handleUserMessage(message);
                chatInput.value = '';
            }
        };

        sendBtn.addEventListener('click', sendMessage);
        chatInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                sendMessage();
            }
        });
    }

    suggestionChips.forEach(chip => {
        chip.addEventListener('click', () => {
            const suggestion = chip.dataset.suggestion;
            handleSuggestion(suggestion);
        });
    });
}

// Handle User Message
function handleUserMessage(message) {
    addMessage('user', message);
    showTypingIndicator();

    setTimeout(() => {
        hideTypingIndicator();
        const response = generateAIResponse(message);
        addMessage('bot', response);
    }, 1500);
}

// Handle Suggestion
function handleSuggestion(suggestion) {
    const translations = getTranslations();
    const responses = translations.aiResponses || {};
    
    // Get suggestion text from button
    const suggestionTexts = {
        'itinerary': translations.suggestItinerary || 'Lịch trình 3 ngày',
        'destination': translations.suggestDestination || 'Điểm đến hot',
        'budget': translations.suggestBudget || 'Du lịch rẻ',
        'food': translations.suggestFood || 'Ẩm thực'
    };
    
    // Show user message first
    const userMessage = suggestionTexts[suggestion] || suggestion;
    addMessage('user', userMessage);
    
    showTypingIndicator();
    
    setTimeout(() => {
        hideTypingIndicator();
        const response = responses[suggestion] || responses.default;
        addMessage('bot', response);
    }, 1200);
}

// Add Message
function addMessage(type, content) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.innerHTML = type === 'bot' 
        ? '<i class="fas fa-robot"></i>' 
        : '<i class="fas fa-user"></i>';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    contentDiv.innerHTML = content.replace(/\n/g, '<br>');
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    chatMessages.appendChild(messageDiv);
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Typing Indicator
function showTypingIndicator() {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const indicator = document.createElement('div');
    indicator.className = 'message bot-message';
    indicator.id = 'typing-indicator';
    indicator.innerHTML = `
        <div class="message-avatar">
            <i class="fas fa-robot"></i>
        </div>
        <div class="message-content">
            <div class="typing-indicator">
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
                <span class="typing-dot"></span>
            </div>
        </div>
    `;
    chatMessages.appendChild(indicator);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}

function hideTypingIndicator() {
    const indicator = document.getElementById('typing-indicator');
    if (indicator) {
        indicator.remove();
    }
}

// Generate AI Response
function generateAIResponse(message) {
    const translations = getTranslations();
    const responses = translations.aiResponses || {};
    const messageLower = message.toLowerCase();

    if (messageLower.includes('lịch trình') || messageLower.includes('itinerary') || 
        messageLower.includes('schedule') || messageLower.includes('3 ngày')) {
        return responses.itinerary || responses.default;
    }
    
    if (messageLower.includes('điểm đến') || messageLower.includes('destination') || 
        messageLower.includes('đi đâu') || messageLower.includes('where')) {
        return responses.destination || responses.default;
    }
    
    if (messageLower.includes('tiết kiệm') || messageLower.includes('budget') || 
        messageLower.includes('rẻ') || messageLower.includes('cheap')) {
        return responses.budget || responses.default;
    }
    
    if (messageLower.includes('ăn') || messageLower.includes('food') || 
        messageLower.includes('món') || messageLower.includes('ẩm thực')) {
        return responses.food || responses.default;
    }

    return responses.default;
}

// Show Post Detail
function showPostDetail(postId) {
    const lang = getCurrentLang();
    const message = lang === 'vi' 
        ? 'Tính năng xem chi tiết bài viết đang được phát triển!' 
        : 'Blog detail feature is under development!';
    
    if (typeof showToast === 'function') {
        showToast(message, { type: 'info', duration: 2000 });
    } else {
        alert(message);
    }
}

// Utilities
function formatDate(dateStr, lang) {
    const date = new Date(dateStr);
    if (lang === 'vi') {
        const day = date.getDate();
        const month = date.getMonth() + 1;
        const year = date.getFullYear();
        return `${day}/${month}/${year}`;
    } else {
        return date.toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'short', 
            day: 'numeric' 
        });
    }
}

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// Language Change Handler
document.addEventListener('languageChanged', (e) => {
    const lang = e.detail?.lang || 'vi';
    renderBlogPosts();
});

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
    initBlog();
});
