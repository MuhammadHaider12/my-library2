pp.get('/student/:id/dashboard', async (req, res) => {
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
            "SELECT SUM(amount) AS totalFines FROM fines WHERE student_id = ?",
            [studentId]
        );

        res.json({
            issuedBooks: issued,
            reservedBooks: reserved,
            dueBooks: issued.filter(b => b.is_due),
            fines: fines[0].totalFines ?? 0
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ message: 'Dashboard fetch error' });
    }
});

app.get('/student/:id/issued-books', async (req, res) => {
    const studentId = req.params.id;

    const [rows] = await pool.execute(
        "SELECT * FROM issued_books WHERE student_id = ?",
        [studentId]
    );

    res.json(rows);
});

app.get('/student/:id/reserved-books', async (req, res) => {
    const studentId = req.params.id;

    const [rows] = await pool.execute(
        "SELECT * FROM reserved_books WHERE student_id = ?",
        [studentId]
    );

    res.json(rows);
});

app.get('/student/:id/fines', async (req, res) => {
    const studentId = req.params.id;

    const [rows] = await pool.execute(
        "SELECT * FROM fines WHERE student_id = ?",
        [studentId]
    );

    res.json(rows);
});
