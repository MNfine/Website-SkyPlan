(function() {
    const backBtn = document.getElementById('backBtn');
    const homeBtn = document.getElementById('homeBtn');

    if (backBtn) backBtn.addEventListener('click', () => {
        if (history.length > 1) history.back();
        else window.location.href = '/';
    });

    if (homeBtn) homeBtn.addEventListener('click', (e) => {
        const href = homeBtn.getAttribute('href') || '/';
        if (href === '#') {
            e.preventDefault();
            window.location.href = '/';
        }
    });
})();