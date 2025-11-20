const fs = require('fs-extra');
const path = require('path');

const FILE = path.join(__dirname, '../../dados/theme.json');

async function getTheme() {
  try {
    await fs.ensureFile(FILE);
    const t = await fs.readJson(FILE);
    return t?.theme || 'light';
  } catch {
    return 'light';
  }
}

async function setTheme(theme) {
  await fs.writeJson(FILE, { theme }, { spaces: 2 });
  return { success: true, theme };
}

module.exports = { getTheme, setTheme };