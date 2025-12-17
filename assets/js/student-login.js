document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('loginForm');
    if (!loginForm) return;

    const API_BASE = 'http://localhost:3000'; // Replace with your Railway backend URL after deployment

    loginForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        // Hide any previous error message
        const errorDiv = document.getElementById('error-message');
        errorDiv.style.display = 'none';

        const id = document.getElementById('student_id').value;
        const password = document.getElementById('studentPassword').value;

        console.log('Logging in with', id, password);

        try {
            const response = await fetch(`${API_BASE}/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, password })
            });

            const data = await response.json();
            console.log("Server Response:", data);

            if (response.ok) {
                alert('Login successful!');

                if (data.student_id) {
                    // Use sessionStorage so the user is logged out when the browser/tab closes
                    sessionStorage.setItem("studentId", data.student_id);
                    // Only ONE redirect
                    window.location.href = `student-dashboard.html?student_id=${data.student_id}`;
                } else {
                    alert("Error: student_id missing from server response.");
                }
            } else {
                errorDiv.textContent = data.message || 'Login failed.';
                errorDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Error:', error);
            errorDiv.textContent = 'Something went wrong. Please try again later.';
            errorDiv.style.display = 'block';
        }
    });
});


