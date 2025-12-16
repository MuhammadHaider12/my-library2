document.addEventListener('DOMContentLoaded', () => {
    const adminLoginForm = document.getElementById('adminLoginForm');
    if (!adminLoginForm) return;

    const API_BASE = 'http://localhost:3000'; // Replace with your Railway backend URL after deployment

    adminLoginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const username = document.getElementById('adminUsername').value.trim();
        const password = document.getElementById('adminPassword').value;

        if (!username || !password) {
            alert('Please enter both username and password.');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/admin/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ username, password })
            });

            const data = await response.json();
            console.log('Admin login response:', data);

                if (response.ok && data.success) {
                alert('Admin login successful!');
                // Store minimal info in sessionStorage so closing the browser logs out the admin
                sessionStorage.setItem('adminUsername', data.username);
                // Redirect to admin dashboard
                window.location.href = 'admin-dashboard.html';
            } else {
                alert(data.message || 'Invalid admin username or password.');
            }
        } catch (err) {
            console.error('Admin login error:', err);
            alert('Could not connect to the server. Please try again later.');
        }
    });
});


