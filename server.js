const express = require('express');
const { Pool } = require('pg');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');

const app = express();
const port = 3000;

// PostgreSQL connection
const pool = new Pool({
  user: 'your_username',
  host: 'localhost',
  database: 'assignment_planner',
  password: 'your_password',
  port: 5432,
});

app.use(cors());
app.use(bodyParser.json());

// Routes

// Get all assignments for a user
app.get('/api/assignments/:userId', async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await pool.query('SELECT * FROM assignments WHERE user_id = $1', [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Create assignment
app.post('/api/assignments', async (req, res) => {
  const { title, description, due_date, user_id, reminder } = req.body;
  try {
    const result = await pool.query(
      'INSERT INTO assignments (title, description, due_date, user_id, reminder) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [title, description, due_date, user_id, reminder]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update assignment
app.put('/api/assignments/:id', async (req, res) => {
  const { id } = req.params;
  const { title, description, due_date, completed, reminder } = req.body;
  try {
    const result = await pool.query(
      'UPDATE assignments SET title = $1, description = $2, due_date = $3, completed = $4, reminder = $5 WHERE id = $6 RETURNING *',
      [title, description, due_date, completed, reminder, id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete assignment
app.delete('/api/assignments/:id', async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM assignments WHERE id = $1', [id]);
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (result.rows.length > 0) {
      const user = result.rows[0];
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (isValidPassword) {
        res.json({ user: { id: user.id, name: user.name, email: user.email } });
      } else {
        res.status(401).json({ error: 'Invalid credentials' });
      }
    } else {
      res.status(401).json({ error: 'Invalid credentials' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User signup
app.post('/api/signup', async (req, res) => {
  const { name, email, password } = req.body;
  try {
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await pool.query(
      'INSERT INTO users (name, email, password_hash) VALUES ($1, $2, $3) RETURNING id, name, email',
      [name, email, hashedPassword]
    );
    res.json({ user: result.rows[0] });
  } catch (err) {
    if (err.code === '23505') { // unique violation
      res.status(409).json({ error: 'User already exists' });
    } else {
      console.error(err);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});