const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');

const app = express();
const port = 3001;

// Middleware
app.use(bodyParser.json());
app.use(cors());

// PostgreSQL Pool Setup
const pool = new Pool({
  user: 'postgres',
  host: 'localhost',
  database: 'myapp',
  password: 'postgres',
  port: 5432,
});

// JWT Secret
const jwtSecret = 'your_jwt_secret';

// Signup Route
app.post('/api/user/signup', async (req, res) => {
  const { rollno, password, name, semester, course, dept, collegename, mobile_no, mailid } = req.body;

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const result = await pool.query(
      'INSERT INTO users (rollno, password, name, semester, course, dept, collegename, mobile_no, mailid) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, rollno, name, course, dept, collegename, mobile_no, mailid, semester, update_count',
      [rollno, hashedPassword, name, semester, course, dept, collegename, mobile_no, mailid]
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '1h' });

    res.status(201).json({ user, token });
  } catch (error) {
    console.error('Error during signup:', error);
    res.status(500).json({ error: 'Server error during signup' });
  }
});

// Login Route
app.post('/api/user/login', async (req, res) => {
  const { rollno, password } = req.body;

  try {
    const result = await pool.query('SELECT * FROM users WHERE rollno = $1', [rollno]);

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign({ id: user.id }, jwtSecret, { expiresIn: '1h' });

    res.status(200).json({ user, token });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// Middleware to verify JWT
function verifyToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(403).json({ error: 'Token required' });

  jwt.verify(token, jwtSecret, (err, decoded) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.userId = decoded.id;
    next();
  });
}

// Get User Info
app.get('/api/user/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [req.userId]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error fetching user info:', error);
    res.status(500).json({ error: 'Server error fetching user info' });
  }
});

// Update Profile Route (Limit to 3 Updates)
app.put('/api/user/:id', verifyToken, async (req, res) => {
  const { id } = req.params;
  const { name, course, dept, mobile_no, mailid, semester, collegename } = req.body;

  try {
    // Check current update count
    const userCheck = await pool.query('SELECT update_count FROM users WHERE id = $1', [id]);

    if (userCheck.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    const updateCount = userCheck.rows[0].update_count;

    if (updateCount >= 3) {
      return res.status(403).json({ error: 'Profile update limit reached' });
    }

    // Perform update
    const result = await pool.query(
      'UPDATE users SET name = $1, course = $2, dept = $3, mobile_no = $4, mailid = $5, semester = $6, collegename = $7, update_count = update_count + 1 WHERE id = $8 RETURNING id, rollno, name, course, dept, mobile_no, mailid, semester, collegename, update_count',
      [name, course, dept, mobile_no, mailid, semester, collegename, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Error updating profile:', error);
    res.status(500).json({ error: 'Server error updating profile' });
  }
});
app.put('/api/user/:id/password', async (req, res) => {
  const { oldPassword, newPassword } = req.body;
  const userId = req.params.id;

  try {
    // Fetch the user from the database
    const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Compare old password
    const isMatch = await bcrypt.compare(oldPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ error: 'Incorrect old password' });
    }

    // Hash the new password and update in the database
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password = $1 WHERE id = $2', [hashedPassword, userId]);

    res.json({ message: 'Password updated successfully' });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to update password' });
  }
});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
