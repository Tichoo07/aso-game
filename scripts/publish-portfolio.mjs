// Copies the production build into the portfolio site, so the game is served
// from the same host as the portfolio (emmanuel-tichoo.netlify.app/aso/).
// Some networks block GitHub Pages; anyone who can open the portfolio can
// then also play the game.
//
//   npm run publish:portfolio
//
// PORTFOLIO_DIR overrides the default portfolio location. Afterwards, publish
// the portfolio as usual (Netlify → your site → Deploys → drop the folder).
import { cpSync, existsSync, rmSync } from 'node:fs';
import { homedir } from 'node:os';
import path from 'node:path';

const portfolio = process.env.PORTFOLIO_DIR ?? path.join(homedir(), 'Downloads', 'emmanuel-portfolio');
const target = path.join(portfolio, 'aso');
const dist = path.resolve('dist');

if (!existsSync(path.join(portfolio, 'index.html'))) {
  console.error(`Portfolio not found at ${portfolio}. Set PORTFOLIO_DIR to its folder.`);
  process.exit(1);
}
if (!existsSync(path.join(dist, 'index.html'))) {
  console.error('No build found in dist/. Run "npm run build" first.');
  process.exit(1);
}

// Only ever replace the portfolio's aso/ folder
rmSync(target, { recursive: true, force: true });
cpSync(dist, target, { recursive: true });
console.log(`Copied the game build to ${target}`);
console.log('Next: publish the portfolio folder to Netlify.');
