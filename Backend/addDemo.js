const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
require('dotenv').config({ path: '../.env' });

async function addDemoUser() {
    const pool = mysql.createPool({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT || 3306,
    });

    const hashedPassword = await bcrypt.hash('student123', 10);

    await pool.execute(
        'INSERT INTO students (student_id, first_name, last_name, email, phone, department, semester, enrollment_year, address, username, password2) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
        ['student001', 'Demo', 'Student', 'demo@student.com', '1234567890', 'Computer Science', 1, 2023, 'Demo Address', 'demostudent', hashedPassword]
    );

    console.log('Demo user added');
    process.exit(0);
}

addDemoUser().catch(console.error);