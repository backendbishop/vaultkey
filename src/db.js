const users = [];

const findUser = (username) => users.find(u => u.username === username);

const createUser = (username, hashedPassword) => {
  const user = { id: Date.now(), username, password: hashedPassword };
  users.push(user);
  return user;
};

module.exports = { findUser, createUser };