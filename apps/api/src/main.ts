import { createApp } from './app';
import { readConfig } from './config';
async function main() {
  const config = readConfig();
  const app = await createApp(config);
  await app.listen(config.port, '0.0.0.0');
  console.log(`Tabletop API ready on http://localhost:${config.port}`);
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
