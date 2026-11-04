const fs = require('node:fs/promises');
const path = require('node:path');
const { generateImageAsync } = require('@expo/image-utils');
async function main() {
  const root = path.resolve(__dirname, '..');
  const output = path.join(root, 'public/icons');
  await fs.mkdir(output, { recursive: true });
  for (const [name, size] of [['icon-192-v2.png', 192], ['icon-512-v2.png', 512], ['apple-touch-icon-v2.png', 180]]) {
    const { source } = await generateImageAsync({ projectRoot: root }, {
      src: path.join(root, 'assets/branding/myscp-app-icon-v2.png'), width: size, height: size, resizeMode: 'contain', backgroundColor: '#2563EB'
    });
    await fs.writeFile(path.join(output, name), source);
  }
  console.log('Generated PWA/Home Screen icons from the mySCP app artwork.');
}
main().catch(error => { console.error(error); process.exitCode = 1; });
