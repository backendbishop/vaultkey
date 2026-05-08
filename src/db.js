const users = [];

function findUser(username) {
  return users.find((u) => u.username === username);
  }

  function createUser(username, hashedPassword) {
    const user = { id: Date.now(), username, password: hashedPassword };
      users.push(user);
        return user;
        }

        module.exports = { findUser, createUser };