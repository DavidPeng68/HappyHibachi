/**
 * Scrape remaining menu item images from hibachiathome.com/Menu
 * Clicks "PREMIUM PROTEINS" and "SIDES & APPETIZERS" tabs to get those images.
 *
 * Usage: npx tsx scripts/scrape-remaining-images.ts
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const MENU_URL = 'https://hibachiathome.com/Menu';
const OUTPUT_DIR = path.resolve(__dirname, '../src/images/menu');
const SCREENSHOT_DIR = path.resolve(__dirname, '../src/images/menu/screenshots');

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

function downloadFile(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const protocol = url.startsWith('https') ? https : http;
    protocol
      .get(url, (response) => {
        if (response.statusCode === 301 || response.statusCode === 302) {
          const redirectUrl = response.headers.location;
          if (redirectUrl) {
            file.close();
            downloadFile(redirectUrl, dest).then(resolve).catch(reject);
            return;
          }
        }
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve();
        });
      })
      .on('error', (err) => {
        fs.unlink(dest, () => {});
        reject(err);
      });
  });
}

interface ImageInfo {
  name: string;
  slug: string;
  imageUrl: string;
  category: string;
  description: string;
  price: string;
}

async function main(): Promise<void> {
  console.log('Starting remaining menu image scraper...');
  console.log(`Output directory: ${OUTPUT_DIR}`);

  for (const dir of [OUTPUT_DIR, SCREENSHOT_DIR]) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  // Clean up bad downloads from previous runs
  for (const badFile of ['logo.png', 'banner.jpg', 'hibachi-at-home.jpg', 'hibachi-at-home.png', 'buffet.jpg', 'custom.jpg', 'show.jpg', 'person.jpg', 'get-instant-quote.jpg']) {
    const fp = path.join(OUTPUT_DIR, badFile);
    if (fs.existsSync(fp)) {
      fs.unlinkSync(fp);
      console.log(`Cleaned up bad file: ${badFile}`);
    }
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1920, height: 1080 });

    console.log(`Navigating to ${MENU_URL}...`);
    await page.goto(MENU_URL, { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for menu cards to render
    await page.waitForSelector('.menu-card', { timeout: 15000 });
    await new Promise((r) => setTimeout(r, 3000));

    // Tabs to click
    const tabsToClick = [
      { label: 'PREMIUM PROTEINS', category: 'premium' },
      { label: 'SIDES & APPETIZERS', category: 'sides' },
    ];

    const allImages: ImageInfo[] = [];

    for (const tab of tabsToClick) {
      console.log(`\n=== Clicking tab: "${tab.label}" ===`);

      // Click the tab using .menu-tab class
      await page.evaluate((labelText) => {
        const tabs = document.querySelectorAll('div.menu-tab, div.menu-tab-mobile');
        for (const el of Array.from(tabs)) {
          const text = (el.textContent || '').trim().toUpperCase();
          if (text === labelText) {
            (el as HTMLElement).click();
            return true;
          }
        }
        return false;
      }, tab.label);

      // Wait for content to load
      console.log('Waiting 3s for content to load...');
      await new Promise((r) => setTimeout(r, 3000));

      // Scroll to trigger any lazy loading
      await page.evaluate(() => window.scrollTo(0, 400));
      await new Promise((r) => setTimeout(r, 1500));
      await page.evaluate(() => window.scrollTo(0, 0));
      await new Promise((r) => setTimeout(r, 500));

      // Take screenshot
      const screenshotName = `04-${tab.category}-tab.png`;
      await page.screenshot({
        path: path.join(SCREENSHOT_DIR, screenshotName),
        fullPage: true,
      });
      console.log(`Screenshot: ${screenshotName}`);

      // Extract items specifically from .menu-card elements
      const images = await page.evaluate((cat) => {
        const results: Array<{
          name: string;
          slug: string;
          imageUrl: string;
          category: string;
          description: string;
          price: string;
        }> = [];

        const cards = document.querySelectorAll('.menu-card');
        console.log(`Found ${cards.length} .menu-card elements`);

        for (const card of Array.from(cards)) {
          const img = card.querySelector('img');
          if (!img) continue;

          const src = img.src || img.getAttribute('data-src') || '';
          if (!src || src.startsWith('data:')) continue;

          // Get the name - look for headings, bold text, or prominent text elements
          let name = '';
          const headings = card.querySelectorAll('h1, h2, h3, h4, h5, h6, strong, b');
          for (const h of Array.from(headings)) {
            const text = (h.textContent || '').trim();
            if (text.length > 1 && text.length < 50) {
              name = text;
              break;
            }
          }

          // Fallback: look for the first significant text node
          if (!name) {
            const textEls = card.querySelectorAll('p, span, div');
            for (const el of Array.from(textEls)) {
              const text = (el.textContent || '').trim();
              if (
                text.length > 1 &&
                text.length < 40 &&
                !text.includes('$') &&
                !text.includes('Add to') &&
                !text.includes('Order')
              ) {
                name = text;
                break;
              }
            }
          }

          if (!name) {
            name = img.alt && img.alt !== 'Hibachi at home' ? img.alt : `${cat}-item-${results.length + 1}`;
          }

          // Get description
          let description = '';
          const descEls = card.querySelectorAll('p, [class*="desc"]');
          for (const el of Array.from(descEls)) {
            const text = (el.textContent || '').trim();
            if (text.length > 10 && text.length < 200 && !text.includes('$')) {
              description = text;
              break;
            }
          }

          // Get price
          let price = '';
          const allText = card.textContent || '';
          const priceMatch = allText.match(/\$[\d,.]+/);
          if (priceMatch) {
            price = priceMatch[0];
          }

          const slug = name
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '');

          results.push({ name, slug, imageUrl: src, category: cat, description, price });
        }

        return results;
      }, tab.category);

      console.log(`Found ${images.length} menu cards in "${tab.label}" tab:`);
      for (const img of images) {
        console.log(`  - ${img.name} (${img.slug}) [${img.price}]`);
        console.log(`    ${img.description}`);
        console.log(`    ${img.imageUrl.substring(0, 90)}`);
      }

      allImages.push(...images);
    }

    // Deduplicate by URL
    const uniqueByUrl = new Map<string, ImageInfo>();
    for (const img of allImages) {
      if (!uniqueByUrl.has(img.imageUrl)) {
        uniqueByUrl.set(img.imageUrl, img);
      }
    }
    const deduped = Array.from(uniqueByUrl.values());

    console.log(`\nTotal unique items found: ${deduped.length}`);

    // Download images
    let downloadCount = 0;

    // Load existing mapping
    const mappingPath = path.join(OUTPUT_DIR, '_mapping.json');
    let existingMapping: Record<string, any> = {};
    if (fs.existsSync(mappingPath)) {
      existingMapping = JSON.parse(fs.readFileSync(mappingPath, 'utf-8'));
    }

    for (const img of deduped) {
      const urlPath = new URL(img.imageUrl).pathname;
      const ext = urlPath.match(/\.(jpg|jpeg|png|webp)$/i)?.[1] || 'jpg';
      const filename = `${img.slug}.${ext}`;
      const filepath = path.join(OUTPUT_DIR, filename);

      if (fs.existsSync(filepath)) {
        console.log(`Skipping ${filename} (already exists)`);
        continue;
      }

      try {
        console.log(`Downloading: ${img.name} -> ${filename}`);
        await downloadFile(img.imageUrl, filepath);

        const stats = fs.statSync(filepath);
        if (stats.size < 1000) {
          console.log(`  WARNING: File too small (${stats.size} bytes), removing`);
          fs.unlinkSync(filepath);
          continue;
        }

        console.log(`  OK (${(stats.size / 1024).toFixed(0)} KB)`);
        downloadCount++;
        existingMapping[img.slug] = {
          localPath: `src/images/menu/${filename}`,
          name: img.name,
          description: img.description,
          price: img.price,
          category: img.category,
        };
      } catch (err) {
        console.error(`  Failed to download ${img.name}: ${err}`);
      }
    }

    // Save merged mapping
    fs.writeFileSync(mappingPath, JSON.stringify(existingMapping, null, 2));

    console.log(`\nDone! Downloaded ${downloadCount} new images`);
    console.log(`Mapping updated at: ${mappingPath}`);
    console.log('Total entries in mapping:', Object.keys(existingMapping).length);

    // List all files
    const finalFiles = fs
      .readdirSync(OUTPUT_DIR)
      .filter((f) => !f.startsWith('_') && !f.startsWith('.') && f !== 'screenshots' && f !== 'backup');
    console.log(`\nAll menu images (${finalFiles.length}):`);
    for (const f of finalFiles) {
      const stats = fs.statSync(path.join(OUTPUT_DIR, f));
      console.log(`  ${f} (${(stats.size / 1024).toFixed(0)} KB)`);
    }
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
