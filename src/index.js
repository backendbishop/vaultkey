const express = require("express");
const { register, login } = require("./auth");
const { protect } = require("./middleware");

const app = express();
const PORT = 3001;

app.use(express.json());

app.post("/register", register);
app.post("/login", login);

app.get("/profile", protect, (req, res) => {
  res.json({ message: `Welcome ${req.user.username}`, user: req.user });
  });

  app.listen(PORT, () => {
    console.log(`Vaultkey running on http://localhost:${PORT}`);
    });