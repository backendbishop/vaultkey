const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { findUser, createUser } = require('./db');

const SECRET = process.env.JWT_SECRET;

const register = async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ error: 'Username and password required' });
  if (findUser(username)) return res.status(409).json({ error: 'User already exists' });
  const hashed = await bcrypt.hash(password, 10);
  const user = createUser(username, hashed);
  res.status(201).json({ message: 'User created', userId: user.id });
};

const login = async (req, res) => {
  const { username, password } = req.body;
  const user = findUser(username);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const match = await bcrypt.compare(password, user.password);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, username }, SECRET, { expiresIn: '1h' });
  res.json({ token });
};

module.exports = { register, login, SECRET };