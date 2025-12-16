create database if not exists library;
use library;
CREATE TABLE books (
    book_id VARCHAR(20) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    author VARCHAR(100),
    category VARCHAR(100),
    isbn VARCHAR(30),
    publisher VARCHAR(100),
    published_year YEAR,
    copies_total INT DEFAULT 1,
    copies_available INT DEFAULT 1
);
CREATE TABLE students (
    -- Personal Information
    student_id VARCHAR(20) PRIMARY KEY, -- Using Student ID as Primary Key
    first_name VARCHAR(50) NOT NULL,
    last_name VARCHAR(50) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE, -- Email should be unique for login/contact
    phone VARCHAR(20),
    
    -- Student Academic Information
    department VARCHAR(50),
    semester INT,
    enrollment_year YEAR,
    
    -- Address
    address TEXT,
    
    -- Login Credentials
    username VARCHAR(50) NOT NULL UNIQUE, -- Username must be unique for login
    password2 VARCHAR(255) NOT NULL, -- Store hashed password, NOT the plain text password
    
    -- Registration/Metadata
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);


CREATE TABLE issued_books (
    issue_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20),
    book_id VARCHAR(20),
    title VARCHAR(150),
    author VARCHAR(100),
    issue_date DATE,
    due_date DATE,
    is_due BOOLEAN DEFAULT FALSE,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (book_id) References books(book_id)
);
CREATE TABLE reserved_books (
    reserve_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20),
    book_id VARCHAR(20),
    title VARCHAR(150),
    reserve_date DATE,
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (book_id) References books(book_id)
);
CREATE TABLE fines (
    fine_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20),
    amount DECIMAL(10,2),
    description TEXT,
    date_issued DATE,
    -- Physical payment tracking
    is_paid BOOLEAN DEFAULT FALSE,
    paid_date DATE,
    paid_by_admin VARCHAR(50),
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Admins table for secure admin authentication
CREATE TABLE IF NOT EXISTS admins (
    admin_id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Feedback table for student feedback
CREATE TABLE IF NOT EXISTS feedback (
    feedback_id INT AUTO_INCREMENT PRIMARY KEY,
    student_id VARCHAR(20),
    subject VARCHAR(200),
    message TEXT,
    rating INT DEFAULT 5,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (student_id) REFERENCES students(student_id)
);

-- Renewal requests table for book renewal approval system
CREATE TABLE IF NOT EXISTS renewal_requests (
    request_id INT AUTO_INCREMENT PRIMARY KEY,
    issue_id INT NOT NULL,
    student_id VARCHAR(20),
    book_id VARCHAR(20),
    title VARCHAR(150),
    author VARCHAR(100),
    current_due_date DATE,
    requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    approved_by VARCHAR(50),
    approved_at TIMESTAMP NULL,
    rejection_reason TEXT,
    FOREIGN KEY (issue_id) REFERENCES issued_books(issue_id),
    FOREIGN KEY (student_id) REFERENCES students(student_id),
    FOREIGN KEY (book_id) REFERENCES books(book_id)
);
