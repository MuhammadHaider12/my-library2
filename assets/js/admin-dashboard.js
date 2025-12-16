document.addEventListener('DOMContentLoaded', () => {
    const API_BASE = 'http://localhost:3000'; // Replace with your Railway backend URL after deployment

    // Protect admin dashboard: require login
    const adminUsername = sessionStorage.getItem('adminUsername') || localStorage.getItem('adminUsername');
    const welcomeSpan = document.querySelector('#adminNameDisplay');
    if (!adminUsername) {
        alert('Please login as admin first.');
        window.location.href = 'admin-login.html';
        return;
    }

    // If we have some element to show the name, set it
    if (welcomeSpan) {
        welcomeSpan.textContent = `Welcome, Admin (${adminUsername})`;
    }

    // --- Load Dashboard Stats ---
    async function loadDashboardStats() {
        try {
            const res = await fetch(`${API_BASE}/admin/dashboard/stats`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                console.error('Failed to load dashboard stats:', data.message);
                return;
            }

            const stats = data.stats;
            
            // Update stats with formatting (add commas for thousands)
            const formatNumber = (num) => {
                return Number(num).toLocaleString('en-US');
            };

            const totalBooksEl = document.getElementById('statTotalBooks');
            const booksIssuedEl = document.getElementById('statBooksIssued');
            const overdueBooksEl = document.getElementById('statOverdueBooks');
            const registeredUsersEl = document.getElementById('statRegisteredUsers');

            if (totalBooksEl) totalBooksEl.textContent = formatNumber(stats.totalBooks);
            if (booksIssuedEl) booksIssuedEl.textContent = formatNumber(stats.booksIssued);
            if (overdueBooksEl) overdueBooksEl.textContent = formatNumber(stats.overdueBooks);
            if (registeredUsersEl) registeredUsersEl.textContent = formatNumber(stats.registeredUsers);
        } catch (err) {
            console.error('Error loading dashboard stats:', err);
        }
    }

    // Load stats on page load
    loadDashboardStats();

    // --- Fines Management (Physical Payments) ---
    async function loadFines(status = 'unpaid') {
        try {
            const res = await fetch(`${API_BASE}/admin/fines?status=${encodeURIComponent(status)}`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.message || 'Failed to load fines.');
                return;
            }

            const tbody = document.getElementById('finesTableBody');
            if (!tbody) return;
            tbody.innerHTML = '';

            if (!data.fines || data.fines.length === 0) {
                tbody.innerHTML = `<tr><td colspan="7" class="text-center text-muted">No fines found.</td></tr>`;
                return;
            }

            data.fines.forEach(fine => {
                const tr = document.createElement('tr');
                const studentName = fine.first_name
                    ? `${fine.first_name} ${fine.last_name || ''}`.trim()
                    : fine.student_id || 'Unknown';
                const isPaid = !!fine.is_paid;

                tr.innerHTML = `
                    <td>${fine.fine_id}</td>
                    <td>${studentName}</td>
                    <td>₹${Number(fine.amount).toFixed(2)}</td>
                    <td>${fine.description || ''}</td>
                    <td>${fine.date_issued || ''}</td>
                    <td>
                        ${isPaid
                            ? `<span class="badge bg-success">Paid</span><br><small>on ${fine.paid_date || ''} by ${fine.paid_by_admin || 'N/A'}</small>`
                            : `<span class="badge bg-warning text-dark">Unpaid</span>`}
                    </td>
                    <td>
                        ${isPaid
                            ? '<button class="btn btn-sm btn-outline-secondary" disabled>Already Paid</button>'
                            : `<button class="btn btn-sm btn-success mark-paid-btn" data-fine-id="${fine.fine_id}">Mark as Paid (Cash)</button>`}
                    </td>
                `;

                tbody.appendChild(tr);
            });

            // Attach click handlers for "Mark as Paid" buttons
            tbody.querySelectorAll('.mark-paid-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const fineId = e.currentTarget.getAttribute('data-fine-id');
                    if (!fineId) return;

                    const confirmPay = confirm(`Confirm this fine (ID ${fineId}) has been paid physically?`);
                    if (!confirmPay) return;

                    try {
                        const payRes = await fetch(`${API_BASE}/admin/fines/${fineId}/pay`, {
                            method: 'PUT',
                            headers: {
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ adminUsername })
                        });
                        const payData = await payRes.json();
                        if (!payRes.ok || !payData.success) {
                            alert(payData.message || 'Failed to mark fine as paid.');
                            return;
                        }
                        alert('Fine marked as paid.');
                        loadFines(status);
                    } catch (err) {
                        console.error('Error marking fine as paid:', err);
                        alert('Server error while marking fine as paid.');
                    }
                });
            });
        } catch (err) {
            console.error('Error loading fines:', err);
            alert('Server error while loading fines.');
        }
    }

    // Wire up Manage Fines button and modal controls
    const showUnpaidBtn = document.getElementById('showUnpaidFinesBtn');
    const showAllBtn = document.getElementById('showAllFinesBtn');

    if (showUnpaidBtn) {
        showUnpaidBtn.addEventListener('click', () => loadFines('unpaid'));
    }
    if (showAllBtn) {
        showAllBtn.addEventListener('click', () => loadFines('all'));
    }

    // Expose a function for the inline "Manage Fines" button
    window.showFineManagement = function () {
        const modalEl = document.getElementById('finesModal');
        if (!modalEl) return;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
        loadFines('unpaid');
    };

    // --- Create Fine (Admin) ---
    const createFineForm = document.getElementById('createFineForm');
    if (createFineForm) {
        createFineForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const student_id = document.getElementById('fineStudentId').value.trim();
            const amountStr = document.getElementById('fineAmount').value;
            const description = document.getElementById('fineDescription').value.trim();

            const amount = Number(amountStr);
            if (!student_id) {
                alert('Student ID is required.');
                return;
            }
            if (Number.isNaN(amount) || amount <= 0) {
                alert('Amount must be a positive number.');
                return;
            }
            if (amount > 1000) {
                alert('Amount cannot exceed ₹1000.');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/admin/fines`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        student_id,
                        amount,
                        description,
                        adminUsername
                    })
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    alert(data.message || 'Failed to create fine.');
                    return;
                }
                alert('Fine created successfully.');
                createFineForm.reset();
                // Refresh fines list
                loadFines('unpaid');
            } catch (err) {
                console.error('Error creating fine:', err);
                alert('Server error while creating fine.');
            }
        });
    }

    // --- View All Users (Students) ---
    window.showUserList = async function () {
        const modalEl = document.getElementById('studentsModal');
        if (!modalEl) return;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const tbody = document.getElementById('studentsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">Loading...</td></tr>';

        try {
            const res = await fetch(`${API_BASE}/admin/students`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Failed to load students.</td></tr>';
                return;
            }

            if (!data.students || data.students.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No students found.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            data.students.forEach(st => {
                const tr = document.createElement('tr');
                const name = `${st.first_name} ${st.last_name || ''}`.trim();
                tr.innerHTML = `
                    <td>${st.student_id}</td>
                    <td>${name}</td>
                    <td>${st.email}</td>
                    <td>${st.department || ''}</td>
                    <td>${st.semester != null ? st.semester : ''}</td>
                    <td>${st.enrollment_year || ''}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading students:', err);
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-danger">Server error while loading students.</td></tr>';
        }
    };

    // --- Book Management ---
    // Show modals
    window.showAddBookModal = function () {
        const modalEl = document.getElementById('addBookModal');
        if (!modalEl) return;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    };

    window.showUpdateBookModal = function () {
        const modalEl = document.getElementById('updateBookModal');
        if (!modalEl) return;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    };

    window.showDeleteBookModal = function () {
        const modalEl = document.getElementById('deleteBookModal');
        if (!modalEl) return;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
    };

    // Add book using backend
    window.addBook = async function () {
        const bookId = document.getElementById('bookId').value.trim();
        const title = document.getElementById('bookTitle').value.trim();
        const author = document.getElementById('bookAuthor').value.trim();
        const isbn = document.getElementById('bookIsbn').value.trim();
        const category = document.getElementById('bookCategory').value;
        const publisher = document.getElementById('bookPublisher').value.trim();
        const year = document.getElementById('bookYear').value;
        const copies = document.getElementById('bookCopies').value;

        if (!bookId || !title) {
            alert('Book ID and Title are required.');
            return;
        }

        const copiesNum = Number(copies || 1);
        if (Number.isNaN(copiesNum) || copiesNum <= 0) {
            alert('Total copies must be a positive number.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/admin/books`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    book_id: bookId,
                    title,
                    author,
                    category,
                    isbn,
                    publisher,
                    published_year: year || null,
                    copies_total: copiesNum
                })
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.message || 'Failed to add book.');
                return;
            }

            alert('Book added successfully.');
            const form = document.getElementById('addBookForm');
            if (form) form.reset();
            document.getElementById('bookCopies').value = '1';
            const modalEl = document.getElementById('addBookModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        } catch (err) {
            console.error('Error adding book:', err);
            alert('Server error while adding book.');
        }
    };

    // Update book
    window.updateBook = async function () {
        const bookId = document.getElementById('updateBookId').value.trim();
        if (!bookId) {
            alert('Book ID is required.');
            return;
        }

        const payload = {
            title: document.getElementById('updateBookTitle').value.trim() || null,
            author: document.getElementById('updateBookAuthor').value.trim() || null,
            category: document.getElementById('updateBookCategory').value.trim() || null,
            isbn: document.getElementById('updateBookIsbn').value.trim() || null,
            publisher: document.getElementById('updateBookPublisher').value.trim() || null,
            published_year: document.getElementById('updateBookYear').value || null,
            copies_total: document.getElementById('updateBookCopies').value || null
        };

        // If all fields are null/empty, nothing to update
        if (Object.values(payload).every(v => v === null || v === '')) {
            alert('Please enter at least one field to update.');
            return;
        }

        try {
            const res = await fetch(`${API_BASE}/admin/books/${encodeURIComponent(bookId)}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(payload)
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.message || 'Failed to update book.');
                return;
            }

            alert('Book updated successfully.');
            const form = document.getElementById('updateBookForm');
            if (form) form.reset();
            const modalEl = document.getElementById('updateBookModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        } catch (err) {
            console.error('Error updating book:', err);
            alert('Server error while updating book.');
        }
    };

    // Delete book
    window.deleteBook = async function () {
        const bookId = document.getElementById('deleteBookId').value.trim();
        if (!bookId) {
            alert('Book ID is required.');
            return;
        }

        const confirmDelete = confirm(`Are you sure you want to delete book "${bookId}"? This cannot be undone.`);
        if (!confirmDelete) return;

        try {
            const res = await fetch(`${API_BASE}/admin/books/${encodeURIComponent(bookId)}`, {
                method: 'DELETE'
            });
            const data = await res.json();
            if (!res.ok || !data.success) {
                alert(data.message || 'Failed to delete book.');
                return;
            }

            alert('Book deleted successfully.');
            const form = document.getElementById('deleteBookForm');
            if (form) form.reset();
            const modalEl = document.getElementById('deleteBookModal');
            const modal = bootstrap.Modal.getInstance(modalEl);
            if (modal) modal.hide();
        } catch (err) {
            console.error('Error deleting book:', err);
            alert('Server error while deleting book.');
        }
    };

    // Handle Add Admin form submit (inside modal)
    const addAdminForm = document.getElementById('addAdminForm');
    if (addAdminForm) {
        addAdminForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const username = document.getElementById('newAdminUsername').value.trim();
            const password = document.getElementById('newAdminPassword').value;
            const confirmPassword = document.getElementById('newAdminConfirmPassword').value;

            if (!username || !password || !confirmPassword) {
                alert('Please fill in all fields.');
                return;
            }

            if (password !== confirmPassword) {
                alert('Passwords do not match.');
                return;
            }

            if (password.length < 8) {
                alert('Password must be at least 8 characters long.');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/admin/register`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ username, password })
                });

                const data = await res.json();
                if (res.ok && data.success) {
                    alert('New admin registered successfully!');
                    addAdminForm.reset();
                    const modalEl = document.getElementById('addAdminModal');
                    const modal = bootstrap.Modal.getInstance(modalEl);
                    if (modal) modal.hide();
                } else {
                    alert(data.message || 'Failed to register admin.');
                }
            } catch (err) {
                console.error('Error registering admin:', err);
                alert('Server error while registering new admin.');
            }
        });
    }

    // --- Issue Book ---
    const issueBookForm = document.getElementById('issueBookForm');
    if (issueBookForm) {
        issueBookForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const student_id = document.getElementById('issueStudentId').value.trim();
            const book_id = document.getElementById('issueBookId').value.trim();
            const days = parseInt(document.getElementById('issueDays').value) || 30;

            if (!student_id || !book_id) {
                alert('Please fill in all required fields.');
                return;
            }

            try {
                const res = await fetch(`${API_BASE}/admin/books/issue`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ student_id, book_id, days })
                });
                const data = await res.json();
                if (!res.ok || !data.success) {
                    alert(data.message || 'Failed to issue book.');
                    return;
                }
                alert(data.message || 'Book issued successfully.');
                issueBookForm.reset();
                document.getElementById('issueDays').value = 30;
                const modal = bootstrap.Modal.getInstance(document.getElementById('issueBookModal'));
                if (modal) modal.hide();
                loadDashboardStats(); // Refresh stats
            } catch (err) {
                console.error('Error issuing book:', err);
                alert('Server error while issuing book.');
            }
        });
    }

    // --- Reservations Management ---
    window.showReservations = async function () {
        const modalEl = document.getElementById('reservationsModal');
        if (!modalEl) return;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const tbody = document.getElementById('reservationsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">Loading...</td></tr>';

        try {
            const res = await fetch(`${API_BASE}/admin/reservations`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Failed to load reservations.</td></tr>';
                return;
            }

            if (!data.reservations || data.reservations.length === 0) {
                tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No reservations found.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            data.reservations.forEach(reservation => {
                const tr = document.createElement('tr');
                const studentName = reservation.first_name
                    ? `${reservation.first_name} ${reservation.last_name || ''}`.trim()
                    : reservation.student_id;
                const available = reservation.copies_available > 0
                    ? `<span class="badge bg-success">${reservation.copies_available} available</span>`
                    : '<span class="badge bg-warning">Not available</span>';

                // Determine action buttons based on availability
                let actionButtons = '';
                if (reservation.copies_available > 0) {
                    actionButtons = `
                        <button class="btn btn-sm btn-primary issue-book-btn" data-reserve-id="${reservation.reserve_id}" data-student-id="${reservation.student_id}" data-book-id="${reservation.book_id}" data-book-title="${reservation.title || ''}">
                            <i class="fas fa-check-circle"></i> Issue Book
                        </button>
                        <button class="btn btn-sm btn-danger cancel-reservation-btn" data-reserve-id="${reservation.reserve_id}">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    `;
                } else {
                    actionButtons = `
                        <button class="btn btn-sm btn-danger cancel-reservation-btn" data-reserve-id="${reservation.reserve_id}">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                    `;
                }

                tr.innerHTML = `
                    <td>${reservation.reserve_id}</td>
                    <td>${studentName}<br><small class="text-muted">${reservation.student_id}</small></td>
                    <td>${reservation.book_id}</td>
                    <td>${reservation.title || ''}</td>
                    <td>${reservation.reserve_date || ''}</td>
                    <td>${available}</td>
                    <td>
                        ${actionButtons}
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Attach cancel handlers
            tbody.querySelectorAll('.cancel-reservation-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const reserveId = e.currentTarget.getAttribute('data-reserve-id');
                    if (!confirm('Cancel this reservation?')) return;

                    try {
                        const res = await fetch(`${API_BASE}/admin/reservations/${reserveId}`, {
                            method: 'DELETE'
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) {
                            alert(data.message || 'Failed to cancel reservation.');
                            return;
                        }
                        alert('Reservation cancelled successfully.');
                        showReservations(); // Reload
                    } catch (err) {
                        console.error('Error cancelling reservation:', err);
                        alert('Server error while cancelling reservation.');
                    }
                });
            });

            // Attach issue book handlers
            tbody.querySelectorAll('.issue-book-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const reserveId = e.currentTarget.getAttribute('data-reserve-id');
                    const studentId = e.currentTarget.getAttribute('data-student-id');
                    const bookId = e.currentTarget.getAttribute('data-book-id');
                    const bookTitle = e.currentTarget.getAttribute('data-book-title');

                    if (!confirm(`Issue "${bookTitle}" to student ${studentId}?`)) return;

                    try {
                        const res = await fetch(`${API_BASE}/admin/books/issue`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                student_id: studentId,
                                book_id: bookId,
                                days: 30
                            })
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) {
                            alert(data.message || 'Failed to issue book.');
                            return;
                        }
                        alert(data.message || 'Book issued successfully!');
                        showReservations(); // Reload to update the list
                    } catch (err) {
                        console.error('Error issuing book:', err);
                        alert('Server error while issuing book.');
                    }
                });
            });
        } catch (err) {
            console.error('Error loading reservations:', err);
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Server error while loading reservations.</td></tr>';
        }
    };

    // --- Renewals Management ---
    window.showRenewalRequests = async function () {
        const modalEl = document.getElementById('renewalsModal');
        if (!modalEl) return;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const tbody = document.getElementById('renewalsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Loading...</td></tr>';

        try {
            const res = await fetch(`${API_BASE}/admin/issued-books`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Failed to load issued books.</td></tr>';
                return;
            }

            if (!data.issuedBooks || data.issuedBooks.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">No issued books found.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            data.issuedBooks.forEach(book => {
                const tr = document.createElement('tr');
                const studentName = book.first_name
                    ? `${book.first_name} ${book.last_name || ''}`.trim()
                    : book.student_id;
                const isOverdue = book.is_due || (new Date(book.due_date) < new Date());
                const statusBadge = isOverdue
                    ? '<span class="badge bg-danger">Overdue</span>'
                    : '<span class="badge bg-success">Active</span>';

                tr.innerHTML = `
                    <td>${book.issue_id}</td>
                    <td>${studentName}<br><small class="text-muted">${book.student_id}</small></td>
                    <td>${book.book_id}</td>
                    <td>${book.title || ''}</td>
                    <td>${book.issue_date || ''}</td>
                    <td>${book.due_date || ''}</td>
                    <td>${statusBadge}</td>
                    <td>
                        <button class="btn btn-sm btn-primary renew-book-btn" data-issue-id="${book.issue_id}">
                            <i class="fas fa-redo"></i> Renew (30 days)
                        </button>
                    </td>
                `;
                tbody.appendChild(tr);
            });

            // Attach renew handlers
            tbody.querySelectorAll('.renew-book-btn').forEach(btn => {
                btn.addEventListener('click', async (e) => {
                    const issueId = e.currentTarget.getAttribute('data-issue-id');
                    if (!confirm('Renew this book for 30 more days?')) return;

                    try {
                        const res = await fetch(`${API_BASE}/admin/issued-books/${issueId}/renew`, {
                            method: 'PUT',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ days: 30 })
                        });
                        const data = await res.json();
                        if (!res.ok || !data.success) {
                            alert(data.message || 'Failed to renew book.');
                            return;
                        }
                        alert(data.message || 'Book renewed successfully.');
                        showRenewalRequests(); // Reload
                        loadDashboardStats(); // Refresh stats
                    } catch (err) {
                        console.error('Error renewing book:', err);
                        alert('Server error while renewing book.');
                    }
                });
            });
        } catch (err) {
            console.error('Error loading issued books:', err);
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Server error while loading issued books.</td></tr>';
        }
    };

    // --- Reports ---
    window.generateReports = async function () {
        const modalEl = document.getElementById('reportsModal');
        if (!modalEl) return;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const content = document.getElementById('reportsContent');
        if (!content) return;
        content.innerHTML = '<div class="text-center text-muted">Loading report...</div>';

        try {
            const res = await fetch(`${API_BASE}/admin/reports`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                content.innerHTML = '<div class="text-center text-danger">Failed to generate report.</div>';
                return;
            }

            const report = data.report;
            content.innerHTML = `
                <div class="row mb-4">
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">Total Books</h6>
                                <h3 class="text-primary">${Number(report.totalBooks).toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">Total Students</h6>
                                <h3 class="text-primary">${Number(report.totalStudents).toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">Books Issued</h6>
                                <h3 class="text-info">${Number(report.booksIssued).toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">Overdue Books</h6>
                                <h3 class="text-danger">${Number(report.overdueBooks).toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">Reserved Books</h6>
                                <h3 class="text-warning">${Number(report.reservedBooks).toLocaleString()}</h3>
                            </div>
                        </div>
                    </div>
                    <div class="col-md-6 mb-3">
                        <div class="card">
                            <div class="card-body">
                                <h6 class="card-title">Total Outstanding Fines</h6>
                                <h3 class="text-danger">₹${Number(report.totalFines).toFixed(2)}</h3>
                            </div>
                        </div>
                    </div>
                </div>
                <h5 class="mb-3">Most Popular Books</h5>
                <div class="table-responsive">
                    <table class="table table-striped">
                        <thead>
                            <tr>
                                <th>Book ID</th>
                                <th>Title</th>
                                <th>Author</th>
                                <th>Times Borrowed</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${report.popularBooks.map(book => `
                                <tr>
                                    <td>${book.book_id}</td>
                                    <td>${book.title}</td>
                                    <td>${book.author || ''}</td>
                                    <td><strong>${book.borrow_count}</strong></td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            `;
        } catch (err) {
            console.error('Error generating report:', err);
            content.innerHTML = '<div class="text-center text-danger">Server error while generating report.</div>';
        }
    };

    // --- Feedback ---
    window.viewFeedback = async function () {
        const modalEl = document.getElementById('feedbackModal');
        if (!modalEl) return;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();

        const tbody = document.getElementById('feedbackTableBody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">Loading...</td></tr>';

        try {
            const res = await fetch(`${API_BASE}/admin/feedback`);
            const data = await res.json();
            if (!res.ok || !data.success) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Failed to load feedback.</td></tr>';
                return;
            }

            if (!data.feedback || data.feedback.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No feedback submitted yet.</td></tr>';
                return;
            }

            tbody.innerHTML = '';
            data.feedback.forEach(fb => {
                const tr = document.createElement('tr');
                const studentName = fb.first_name
                    ? `${fb.first_name} ${fb.last_name || ''}`.trim()
                    : fb.student_id;
                const stars = '★'.repeat(fb.rating) + '☆'.repeat(5 - fb.rating);
                const date = new Date(fb.created_at).toLocaleDateString();

                tr.innerHTML = `
                    <td>${date}</td>
                    <td>${studentName}<br><small class="text-muted">${fb.student_id}</small></td>
                    <td>${fb.subject || ''}</td>
                    <td><span class="text-warning">${stars}</span></td>
                    <td>${fb.message || ''}</td>
                `;
                tbody.appendChild(tr);
            });
        } catch (err) {
            console.error('Error loading feedback:', err);
            tbody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Server error while loading feedback.</td></tr>';
        }
    };
});


