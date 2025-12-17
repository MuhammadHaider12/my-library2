const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const bcrypt = require('bcrypt');
const path = require('path');

// Explicitly load env file from project root so it works regardless of cwd
const envPath = path.resolve(__dirname, '..', '.env');
require('dotenv').config({ path: envPath });

const app = express();
const PORT = process.env.PORT || 3000;

// --- Database Connection Pool ---
// Require critical DB env vars up front to avoid silent fallbacks
function requireEnv(name) {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Missing required environment variable: ${name}`);
    }
    return value;
}

const pool = mysql.createPool({
    host: process.env.DB_HOST || process.env.MYSQLHOST || requireEnv('DB_HOST'),
    user: process.env.DB_USER || process.env.MYSQLUSER || requireEnv('DB_USER'),
    password: process.env.DB_PASSWORD || process.env.MYSQLPASSWORD || requireEnv('DB_PASSWORD'),
    database: process.env.DB_NAME || process.env.MYSQLDATABASE || requireEnv('DB_NAME'),
    port: process.env.DB_PORT || process.env.MYSQLPORT || 3306,
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT) || 10,
    queueLimit: 0
});

// --- Middleware ---
app.use(cors({
    origin: ['http://localhost:5500', 'http://127.0.0.1:5500', 'http://localhost:5501', 'http://127.0.0.1:5501'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
    credentials: true,
}));
app.use(express.json());

// --- Test Database Connection ---
app.get('/', (req, res) => {
  res.json({
    message: 'API Server is running',
    endpoints: {
      health: '/api/health',
      docs: '/api/docs'
    }
  });
});
app.get('/test-db', async (req, res) => {
    try {
        const [rows] = await pool.execute('SELECT 1 + 1 AS result');
        res.json({ message: 'Database connected successfully', result: rows[0].result });
    } catch (err) {
        console.error('Database connection error:', err);
        res.status(500).json({ error: 'Database connection failed' });
    }
});
// ===========================================
// HEALTH CHECK ENDPOINT (Railway requires this!)
// ===========================================
app.get('/api/health', async (req, res) => {
  try {
    // Test database connection
    if (pool) {
      await pool.query('SELECT 1');
    }
    
    res.json({
      status: 'healthy',
      timestamp: new Date().toISOString(),
      service: 'backend-api',
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'unhealthy',
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});
require('dotenv').config();

console.log('🚀 Starting server...');
console.log('🔧 NODE_ENV:', process.env.NODE_ENV || 'development');

// ======================
// 2. IMPORTS
// ======================
 
// ======================
// 3. CREATE EXPRESS APP
// ======================


// Enable CORS
app.use(cors());

// Parse JSON bodies
app.use(express.json());

// ======================
// 4. CRITICAL: HEALTH CHECK ENDPOINTS
// ======================

// ROOT ENDPOINT (Railway often checks this)
app.get('/', (req, res) => {
  console.log('✅ Root endpoint hit');
  res.json({
    status: 'running',
    message: '🚀 API Server is operational',
    timestamp: new Date().toISOString(),
    endpoints: {
      health: '/health',
      apiHealth: '/api/health',
      api: '/api/*'
    }
  });
});

// ALTERNATIVE HEALTH CHECK (Railway default)
app.get('/health', (req, res) => {
  console.log('✅ Health endpoint hit');
  res.json({
    status: 'healthy',
    service: 'api-server',
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// API HEALTH CHECK (Your current config)
app.get('/api/health', (req, res) => {
  console.log('✅ API Health endpoint hit');
  res.json({
    status: 'healthy',
    endpoint: '/api/health',
    timestamp: new Date().toISOString(),
    node_version: process.version,
    memory: process.memoryUsage()
  });
});

// ======================
// 5. TEST ENDPOINT
// ======================
app.get('/api/test', (req, res) => {
  res.json({
    success: true,
    message: 'API is working!',
    timestamp: new Date().toISOString()
  });
});

// ======================
// 6. ADD YOUR ROUTES HERE
// ======================
// app.get('/api/users', ...)
// app.post('/api/data', ...)

// ======================
// 7. 404 HANDLER
// ======================
app.use('*', (req, res) => {
  res.status(404).json({
    error: 'Not Found',
    path: req.originalUrl,
    method: req.method,
    suggestion: 'Try /health or /api/health'
  });
});

// Add this route too (Railway sometimes checks root)


// --- Improved Student Registration ---
app.post('/register-student', async (req, res) => {
    console.log("Registration request received:", req.body);

    const {
        firstName, lastName, email, phone,
        studentId, department, semester, enrollmentYear,
        address, username, password, confirmPassword
    } = req.body;

    // 1. Server-Side Validation
    if (!studentId || !firstName || !lastName || !email || !username || !password) {
        return res.status(400).json({ 
            error: 'Missing required fields: Student ID, First Name, Last Name, Email, Username, and Password are required.' 
        });
    }

    if (password !== confirmPassword) {
        return res.status(400).json({ error: 'Passwords do not match.' });
    }

    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        return res.status(400).json({ error: 'Invalid email format.' });
    }

    try {
        // 2. Check for Duplicates BEFORE Processing
        console.log("Checking for duplicates...");
        
        // Check if Student ID already exists
        const [idExists] = await pool.execute(
            'SELECT student_id FROM students WHERE student_id = ?',
            [studentId]
        );
        
        if (idExists.length > 0) {
            return res.status(409).json({ 
                error: `Student ID "${studentId}" already exists. Please use a different Student ID.` 
            });
        }

        // Check if Email already exists
        const [emailExists] = await pool.execute(
            'SELECT email FROM students WHERE email = ?',
            [email]
        );
        
        if (emailExists.length > 0) {
            return res.status(409).json({ 
                error: `Email "${email}" is already registered. Please use a different email.` 
            });
        }

        // Check if Username already exists
        const [usernameExists] = await pool.execute(
            'SELECT username FROM students WHERE username = ?',
            [username]
        );
        
        if (usernameExists.length > 0) {
            return res.status(409).json({ 
                error: `Username "${username}" is already taken. Please choose a different username.` 
            });
        }

        // 3. Hash Password
        console.log("Hashing password...");
        const hashedPassword = await bcrypt.hash(password, 10);

        // 4. Prepare Data for Insertion
        const sql = `
            INSERT INTO students (
                student_id, first_name, last_name, email, phone, 
                department, semester, enrollment_year, address, 
                username, password2
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;
        
        const values = [
            studentId.trim(),
            firstName.trim(),
            lastName.trim(),
            email.trim(),
            phone ? phone.trim() : null,
            department ? department.trim() : null,
            semester ? parseInt(semester) : null,
            enrollmentYear ? parseInt(enrollmentYear) : null,
            address ? address.trim() : null,
            username.trim(),
            hashedPassword
        ];

        console.log("Inserting student data...");
        
        // 5. Insert New Student
        const [result] = await pool.execute(sql, values);
        
        console.log("Student registered successfully:", result.insertId);

        // 6. Success Response
        res.status(201).json({ 
            success: true,
            message: 'Registration successful!',
            studentId: studentId,
            redirect: 'student-login.html'
        });

    } catch (err) {
        console.error('Registration Error Details:', err);
        
        // Handle specific database errors
        if (err.code === 'ER_DUP_ENTRY') {
            const field = err.message.includes('email') ? 'Email' : 
                         err.message.includes('username') ? 'Username' : 'Student ID';
            return res.status(409).json({ 
                error: `${field} already exists. Please use a different ${field}.` 
            });
        }
        
        if (err.code === 'ER_NO_REFERENCED_ROW_2') {
            return res.status(400).json({ 
                error: 'Invalid data reference. Please check your input.' 
            });
        }
        
        res.status(500).json({ 
            error: 'System error during registration. Please try again later.',
            details: process.env.NODE_ENV === 'development' ? err.message : undefined
        });
    }
});

// --- Student Login (Fixed) ---
app.post('/login', async (req, res) => {
    const { id, password } = req.body;
    console.log("Login attempt for ID:", id);

    if (!id || !password) {
        return res.status(400).json({ 
            message: 'Student ID and password are required.' 
        });
    }

    try {
        // Search by student_id
        const [rows] = await pool.execute(
            'SELECT * FROM students WHERE student_id = ?',
            [id]
        );

        if (rows.length === 0) {
            console.log("No student found with ID:", id);
            return res.status(401).json({ 
                message: 'Invalid Student ID or password.' 
            });
        }

        const student = rows[0];

        // Verify password
        const match = await bcrypt.compare(password, student.password2);
        if (!match) {
            console.log("Password mismatch for ID:", id);
            return res.status(401).json({ 
                message: 'Invalid Student ID or password.' 
            });
        }

        // Login successful
        console.log("Login successful for:", student.student_id);
        res.json({ 
            success: true,
            message: 'Login successful!',
            student_id: student.student_id,
            first_name: student.first_name,
            last_name: student.last_name
        });

    } catch (err) {
        console.error('Login Error:', err);
        res.status(500).json({ 
            message: 'Server error during login.' 
        });
    }
});

// --- Admin Login ---
// Expects: { username, password }
app.post('/admin/login', async (req, res) => {
    const { username, password } = req.body;
    console.log('Admin login attempt for username:', username);

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required.'
        });
    }

    try {
        const [rows] = await pool.execute(
            'SELECT * FROM admins WHERE username = ?',
            [username]
        );

        if (rows.length === 0) {
            console.log('No admin found with username:', username);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        const admin = rows[0];

        const match = await bcrypt.compare(password, admin.password_hash);
        if (!match) {
            console.log('Admin password mismatch for username:', username);
            return res.status(401).json({
                success: false,
                message: 'Invalid username or password.'
            });
        }

        console.log('Admin login successful for:', admin.username);
        res.json({
            success: true,
            message: 'Admin login successful!',
            username: admin.username
        });
    } catch (err) {
        console.error('Admin login error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error during admin login.'
        });
    }
});

// --- Admin Registration (done by existing logged-in admin) ---
// Expects: { username, password }
app.post('/admin/register', async (req, res) => {
    const { username, password } = req.body;
    console.log('Admin register attempt for username:', username);

    if (!username || !password) {
        return res.status(400).json({
            success: false,
            message: 'Username and password are required.'
        });
    }

    if (password.length < 8) {
        return res.status(400).json({
            success: false,
            message: 'Password must be at least 8 characters long.'
        });
    }

    try {
        // Check if username already exists
        const [existing] = await pool.execute(
            'SELECT admin_id FROM admins WHERE username = ?',
            [username]
        );

        if (existing.length > 0) {
            return res.status(409).json({
                success: false,
                message: 'Username already exists. Please choose a different one.'
            });
        }

        const passwordHash = await bcrypt.hash(password, 10);

        await pool.execute(
            'INSERT INTO admins (username, password_hash) VALUES (?, ?)',
            [username, passwordHash]
        );

        res.status(201).json({
            success: true,
            message: 'Admin registered successfully.'
        });
    } catch (err) {
        console.error('Admin register error:', err);
        res.status(500).json({
            success: false,
            message: 'Server error during admin registration.'
        });
    }
});

// --- Admin: Fines Management (physical payments) ---
// GET /admin/fines?status=unpaid|all  (default: unpaid)
app.get('/admin/fines', async (req, res) => {
    const { status } = req.query;
    try {
        let sql = `
            SELECT f.fine_id, f.student_id, s.first_name, s.last_name,
                   f.amount, f.description, f.date_issued,
                   f.is_paid, f.paid_date, f.paid_by_admin
            FROM fines f
            LEFT JOIN students s ON f.student_id = s.student_id
        `;
        const params = [];

        if (!status || status === 'unpaid') {
            sql += ' WHERE f.is_paid = FALSE OR f.is_paid IS NULL';
        }

        const [rows] = await pool.execute(sql, params);
        res.json({ success: true, fines: rows });
    } catch (err) {
        console.error('Error fetching fines:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching fines.'
        });
    }
});

// Admin creates a new fine for a student (amount in rupees, max 1000)
// POST /admin/fines  body: { student_id, amount, description, adminUsername }
app.post('/admin/fines', async (req, res) => {
    const { student_id, amount, description, adminUsername } = req.body;
    console.log('Admin creating fine:', { student_id, amount, adminUsername });

    if (!student_id || amount == null || amount === '') {
        return res.status(400).json({
            success: false,
            message: 'Student ID and amount are required.'
        });
    }

    const numericAmount = Number(amount);
    if (Number.isNaN(numericAmount) || numericAmount <= 0) {
        return res.status(400).json({
            success: false,
            message: 'Amount must be a positive number.'
        });
    }

    if (numericAmount > 1000) {
        return res.status(400).json({
            success: false,
            message: 'Amount cannot exceed ₹1000.'
        });
    }

    try {
        // Ensure student exists
        const [students] = await pool.execute(
            'SELECT student_id FROM students WHERE student_id = ?',
            [student_id]
        );

        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
        }

        await pool.execute(
            `INSERT INTO fines (student_id, amount, description, date_issued, is_paid, paid_by_admin)
             VALUES (?, ?, ?, CURDATE(), FALSE, ?)`,
            [student_id, numericAmount, description || null, adminUsername || null]
        );

        res.status(201).json({
            success: true,
            message: 'Fine created successfully.'
        });
    } catch (err) {
        console.error('Error creating fine:', err);
        res.status(500).json({
            success: false,
            message: 'Error creating fine.'
        });
    }
});

// PUT /admin/fines/:id/pay  body: { adminUsername }
app.put('/admin/fines/:id/pay', async (req, res) => {
    const fineId = req.params.id;
    const { adminUsername } = req.body;

    if (!adminUsername) {
        return res.status(400).json({
            success: false,
            message: 'Admin username is required to record payment.'
        });
    }

    try {
        const [result] = await pool.execute(
            `UPDATE fines
             SET is_paid = TRUE,
                 paid_date = CURDATE(),
                 paid_by_admin = ?
             WHERE fine_id = ?`,
            [adminUsername, fineId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Fine not found.'
            });
        }

        res.json({
            success: true,
            message: 'Fine marked as paid.'
        });
    } catch (err) {
        console.error('Error marking fine as paid:', err);
        res.status(500).json({
            success: false,
            message: 'Error updating fine status.'
        });
    }
});

// --- Admin: Students overview ---
// GET /admin/students
app.get('/admin/students', async (_req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT student_id, first_name, last_name, email,
                    department, semester, enrollment_year
             FROM students
             ORDER BY enrollment_year DESC, student_id`
        );
        res.json({ success: true, students: rows });
    } catch (err) {
        console.error('Error fetching students for admin:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching students.'
        });
    }
});

// --- Admin: Book management (basic CRUD) ---
// Create book
app.post('/admin/books', async (req, res) => {
    const {
        book_id, title, author, category,
        isbn, publisher, published_year, copies_total
    } = req.body;

    if (!book_id || !title) {
        return res.status(400).json({
            success: false,
            message: 'Book ID and title are required.'
        });
    }

    const totalCopies = Number(copies_total || 1);

    try {
        await pool.execute(
            `INSERT INTO books (
                book_id, title, author, category, isbn,
                publisher, published_year, copies_total, copies_available
             ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            [
                book_id.trim(),
                title.trim(),
                author || null,
                category || null,
                isbn || null,
                publisher || null,
                published_year || null,
                totalCopies,
                totalCopies
            ]
        );

        res.status(201).json({
            success: true,
            message: 'Book added successfully.'
        });
    } catch (err) {
        console.error('Error adding book:', err);
        res.status(500).json({
            success: false,
            message: 'Error adding book.'
        });
    }
});

// --- GET Book Details by ID ---
// GET /admin/books/:id
app.get('/admin/books/:id', async (req, res) => {
    const bookId = req.params.id;

    try {
        const [books] = await pool.execute(
            'SELECT * FROM books WHERE book_id = ?',
            [bookId]
        );

        if (books.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        res.json({
            success: true,
            book: books[0]
        });

    } catch (err) {
        console.error('Error fetching book:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching book details.'
        });
    }
});

// Update book basic details
app.put('/admin/books/:id', async (req, res) => {
    const bookId = req.params.id;
    const {
        title, author, category,
        isbn, publisher, published_year, copies_total, copies_available
    } = req.body;

    try {
        const [result] = await pool.execute(
            `UPDATE books SET
                title = COALESCE(?, title),
                author = COALESCE(?, author),
                category = COALESCE(?, category),
                isbn = COALESCE(?, isbn),
                publisher = COALESCE(?, publisher),
                published_year = COALESCE(?, published_year),
                copies_total = COALESCE(?, copies_total),
                copies_available = COALESCE(?, copies_available)
             WHERE book_id = ?`,
            [
                title || null,
                author || null,
                category || null,
                isbn || null,
                publisher || null,
                published_year || null,
                copies_total != null ? Number(copies_total) : null,
                copies_available != null ? Number(copies_available) : null,
                bookId
            ]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        res.json({
            success: true,
            message: 'Book updated successfully.'
        });
    } catch (err) {
        console.error('Error updating book:', err);
        res.status(500).json({
            success: false,
            message: 'Error updating book.'
        });
    }
});

// Delete book
app.delete('/admin/books/:id', async (req, res) => {
    const bookId = req.params.id;
    try {
        const [result] = await pool.execute(
            'DELETE FROM books WHERE book_id = ?',
            [bookId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        res.json({
            success: true,
            message: 'Book deleted successfully.'
        });
    } catch (err) {
        console.error('Error deleting book:', err);
        res.status(500).json({
            success: false,
            message: 'Error deleting book.'
        });
    }
});

// --- Public / Shared: Book search ---
// GET /books/search?query=&category=&availability=available|issued
app.get('/books/search', async (req, res) => {
    const { query, category, availability } = req.query;

    try {
        let sql = `SELECT book_id, title, author, category, copies_available, copies_total
                   FROM books
                   WHERE 1=1`;
        const params = [];

        if (query) {
            sql += ` AND (title LIKE ? OR author LIKE ? OR isbn LIKE ?)`;
            const like = `%${query}%`;
            params.push(like, like, like);
        }

        if (category) {
            sql += ` AND category = ?`;
            params.push(category);
        }

        if (availability === 'available') {
            sql += ` AND copies_available > 0`;
        } else if (availability === 'issued') {
            sql += ` AND copies_available = 0`;
        }

        sql += ` ORDER BY title ASC`;

        const [rows] = await pool.execute(sql, params);

        res.json({
            success: true,
            books: rows
        });
    } catch (err) {
        console.error('Error searching books:', err);
        res.status(500).json({
            success: false,
            message: 'Error searching books.'
        });
    }
});

// --- Student Dashboard Endpoints (Keep as is) ---
app.get('/student/:id/dashboard', async (req, res) => {
    const studentId = req.params.id;

    try {
        const [issued] = await pool.execute(
            "SELECT * FROM issued_books WHERE student_id = ?",
            [studentId]
        );

        const [reserved] = await pool.execute(
            "SELECT * FROM reserved_books WHERE student_id = ?",
            [studentId]
        );

        const [fines] = await pool.execute(
            "SELECT SUM(amount) AS totalFines FROM fines WHERE student_id = ? and is_paid = FALSE",
            [studentId]
        );

        res.json({
            success: true,
            issuedBooks: issued,
            reservedBooks: reserved,
            dueBooks: issued.filter(b => b.is_due),
            fines: fines[0].totalFines || 0
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ 
            success: false,
            message: 'Error fetching dashboard data.' 
        });
    }
});

// --- Other endpoints remain the same ---
app.get('/student/:id/reserved-books', async (req, res) => {
    const studentId = req.params.id;
    const [rows] = await pool.execute(
        "SELECT * FROM reserved_books WHERE student_id = ?",
        [studentId]
    );
    res.json(rows);
});

// --- Student: Reserve a Book ---
// POST /student/:id/reserve-book
// Body: { book_id }
app.post('/student/:id/reserve-book', async (req, res) => {
    const studentId = req.params.id;
    const { book_id } = req.body;

    if (!book_id) {
        return res.status(400).json({
            success: false,
            message: 'Book ID is required.'
        });
    }

    try {
        // Check if book exists
        const [books] = await pool.execute(
            'SELECT * FROM books WHERE book_id = ?',
            [book_id]
        );

        if (books.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        const book = books[0];

        // Check if student has already issued this book
        const [issuedCheck] = await pool.execute(
            'SELECT issue_id FROM issued_books WHERE student_id = ? AND book_id = ? AND is_due = FALSE',
            [studentId, book_id]
        );

        if (issuedCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You already have this book issued.'
            });
        }

        // Check if student has already reserved this book
        const [reservedCheck] = await pool.execute(
            'SELECT reserve_id FROM reserved_books WHERE student_id = ? AND book_id = ?',
            [studentId, book_id]
        );

        if (reservedCheck.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'You have already reserved this book.'
            });
        }

        // Create the reservation
        const [result] = await pool.execute(
            `INSERT INTO reserved_books (student_id, book_id, title, reserve_date)
             VALUES (?, ?, ?, CURDATE())`,
            [studentId, book_id, book.title]
        );

        res.status(201).json({
            success: true,
            message: `Book "${book.title}" reserved successfully! Admin will issue it when available.`,
            reserve_id: result.insertId
        });

    } catch (err) {
        console.error('Error creating reservation:', err);
        res.status(500).json({
            success: false,
            message: 'Error creating reservation.'
        });
    }
});

app.get('/student/:id/fines', async (req, res) => {
    const studentId = req.params.id;
    const [rows] = await pool.execute(
        "SELECT * FROM fines WHERE student_id = ?",
        [studentId]
    );
    res.json(rows);
});

// --- Admin Dashboard Stats ---
// GET /admin/dashboard/stats
app.get('/admin/dashboard/stats', async (_req, res) => {
    try {
        // Total Books
        const [booksCount] = await pool.execute('SELECT COUNT(*) AS count FROM books');
        const totalBooks = booksCount[0].count || 0;

        // Books Issued (total issued records)
        const [issuedCount] = await pool.execute('SELECT COUNT(*) AS count FROM issued_books');
        const booksIssued = issuedCount[0].count || 0;

        // Overdue Books (due_date < today OR is_due = TRUE)
        const [overdueCount] = await pool.execute(
            `SELECT COUNT(*) AS count FROM issued_books 
             WHERE (due_date < CURDATE() OR is_due = TRUE)`
        );
        const overdueBooks = overdueCount[0].count || 0;

        // Registered Users (students)
        const [studentsCount] = await pool.execute('SELECT COUNT(*) AS count FROM students');
        const registeredUsers = studentsCount[0].count || 0;

        res.json({
            success: true,
            stats: {
                totalBooks,
                booksIssued,
                overdueBooks,
                registeredUsers
            }
        });
    } catch (err) {
        console.error('Error fetching dashboard stats:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching dashboard statistics.'
        });
    }
});

// --- Public Stats (for homepage) ---
// GET /public/stats (no authentication required)
app.get('/public/stats', async (_req, res) => {
    try {
        // Total Books
        const [booksCount] = await pool.execute('SELECT COUNT(*) AS count FROM books');
        const totalBooks = booksCount[0].count || 0;

        // Active Members (registered students)
        const [studentsCount] = await pool.execute('SELECT COUNT(*) AS count FROM students');
        const activeMembers = studentsCount[0].count || 0;

        // Books Issued (currently in circulation)
        const [issuedCount] = await pool.execute('SELECT COUNT(*) AS count FROM issued_books');
        const booksIssued = issuedCount[0].count || 0;

        res.json({
            success: true,
            stats: {
                totalBooks,
                activeMembers,
                booksIssued
            }
        });
    } catch (err) {
        console.error('Error fetching public stats:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching statistics.'
        });
    }
});

// --- Admin: Book Issuing ---
// POST /admin/books/issue  body: { student_id, book_id, days = 30 }
app.post('/admin/books/issue', async (req, res) => {
    const { student_id, book_id, days = 30 } = req.body;
    console.log('Admin issuing book:', { student_id, book_id, days });

    if (!student_id || !book_id) {
        return res.status(400).json({
            success: false,
            message: 'Student ID and Book ID are required.'
        });
    }

    try {
        // Check if student exists
        const [students] = await pool.execute(
            'SELECT student_id FROM students WHERE student_id = ?',
            [student_id]
        );
        if (students.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Student not found.'
            });
        }

        // Check if book exists and is available
        const [books] = await pool.execute(
            'SELECT * FROM books WHERE book_id = ?',
            [book_id]
        );
        if (books.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Book not found.'
            });
        }

        const book = books[0];
        if (book.copies_available <= 0) {
            return res.status(400).json({
                success: false,
                message: 'Book is not available. All copies are currently issued.'
            });
        }

        // Check if student already has this book issued
        const [existing] = await pool.execute(
            'SELECT issue_id FROM issued_books WHERE student_id = ? AND book_id = ?',
            [student_id, book_id]
        );
        if (existing.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Student already has this book issued.'
            });
        }

        // Issue the book
        const issueDate = new Date();
        const dueDate = new Date(issueDate);
        dueDate.setDate(dueDate.getDate() + parseInt(days));

        await pool.execute(
            `INSERT INTO issued_books (student_id, book_id, title, author, issue_date, due_date, is_due)
             VALUES (?, ?, ?, ?, CURDATE(), DATE_ADD(CURDATE(), INTERVAL ? DAY), FALSE)`,
            [student_id, book_id, book.title, book.author, days]
        );

        // Decrease available copies
        await pool.execute(
            'UPDATE books SET copies_available = copies_available - 1 WHERE book_id = ?',
            [book_id]
        );

        // Remove reservation if exists
        await pool.execute(
            'DELETE FROM reserved_books WHERE student_id = ? AND book_id = ?',
            [student_id, book_id]
        );

        res.status(201).json({
            success: true,
            message: `Book "${book.title}" issued successfully. Due date: ${dueDate.toISOString().split('T')[0]}.`
        });
    } catch (err) {
        console.error('Error issuing book:', err);
        res.status(500).json({
            success: false,
            message: 'Error issuing book.'
        });
    }
});

// --- Admin: Reservations Management ---
// GET /admin/reservations
app.get('/admin/reservations', async (_req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT r.reserve_id, r.student_id, r.book_id, r.title, r.reserve_date,
                    s.first_name, s.last_name, s.email,
                    b.copies_available
             FROM reserved_books r
             LEFT JOIN students s ON r.student_id = s.student_id
             LEFT JOIN books b ON r.book_id = b.book_id
             ORDER BY r.reserve_date ASC`
        );
        res.json({ success: true, reservations: rows });
    } catch (err) {
        console.error('Error fetching reservations:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching reservations.'
        });
    }
});

// DELETE /admin/reservations/:id
app.delete('/admin/reservations/:id', async (req, res) => {
    const reserveId = req.params.id;
    try {
        const [result] = await pool.execute(
            'DELETE FROM reserved_books WHERE reserve_id = ?',
            [reserveId]
        );
        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Reservation not found.'
            });
        }
        res.json({
            success: true,
            message: 'Reservation cancelled successfully.'
        });
    } catch (err) {
        console.error('Error cancelling reservation:', err);
        res.status(500).json({
            success: false,
            message: 'Error cancelling reservation.'
        });
    }
});

// --- Admin: Renewals Management ---
// GET /admin/issued-books (all issued books for renewal management)
app.get('/admin/issued-books', async (_req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT i.issue_id, i.student_id, i.book_id, i.title, i.author,
                    i.issue_date, i.due_date, i.is_due,
                    s.first_name, s.last_name, s.email
             FROM issued_books i
             LEFT JOIN students s ON i.student_id = s.student_id
             ORDER BY i.due_date ASC`
        );
        res.json({ success: true, issuedBooks: rows });
    } catch (err) {
        console.error('Error fetching issued books:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching issued books.'
        });
    }
});

// PUT /admin/issued-books/:id/renew  body: { days = 30 }
app.put('/admin/issued-books/:id/renew', async (req, res) => {
    const issueId = req.params.id;
    const { days = 30 } = req.body;

    try {
        // Get current due date
        const [current] = await pool.execute(
            'SELECT due_date FROM issued_books WHERE issue_id = ?',
            [issueId]
        );
        if (current.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Issued book record not found.'
            });
        }

        // Extend due date
        const [result] = await pool.execute(
            `UPDATE issued_books
             SET due_date = DATE_ADD(due_date, INTERVAL ? DAY),
                 is_due = FALSE
             WHERE issue_id = ?`,
            [days, issueId]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({
                success: false,
                message: 'Issued book record not found.'
            });
        }

        res.json({
            success: true,
            message: `Book renewed successfully. Extended by ${days} days.`
        });
    } catch (err) {
        console.error('Error renewing book:', err);
        res.status(500).json({
            success: false,
            message: 'Error renewing book.'
        });
    }
});

// --- Student: Request Book Renewal ---
// POST /student/:id/request-renewal
// Body: { issue_id }
app.post('/student/:id/request-renewal', async (req, res) => {
    const studentId = req.params.id;
    const { issue_id } = req.body;

    if (!issue_id) {
        return res.status(400).json({
            success: false,
            message: 'Issue ID is required.'
        });
    }

    try {
        // Get the issued book details
        const [issuedBook] = await pool.execute(
            `SELECT ib.*, b.title, b.author
             FROM issued_books ib
             JOIN books b ON ib.book_id = b.book_id
             WHERE ib.issue_id = ? AND ib.student_id = ?`,
            [issue_id, studentId]
        );

        if (issuedBook.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Issued book record not found.'
            });
        }

        const book = issuedBook[0];

        // Check if days left are between 1 and 30
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const dueDate = new Date(book.due_date);
        const diffTime = dueDate - today;
        const daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (daysLeft < 1 || daysLeft > 30) {
            return res.status(400).json({
                success: false,
                message: `Can only request renewal when 1-30 days remain. Currently ${daysLeft > 30 ? 'too many' : 'no'} days left.`
            });
        }

        // Check if there's already a pending request
        const [existingRequest] = await pool.execute(
            `SELECT * FROM renewal_requests 
             WHERE issue_id = ? AND status = 'pending'`,
            [issue_id]
        );

        if (existingRequest.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'A renewal request for this book is already pending.'
            });
        }

        // Create renewal request
        const [result] = await pool.execute(
            `INSERT INTO renewal_requests 
             (issue_id, student_id, book_id, title, author, current_due_date)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [issue_id, studentId, book.book_id, book.title, book.author, book.due_date]
        );

        res.json({
            success: true,
            message: 'Renewal request submitted successfully. Admin will review based on availability.',
            request_id: result.insertId
        });

    } catch (err) {
        console.error('Error creating renewal request:', err);
        res.status(500).json({
            success: false,
            message: 'Error creating renewal request.'
        });
    }
});

// --- Admin: Get All Renewal Requests ---
// GET /admin/renewal-requests?status=pending
app.get('/admin/renewal-requests', async (req, res) => {
    const { status } = req.query; // Can be 'pending', 'approved', 'rejected'

    try {
        let query = `SELECT rr.*, s.first_name, s.last_name, s.email, b.copies_available
                     FROM renewal_requests rr
                     LEFT JOIN students s ON rr.student_id = s.student_id
                     LEFT JOIN books b ON rr.book_id = b.book_id`;
        
        const params = [];
        if (status) {
            query += ` WHERE rr.status = ?`;
            params.push(status);
        }
        
        query += ` ORDER BY rr.requested_at DESC`;

        const [requests] = await pool.execute(query, params);

        res.json({
            success: true,
            requests
        });

    } catch (err) {
        console.error('Error fetching renewal requests:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching renewal requests.'
        });
    }
});

// --- Admin: Approve/Reject Renewal Request ---
// PUT /admin/renewal-requests/:request_id
// Body: { action: 'approve' or 'reject', rejection_reason?: string, adminUsername: string }
app.put('/admin/renewal-requests/:request_id', async (req, res) => {
    const requestId = req.params.request_id;
    const { action, rejection_reason, adminUsername } = req.body;

    if (!action || !['approve', 'reject'].includes(action)) {
        return res.status(400).json({
            success: false,
            message: 'Valid action (approve/reject) and admin username are required.'
        });
    }

    if (action === 'reject' && !rejection_reason) {
        return res.status(400).json({
            success: false,
            message: 'Rejection reason is required when rejecting.'
        });
    }

    try {
        // Get renewal request details
        const [renewalRequest] = await pool.execute(
            'SELECT * FROM renewal_requests WHERE request_id = ?',
            [requestId]
        );

        if (renewalRequest.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Renewal request not found.'
            });
        }

        const request = renewalRequest[0];

        if (request.status !== 'pending') {
            return res.status(400).json({
                success: false,
                message: `This request has already been ${request.status}.`
            });
        }

        if (action === 'approve') {
            // Check book availability
            const [bookInfo] = await pool.execute(
                'SELECT copies_available FROM books WHERE book_id = ?',
                [request.book_id]
            );

            // Update the issued book due date (extend by 30 days)
            const [updateResult] = await pool.execute(
                `UPDATE issued_books
                 SET due_date = DATE_ADD(due_date, INTERVAL 30 DAY),
                     is_due = FALSE
                 WHERE issue_id = ?`,
                [request.issue_id]
            );

            // Mark renewal request as approved
            await pool.execute(
                `UPDATE renewal_requests
                 SET status = 'approved', approved_by = ?, approved_at = NOW()
                 WHERE request_id = ?`,
                [adminUsername, requestId]
            );

            res.json({
                success: true,
                message: 'Renewal request approved. Book due date extended by 30 days.'
            });

        } else if (action === 'reject') {
            // Mark renewal request as rejected
            await pool.execute(
                `UPDATE renewal_requests
                 SET status = 'rejected', approved_by = ?, approved_at = NOW(), rejection_reason = ?
                 WHERE request_id = ?`,
                [adminUsername, rejection_reason, requestId]
            );

            res.json({
                success: true,
                message: 'Renewal request rejected.'
            });
        }

    } catch (err) {
        console.error('Error processing renewal request:', err);
        res.status(500).json({
            success: false,
            message: 'Error processing renewal request.'
        });
    }
});

// --- Admin: Reports ---
// GET /admin/reports
app.get('/admin/reports', async (_req, res) => {
    try {
        // Total books
        const [booksCount] = await pool.execute('SELECT COUNT(*) AS count FROM books');
        const totalBooks = booksCount[0].count || 0;

        // Total students
        const [studentsCount] = await pool.execute('SELECT COUNT(*) AS count FROM students');
        const totalStudents = studentsCount[0].count || 0;

        // Books issued
        const [issuedCount] = await pool.execute('SELECT COUNT(*) AS count FROM issued_books');
        const booksIssued = issuedCount[0].count || 0;

        // Overdue books
        const [overdueCount] = await pool.execute(
            `SELECT COUNT(*) AS count FROM issued_books 
             WHERE due_date < CURDATE() OR is_due = TRUE`
        );
        const overdueBooks = overdueCount[0].count || 0;

        // Total fines
        const [finesTotal] = await pool.execute(
            'SELECT SUM(amount) AS total FROM fines WHERE is_paid = FALSE OR is_paid IS NULL'
        );
        const totalFines = finesTotal[0].total || 0;

        // Reserved books
        const [reservedCount] = await pool.execute('SELECT COUNT(*) AS count FROM reserved_books');
        const reservedBooks = reservedCount[0].count || 0;

        // Most borrowed books
        const [popularBooks] = await pool.execute(
            `SELECT book_id, title, author, COUNT(*) AS borrow_count
             FROM issued_books
             GROUP BY book_id, title, author
             ORDER BY borrow_count DESC
             LIMIT 10`
        );

        res.json({
            success: true,
            report: {
                totalBooks,
                totalStudents,
                booksIssued,
                overdueBooks,
                totalFines,
                reservedBooks,
                popularBooks
            }
        });
    } catch (err) {
        console.error('Error generating report:', err);
        res.status(500).json({
            success: false,
            message: 'Error generating report.'
        });
    }
});

// --- Feedback ---
// POST /feedback  body: { student_id, subject, message, rating }
app.post('/feedback', async (req, res) => {
    const { student_id, subject, message, rating = 5 } = req.body;

    if (!student_id || !subject || !message) {
        return res.status(400).json({
            success: false,
            message: 'Student ID, subject, and message are required.'
        });
    }

    try {
        await pool.execute(
            'INSERT INTO feedback (student_id, subject, message, rating) VALUES (?, ?, ?, ?)',
            [student_id, subject, message, Math.min(5, Math.max(1, parseInt(rating) || 5))]
        );

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully.'
        });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        res.status(500).json({
            success: false,
            message: 'Error submitting feedback.'
        });
    }
});

// POST /student/:id/feedback  body: { subject, message, rating, type, anonymous }
app.post('/student/:id/feedback', async (req, res) => {
    const studentId = req.params.id;
    const { subject, message, rating = 5, type, anonymous = false } = req.body;

    if (!subject || !message) {
        return res.status(400).json({
            success: false,
            message: 'Subject and message are required.'
        });
    }

    try {
        await pool.execute(
            'INSERT INTO feedback (student_id, subject, message, rating) VALUES (?, ?, ?, ?)',
            [studentId, subject, message, Math.min(5, Math.max(1, parseInt(rating) || 5))]
        );

        res.status(201).json({
            success: true,
            message: 'Feedback submitted successfully.'
        });
    } catch (err) {
        console.error('Error submitting feedback:', err);
        res.status(500).json({
            success: false,
            message: 'Error submitting feedback.'
        });
    }
});

// GET /admin/feedback
app.get('/admin/feedback', async (_req, res) => {
    try {
        const [rows] = await pool.execute(
            `SELECT f.feedback_id, f.student_id, f.subject, f.message, f.rating, f.created_at,
                    s.first_name, s.last_name, s.email
             FROM feedback f
             LEFT JOIN students s ON f.student_id = s.student_id
             ORDER BY f.created_at DESC`
        );
        res.json({ success: true, feedback: rows });
    } catch (err) {
        console.error('Error fetching feedback:', err);
        res.status(500).json({
            success: false,
            message: 'Error fetching feedback.'
        });
    }
});

// changes made on 8-DEC-2025
app.get('/student/:id/issued-books', async (req, res) => {
    const studentId = req.params.id;

    try {
        // Fetch all issued books for this student and join with books table
        const [allBooks] = await pool.execute(
            `SELECT ib.*, b.title, b.author
             FROM issued_books ib
             JOIN books b ON ib.book_id = b.book_id
             WHERE ib.student_id = ?`,
            [studentId]
        );

        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

        // Helper function to parse MySQL date/datetime
        const parseDate = (dateStr) => {
            if (!dateStr) return null;
            // MySQL returns dates as YYYY-MM-DD or YYYY-MM-DD HH:MM:SS
            const d = new Date(dateStr);
            // If parsing failed, try alternative format
            if (isNaN(d.getTime())) {
                const parts = dateStr.split('-');
                if (parts.length >= 3) {
                    return new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
                }
            }
            return d;
        };

        // Currently issued books are the ones that are not returned (is_due = 0 means still borrowed)
        const currentlyIssued = allBooks.filter(b => !b.is_due);
        const overdueBooks = currentlyIssued.filter(b => {
            const dueDate = parseDate(b.due_date);
            return dueDate && dueDate < today;
        });
        const totalBooksRead = allBooks.filter(b => b.is_due).length; // books already returned

        // Add daysLeft field dynamically
        currentlyIssued.forEach(b => {
            const due = parseDate(b.due_date);
            if (due) {
                const diffTime = due - today;
                b.daysLeft = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
            } else {
                b.daysLeft = null; // Mark as invalid if parsing failed
            }
        });

        res.json({
            currentlyIssued,
            overdueCount: overdueBooks.length,
            totalBooksRead,
            totalIssuedCount: currentlyIssued.length
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Failed to fetch issued books" });
    }
});
app.get('/student/:id/issued-books-history', async (req, res) => {
    const studentId = req.params.id;

    try {
        const [historyBooks] = await pool.execute(
            `SELECT ib.*, b.title, b.author
             FROM issued_books ib
             JOIN books b ON ib.book_id = b.book_id
             WHERE ib.student_id = ? AND ib.is_due = 1
             ORDER BY ib.due_date DESC`,
            [studentId]
        );

        res.json(historyBooks);

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Failed to fetch issued books history' });
    }
});

// --- Start Server ---


// --- Logout endpoint (best-effort client notification) ---
// Expects: { studentId?, adminUsername? }
app.post('/logout', (req, res) => {
    try {
        console.log('Logout notification received:', req.body);
        // Since this app currently uses client-side storage for auth,
        // this endpoint is informational only. In a future change
        // we should issue and manage server-side sessions/tokens here.
        res.json({ success: true, message: 'Logged out (notification acknowledged).' });
    } catch (err) {
        console.error('Error handling logout:', err);
        res.status(500).json({ success: false, message: 'Server error during logout.' });
    }
});

// 8. START SERVER (CRITICAL PART!)
// ======================

const HOST = '0.0.0.0'; // ← MUST BE 0.0.0.0 for Railway!

console.log(`🔧 Starting server on ${HOST}:${PORT}`);

const server = app.listen(PORT, HOST, () => {
  console.log('='.repeat(60));
  console.log('✅ SERVER STARTED SUCCESSFULLY!');
  console.log(`📡 Listening on: http://${HOST}:${PORT}`);
  console.log(`🌍 External URL: https://your-project.up.railway.app`);
  console.log(`🏥 Health checks:`);
  console.log(`   • http://${HOST}:${PORT}/`);
  console.log(`   • http://${HOST}:${PORT}/health`);
  console.log(`   • http://${HOST}:${PORT}/api/health`);
  const address = server.address();
  console.log(`📊 Server address:`, address);
});

// Handle errors
server.on('error', (error) => {
  console.error('❌ Server error:', error);
  if (error.code === 'EADDRINUSE') {
    console.log(`Port ${PORT} is already in use. Trying ${PORT + 1}...`);
    // Try different port
    app.listen(PORT + 1, HOST, () => {
      console.log(`Server started on port ${PORT + 1}`);
    });
  }
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down...');
  server.close(() => {
    console.log('Server closed');
  });
});