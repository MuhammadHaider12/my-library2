document.addEventListener('DOMContentLoaded', () => {
    const registrationForm = document.getElementById('registrationForm');
    const enrollmentYearInput = document.getElementById('enrollmentYear');

    const API_BASE = 'http://localhost:3000'; // Replace with your Railway backend URL after deployment

    // Pre-fill enrollment year
    if (enrollmentYearInput) {
        enrollmentYearInput.value = new Date().getFullYear();
    }

    if (!registrationForm) return;

    registrationForm.addEventListener('submit', async function (e) {
        e.preventDefault();

        const form = e.target;
        const formData = new FormData(form);
        const data = Object.fromEntries(formData.entries());

        // Client-side validation
        if (data.password !== data.confirmPassword) {
            alert('Passwords do not match!');
            return;
        }

        if (data.password.length < 8) {
            alert('Password must be at least 8 characters long!');
            return;
        }

        const currentYear = new Date().getFullYear();
        if (data.enrollmentYear < 2000 || data.enrollmentYear > currentYear) {
            alert('Please enter a valid enrollment year!');
            return;
        }

        try {
            const response = await fetch(`${API_BASE}/register-student`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(data)
            });

            const result = await response.json();

            if (response.ok) {
                alert('Registration submitted successfully! ' + result.message);
                window.location.href = 'student-login.html';
            } else {
                alert('Registration failed: ' + (result.error || 'Unknown error'));
            }
        } catch (error) {
            console.error('Network or Server Error:', error);
            alert('Could not connect to the registration server.');
        }
    });
});


