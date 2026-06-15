const fs = require('fs');
const path = require('path');

const projectRoot = process.cwd();
const srcBase = path.join(projectRoot, 'node_modules', '@tabler', 'icons', 'icons', 'outline');
const destBase = path.join(projectRoot, 'public', 'icons', 'tabler');

// Add or remove icon filenames as needed.
const icons = [
  'binary-tree-2.svg',
  'check.svg',
  'chevron-left.svg',
  'chevron-right.svg',
  'device-floppy.svg',
  'download.svg',
  'dots-vertical.svg',
  'edit.svg',
  'eraser.svg',
  'folder.svg',
  'home.svg',
  'layout-dashboard.svg',
  'photo-search.svg',
  'player-play.svg',
  'player-stop.svg',
  'player-track-next.svg',
  'refresh.svg',
  'scan.svg',
  'screen-share.svg',
  'search.svg',
  'settings.svg',
  'sparkles.svg',
  'star.svg',
  'terminal-2.svg',
  'trash.svg',
  'trash-x.svg',
  'upload.svg',
  'user.svg',
  'x.svg',
  'bell.svg',
  'plus.svg'
];

if (!fs.existsSync(srcBase)) {
  console.error('Tabler icon source not found:', srcBase);
  process.exit(1);
}

fs.mkdirSync(destBase, { recursive: true });

const copied = [];
const missing = [];

for (const icon of icons) {
  const src = path.join(srcBase, icon);
  const dest = path.join(destBase, icon);

  if (!fs.existsSync(src)) {
    missing.push(icon);
    continue;
  }

  fs.copyFileSync(src, dest);
  copied.push(icon);
}

console.log(`Copied ${copied.length} icon(s) to ${destBase}`);
if (copied.length > 0) {
  console.log(copied.join(', '));
}

if (missing.length > 0) {
  console.warn(`Missing ${missing.length} icon(s): ${missing.join(', ')}`);
}
