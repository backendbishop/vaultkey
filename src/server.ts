import 'dotenv/config';
import { createApp } from './app.js';
import { MemoryUserStore } from './stores/memory.js';

const PORT = Number(process.env.PORT) || 3001;

const userStore = new MemoryUserStore();
const app = createApp(userStore);

app.listen(PORT, () => {
  console.log(`Vaultkey running on http://localhost:${PORT}`);
});
