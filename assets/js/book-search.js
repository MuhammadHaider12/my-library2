document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'http://localhost:3000'; // Replace with your Railway backend URL after deployment

    // Configure navbar depending on whether student or admin is logged in
    const adminUsername = sessionStorage.getItem('adminUsername') || localStorage.getItem('adminUsername');
    const studentId = sessionStorage.getItem('studentId') || localStorage.getItem('studentId');
    const navContainer = document.querySelector('.navbar-nav.ms-auto');

    if (navContainer) {
        navContainer.innerHTML = '';

        if (adminUsername) {
            // Admin view
            const dashboardLink = document.createElement('a');
            dashboardLink.className = 'nav-link';
            dashboardLink.href = 'admin-dashboard.html';
            dashboardLink.innerHTML = '<i class="fas fa-tachometer-alt"></i> Admin Dashboard';

            const welcomeSpan = document.createElement('span');
            welcomeSpan.className = 'nav-link';
            welcomeSpan.textContent = `Welcome, Admin (${adminUsername})`;

            const logoutLink = document.createElement('a');
            logoutLink.className = 'nav-link';
            logoutLink.href = 'index.html';
            logoutLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            logoutLink.addEventListener('click', () => {
                sessionStorage.removeItem('adminUsername');
                localStorage.removeItem('adminUsername');
            });

            navContainer.appendChild(dashboardLink);
            navContainer.appendChild(welcomeSpan);
            navContainer.appendChild(logoutLink);
        } else if (studentId) {
            // Student view
            const dashboardLink = document.createElement('a');
            dashboardLink.className = 'nav-link';
            dashboardLink.href = 'student-dashboard.html';
            dashboardLink.innerHTML = '<i class="fas fa-tachometer-alt"></i> Dashboard';

            const welcomeSpan = document.createElement('span');
            welcomeSpan.className = 'nav-link';
            welcomeSpan.textContent = `Welcome, Student (ID: ${studentId})`;

            const logoutLink = document.createElement('a');
            logoutLink.className = 'nav-link';
            logoutLink.href = 'index.html';
            logoutLink.innerHTML = '<i class="fas fa-sign-out-alt"></i> Logout';
            logoutLink.addEventListener('click', () => {
                sessionStorage.removeItem('studentId');
                localStorage.removeItem('studentId');
            });

            navContainer.appendChild(dashboardLink);
            navContainer.appendChild(welcomeSpan);
            navContainer.appendChild(logoutLink);
        } else {
            // Guest view
            const homeLink = document.createElement('a');
            homeLink.className = 'nav-link';
            homeLink.href = 'index.html';
            homeLink.textContent = 'Home';
            navContainer.appendChild(homeLink);
        }
    }

    // --- Search Books ---
    async function searchBooks() {
        const query = document.getElementById('searchQuery').value.trim();
        const category = document.getElementById('category').value;
        const availability = document.getElementById('availability').value;

        const params = new URLSearchParams();
        if (query) params.append('query', query);
        if (category) params.append('category', category);
        if (availability) params.append('availability', availability);

        const resultsBadge = document.getElementById('resultsCountBadge');
        const tbody = document.getElementById('booksTableBody');

        if (tbody) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Searching...</td></tr>';
        }

        try {
            const res = await fetch(`${API_BASE}/books/search?${params.toString()}`);
            const data = await res.json();

            if (!res.ok || !data.success) {
                if (tbody) {
                    tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Error searching books.</td></tr>';
                }
                alert(data.message || 'Error searching books.');
                return;
            }

            const books = data.books || [];

            if (resultsBadge) {
                resultsBadge.textContent = `${books.length} book${books.length === 1 ? '' : 's'} found`;
            }

            if (!tbody) return;

            if (books.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No books found.</td></tr>';
                return;
            }

            tbody.innerHTML = '';

            books.forEach(book => {
                const tr = document.createElement('tr');
                const available = book.copies_available > 0;
                tr.innerHTML = `
                    <td>${book.book_id}</td>
                    <td>${book.title}</td>
                    <td>${book.author || ''}</td>
                    <td>${book.category || ''}</td>
                    <td>
                        ${available
                            ? '<span class="badge bg-success">Available</span>'
                            : '<span class="badge bg-warning text-dark">Issued</span>'}
                        <br><small>${book.copies_available}/${book.copies_total} copies</small>
                    </td>
                    <td>
                        <button class="btn btn-sm btn-secondary view-details-btn" data-book-id="${book.book_id}">
                            <i class="fas fa-info-circle"></i> Details
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Details button handler
            tbody.querySelectorAll('.view-details-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const bookId = e.currentTarget.getAttribute('data-book-id');
                    showBookDetails(bookId, API_BASE);
                });
            });
        } catch (err) {
            console.error('Error searching books:', err);
            if (tbody) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Server error while searching books.</td></tr>';
            }
        }
    }

    // Show book details in modal
    window.showBookDetails = function(bookId, apiBase) {
        fetch(`${apiBase}/admin/books/${bookId}`)
            .then(res => res.json())
            .then(data => {
                if (data.success && data.book) {
                    const book = data.book;
                    document.getElementById('detailBookId').innerText = book.book_id || 'N/A';
                    document.getElementById('detailTitle').innerText = book.title || 'N/A';
                    document.getElementById('detailAuthor').innerText = book.author || 'N/A';
                    document.getElementById('detailCategory').innerText = book.category || 'N/A';
                    document.getElementById('detailISBN').innerText = book.isbn || 'N/A';
                    document.getElementById('detailPublisher').innerText = book.publisher || 'N/A';
                    document.getElementById('detailYear').innerText = book.published_year || 'N/A';
                    document.getElementById('detailCopies').innerText = book.copies_available || 0;
                    document.getElementById('detailTotal').innerText = book.copies_total || 0;
                    
                    const bookDetailsModal = new bootstrap.Modal(document.getElementById('bookDetailsModal'));
                    bookDetailsModal.show();
                } else {
                    alert('Book not found');
                }
            })
            .catch(error => {
                console.error('Error fetching book details:', error);
                alert('Error fetching book details');
            });
    };

    // Wire up search button and Enter key
    const searchButton = document.getElementById('searchButton');
    if (searchButton) {
        searchButton.addEventListener('click', (e) => {
            e.preventDefault();
            searchBooks();
        });
    }

    const searchForm = document.getElementById('searchForm');
    if (searchForm) {
        searchForm.addEventListener('submit', (e) => {
            e.preventDefault();
            searchBooks();
        });
    }

    // Initial load: show all books
    searchBooks();
});


