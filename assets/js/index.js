document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'http://localhost:3000'; // Replace with your Railway backend URL after deployment

    // Animate number counting up
    function animateValue(element, start, end, duration) {
        if (!element) return;
        
        const range = end - start;
        const increment = end > start ? 1 : -1;
        const stepTime = Math.abs(Math.floor(duration / range));
        let current = start;
        
        const timer = setInterval(() => {
            current += increment;
            if ((increment > 0 && current >= end) || (increment < 0 && current <= end)) {
                current = end;
                clearInterval(timer);
            }
            element.textContent = Number(current).toLocaleString('en-US');
        }, stepTime);
    }

    // Load public stats from database with animation
    async function loadPublicStats() {
        try {
            const res = await fetch(`${API_BASE}/public/stats`);
            const data = await res.json();
            
            if (!res.ok || !data.success) {
                console.error('Failed to load public stats:', data.message);
                return;
            }

            const stats = data.stats;
            
            // Get stat elements
            const totalBooksEl = document.getElementById('homeTotalBooks');
            const activeMembersEl = document.getElementById('homeActiveMembers');
            const booksIssuedEl = document.getElementById('homeBooksIssued');

            // Wait for CSS animation to start, then animate numbers
            setTimeout(() => {
                if (totalBooksEl) animateValue(totalBooksEl, 0, stats.totalBooks, 2000);
                if (activeMembersEl) animateValue(activeMembersEl, 0, stats.activeMembers, 2000);
                if (booksIssuedEl) animateValue(booksIssuedEl, 0, stats.booksIssued, 2000);
            }, 500);
        } catch (err) {
            console.error('Error loading public stats:', err);
            // On error, keep default values (0) or show error message
        }
    }

    // Update navbar based on login status
    function updateNavbar() {
        // Prefer sessionStorage (cleared on browser/tab close), fall back to localStorage
        const adminUsername = sessionStorage.getItem('adminUsername') || localStorage.getItem('adminUsername');
        const studentId = sessionStorage.getItem('studentId') || localStorage.getItem('studentId');
        const navbarNav = document.querySelector('.navbar-nav.ms-auto');
        
        if (!navbarNav) return;

        // Clear existing nav items (except brand)
        navbarNav.innerHTML = '';

        if (adminUsername) {
            // Admin is logged in
            navbarNav.innerHTML = `
                <a class="nav-link" href="admin-dashboard.html">
                    <i class="fas fa-tachometer-alt"></i> Admin Dashboard
                </a>
                <span class="nav-link">Welcome, Admin (${adminUsername})</span>
                <a class="nav-link" href="index.html" onclick="sessionStorage.removeItem('adminUsername'); localStorage.removeItem('adminUsername')">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
        } else if (studentId) {
            // Student is logged in
            navbarNav.innerHTML = `
                <a class="nav-link" href="student-dashboard.html">
                    <i class="fas fa-tachometer-alt"></i> Student Dashboard
                </a>
                <span class="nav-link">Welcome, Student (ID: ${studentId})</span>
                <a class="nav-link" href="index.html" onclick="sessionStorage.removeItem('studentId'); localStorage.removeItem('studentId')">
                    <i class="fas fa-sign-out-alt"></i> Logout
                </a>
            `;
        } else {
            // No one is logged in - show login options
            navbarNav.innerHTML = `
                <a class="nav-link" href="admin-login.html">
                    <i class="fas fa-user-shield"></i> Admin Login
                </a>
                <a class="nav-link" href="student-login.html">
                    <i class="fas fa-user-graduate"></i> Student Login
                </a>
            `;
        }
    }

    // Intersection Observer for stats animation
    function setupStatsObserver() {
        const statsSection = document.getElementById('stats');
        if (!statsSection) {
            // If section doesn't exist, load stats immediately
            loadPublicStats();
            return;
        }

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !statsSection.classList.contains('stats-loaded')) {
                    // Mark as loaded and trigger animations
                    statsSection.classList.add('stats-loaded');
                    loadPublicStats();
                    observer.unobserve(entry.target);
                }
            });
        }, {
            threshold: 0.2 // Trigger when 20% of section is visible
        });

        observer.observe(statsSection);
    }

    // Load stats and update navbar on page load
    updateNavbar();
    setupStatsObserver();

    // Send a best-effort logout notification when the page/tab/window is closed.
    // Using sessionStorage ensures the user's session is cleared by the browser when closed,
    // but we also notify the backend (informational) using navigator.sendBeacon.
    window.addEventListener('unload', function () {
        const studentIdNow = sessionStorage.getItem('studentId') || localStorage.getItem('studentId');
        const adminNow = sessionStorage.getItem('adminUsername') || localStorage.getItem('adminUsername');
        if (!studentIdNow && !adminNow) return;

        const url = API_BASE + '/logout';
        const payload = { studentId: studentIdNow, adminUsername: adminNow };

        try {
            if (navigator.sendBeacon) {
                const blob = new Blob([JSON.stringify(payload)], { type: 'application/json' });
                navigator.sendBeacon(url, blob);
            } else {
                // Fallback synchronous XHR (may be blocked by some browsers)
                const xhr = new XMLHttpRequest();
                xhr.open('POST', url, false);
                xhr.setRequestHeader('Content-Type', 'application/json');
                xhr.send(JSON.stringify(payload));
            }
        } catch (e) {
            // Ignore errors during unload
        }

        // Clear both storages for cleanup
        sessionStorage.removeItem('studentId');
        sessionStorage.removeItem('adminUsername');
        localStorage.removeItem('studentId');
        localStorage.removeItem('adminUsername');
    });
});

