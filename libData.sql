

-- 1. FIRST: Clear existing data (optional, but helpful for testing)
USE library;

INSERT INTO students (student_id, first_name, last_name, email, phone, department, semester, enrollment_year, address, username, password2) 
VALUES
('STU001', 'John', 'Doe', 'john.doe@example.com', '1234567890', 'Computer Science', 3, 2023, '123 Main St', 'johndoe', '$2b$10$hashedexample123456789012345678'),
('STU002', 'Jane', 'Smith', 'jane.smith@example.com', '0987654321', 'Mathematics', 2, 2023, '456 Elm St', 'janesmith', '$2b$10$hashedexample123456789012345678'),
('STU003', 'Alice', 'Johnson', 'alice.j@example.com', '5551234567', 'Engineering', 4, 2022, '789 Oak St', 'alicej', '$2b$10$hashedexample123456789012345678'),
('STU004', 'Bob', 'Brown', 'bob.brown@example.com', '5559876543', 'Physics', 1, 2024, '321 Pine St', 'bobbrown', '$2b$10$hashedexample123456789012345678');

-- 3. Insert ALL books (must exist before issued_books/reference)
-- Note: All books that will be referenced must be inserted here
INSERT INTO books (book_id, title, author, category, isbn, publisher, published_year, copies_total, copies_available)
VALUES
('B001', 'Introduction to Algorithms', 'Thomas H. Cormen', 'Computer Science', '9780262033848', 'MIT Press', 2009, 5, 5),
('B002', 'Clean Code', 'Robert C. Martin', 'Programming', '9780132350884', 'Prentice Hall', 2008, 5, 5),
('B003', 'Database System Concepts', 'Abraham Silberschatz', 'Computer Science', '9780078022159', 'McGraw-Hill', 2010, 5, 5),
('B004', 'You Don''t Know JS', 'Kyle Simpson', 'JavaScript', '9781491904244', "O'Reilly Media", 2015, 5, 5),
('B005', 'Linear Algebra Done Right', 'Sheldon Axler', 'Mathematics', '9783319110790', 'Springer', 2015, 5, 5),
('B006', 'Operating System Concepts', 'Abraham Silberschatz', 'Computer Science', '9781118063330', 'Wiley', 2012, 5, 5),
('B007', 'JavaScript: The Good Parts', 'Douglas Crockford', 'JavaScript', '9780596517748', "O'Reilly Media", 2008, 5, 5),
('B008', 'Python Crash Course', 'Eric Matthes', 'Python', '9781593276034', 'No Starch Press', 2015, 5, 5),
('B009', 'The Pragmatic Programmer', 'Andrew Hunt', 'Programming', '9780201616224', 'Addison-Wesley', 1999, 5, 5);

-- 4. NOW insert issued books (both students and books exist)
INSERT INTO issued_books (student_id, book_id, title, author, issue_date, due_date, is_due)
VALUES
('STU001', 'B001', 'Introduction to Algorithms', 'Thomas H. Cormen', '2025-01-10', '2025-01-25', FALSE),
('STU001', 'B005', 'Linear Algebra Done Right', 'Sheldon Axler', '2025-01-05', '2025-01-20', TRUE),
('STU002', 'B003', 'Database System Concepts', 'Abraham Silberschatz', '2025-01-11', '2025-01-26', FALSE),
('STU003', 'B002', 'Clean Code', 'Robert C. Martin', '2025-01-09', '2025-01-24', TRUE),
('STU004', 'B004', 'You Don''t Know JS', 'Kyle Simpson', '2025-01-14', '2025-01-29', FALSE);

-- 5. Insert reserved books
INSERT INTO reserved_books (student_id, book_id, title, reserve_date)
VALUES
('STU001', 'B007', 'JavaScript: The Good Parts', '2025-01-15'),
('STU002', 'B008', 'Python Crash Course', '2025-01-16'),
('STU003', 'B006', 'Operating System Concepts', '2025-01-17'),
('STU004', 'B009', 'The Pragmatic Programmer', '2025-01-18');

-- 6. Insert fines
INSERT INTO fines (student_id, amount, description, date_issued)
VALUES
('STU001', 150.00, 'Late return of "Linear Algebra Done Right"', '2025-01-22'),
('STU003', 200.00, 'Late return of "Clean Code"', '2025-01-23'),
('STU004', 100.00, 'Book damaged: "The Pragmatic Programmer"', '2025-01-24');