import 'dotenv/config';
import { createApp } from './app.js';
import { SqliteUserStore } from './stores/sqlite.js';

const PORT = Number(process.env.PORT) || 3001;
const DB_PATH = process.env.DB_PATH || './data/vaultkey.db';

const userStore = new SqliteUserStore(DB_PATH);
const app = createApp(userStore);

app.listen(PORT, () => {
  console.log(`Vaultkey running on http://localhost:${PORT}`);
  console.log(`Database: ${DB_PATH}`);
});
