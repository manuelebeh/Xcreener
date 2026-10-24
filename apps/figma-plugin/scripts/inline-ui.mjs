// Figma loads the UI as an HTML string, so the bundled script must be inlined.
import { readFileSync, writeFileSync } from 'node:fs';

const html = readFileSync('ui.html', 'utf8');
const script = readFileSync('dist/ui.js', 'utf8').replaceAll('</script', '<\\/script');
writeFileSync('dist/ui.html', html.replace('<!-- ui-script -->', `<script>${script}</script>`));
