/**
 * Scrape menu item images from competitor site (hibachiathome.com/Menu)
 * Downloads food images for use as initial menu item pictures
 *
 * Usage: npx tsx scripts/scrape-menu-images.ts
 */

import puppeteer from 'puppeteer';
import * as fs from 'fs';
import * as path from 'path';
import * as https from 'https';
import * as http from 'http';

const MENU_URL = 'https://hibachiathome.com/Menu';
const OUTPUT_DIR = path.resolve(__dirname, '../src/images/menu');

interface ScrapedItem {
	name: string;
	slug: string;
	description: string;
	price: string;
	imageUrl: string;
	category: string;
}

function slugify(name: string): string {
	return name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

function downloadFile(url: string, dest: string): Promise<void> {
	return new Promise((resolve, reject) => {
		const file = fs.createWriteStream(dest);
		const protocol = url.startsWith('https') ? https : http;
		protocol.get(url, (response) => {
			if (response.statusCode === 301 || response.statusCode === 302) {
				const redirectUrl = response.headers.location;
				if (redirectUrl) {
					downloadFile(redirectUrl, dest).then(resolve).catch(reject);
					return;
				}
			}
			response.pipe(file);
			file.on('finish', () => {
				file.close();
				resolve();
			});
		}).on('error', (err) => {
			fs.unlink(dest, () => {});
			reject(err);
		});
	});
}

async function scrapeMenuImages(): Promise<void> {
	console.log('🚀 Starting menu image scraper...');
	console.log(`📁 Output directory: ${OUTPUT_DIR}`);

	if (!fs.existsSync(OUTPUT_DIR)) {
		fs.mkdirSync(OUTPUT_DIR, { recursive: true });
	}

	const browser = await puppeteer.launch({
		headless: true,
		args: ['--no-sandbox', '--disable-setuid-sandbox'],
	});

	try {
		const page = await browser.newPage();
		await page.setViewport({ width: 1920, height: 1080 });

		console.log(`🌐 Navigating to ${MENU_URL}...`);
		await page.goto(MENU_URL, { waitUntil: 'networkidle2', timeout: 30000 });

		// Wait for menu items to render (client-side rendered)
		await page.waitForSelector('img', { timeout: 10000 });

		// Give extra time for lazy-loaded images
		await new Promise(r => setTimeout(r, 3000));

		// Find all tab buttons and click through them to load all categories
		const tabButtons = await page.$$('button, [role="tab"], .tab, .menu-tab');
		console.log(`📑 Found ${tabButtons.length} potential tab buttons`);

		// Collect all menu items across all tabs
		const allItems: ScrapedItem[] = [];
		const seenNames = new Set<string>();

		// Function to extract items from current view
		async function extractItems(category: string): Promise<ScrapedItem[]> {
			return page.evaluate((cat) => {
				const items: Array<{
					name: string;
					slug: string;
					description: string;
					price: string;
					imageUrl: string;
					category: string;
				}> = [];

				// Try various selectors for menu item cards
				const cards = document.querySelectorAll(
					'.menu-item, .food-card, .product-card, [class*="menu"][class*="card"], [class*="food"][class*="item"]'
				);

				if (cards.length > 0) {
					cards.forEach((card) => {
						const img = card.querySelector('img');
						const nameEl = card.querySelector('h3, h4, .name, .title, [class*="name"], [class*="title"]');
						const descEl = card.querySelector('p, .description, [class*="desc"]');
						const priceEl = card.querySelector('.price, [class*="price"], span');

						if (img && nameEl) {
							const name = nameEl.textContent?.trim() || '';
							items.push({
								name,
								slug: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
								description: descEl?.textContent?.trim() || '',
								price: priceEl?.textContent?.trim() || '',
								imageUrl: img.src || img.getAttribute('data-src') || '',
								category: cat,
							});
						}
					});
				}

				// Fallback: scan all images near text that looks like food names
				if (items.length === 0) {
					const allImages = document.querySelectorAll('img');
					allImages.forEach((img) => {
						const src = img.src || '';
						// Skip logos, icons, and tiny images
						if (img.width < 100 || img.height < 100) return;
						if (src.includes('logo') || src.includes('icon') || src.includes('favicon')) return;

						// Find nearby text
						const parent = img.closest('div, article, section, li');
						if (parent) {
							const heading = parent.querySelector('h1, h2, h3, h4, h5, h6, strong, b');
							const textContent = heading?.textContent?.trim() || '';
							if (textContent && textContent.length > 1 && textContent.length < 50) {
								items.push({
									name: textContent,
									slug: textContent.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
									description: '',
									price: '',
									imageUrl: src,
									category: cat,
								});
							}
						}
					});
				}

				return items;
			}, category);
		}

		// First pass: extract from default view
		console.log('📋 Extracting items from default view...');
		const defaultItems = await extractItems('proteins');
		for (const item of defaultItems) {
			if (!seenNames.has(item.name.toLowerCase())) {
				seenNames.add(item.name.toLowerCase());
				allItems.push(item);
			}
		}
		console.log(`   Found ${defaultItems.length} items`);

		// Click through tabs to get other categories
		for (let i = 0; i < tabButtons.length; i++) {
			try {
				const tabText = await tabButtons[i].evaluate(el => el.textContent?.trim() || '');
				if (!tabText || tabText.length > 30) continue;

				// Skip non-menu tabs
				const lower = tabText.toLowerCase();
				if (lower.includes('home') || lower.includes('contact') || lower.includes('gallery')) continue;

				console.log(`📑 Clicking tab: "${tabText}"...`);
				await tabButtons[i].click();
				await new Promise(r => setTimeout(r, 2000));

				const category = lower.includes('premium') ? 'premium' :
					lower.includes('side') || lower.includes('appetizer') ? 'sides' :
					lower.includes('protein') ? 'proteins' : lower;

				const tabItems = await extractItems(category);
				for (const item of tabItems) {
					if (!seenNames.has(item.name.toLowerCase())) {
						seenNames.add(item.name.toLowerCase());
						allItems.push(item);
					}
				}
				console.log(`   Found ${tabItems.length} items in "${tabText}"`);
			} catch {
				// Tab click failed, continue
			}
		}

		console.log(`\n📊 Total unique items found: ${allItems.length}`);

		// Download images
		const mapping: Record<string, { localPath: string; name: string; description: string; price: string; category: string }> = {};
		let downloadCount = 0;

		for (const item of allItems) {
			if (!item.imageUrl || item.imageUrl.startsWith('data:')) {
				console.log(`⏭️  Skipping ${item.name} (no valid image URL)`);
				continue;
			}

			const ext = item.imageUrl.match(/\.(jpg|jpeg|png|webp)/i)?.[1] || 'jpg';
			const filename = `${item.slug}.${ext}`;
			const filepath = path.join(OUTPUT_DIR, filename);

			try {
				console.log(`📥 Downloading: ${item.name} → ${filename}`);
				await downloadFile(item.imageUrl, filepath);
				downloadCount++;

				mapping[item.slug] = {
					localPath: `src/images/menu/${filename}`,
					name: item.name,
					description: item.description,
					price: item.price,
					category: item.category,
				};
			} catch (err) {
				console.error(`❌ Failed to download ${item.name}: ${err}`);
			}
		}

		// Save mapping file
		const mappingPath = path.join(OUTPUT_DIR, '_mapping.json');
		fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

		console.log(`\n✅ Done! Downloaded ${downloadCount} images`);
		console.log(`📄 Mapping saved to: ${mappingPath}`);

		// Also take a full-page screenshot for reference
		await page.goto(MENU_URL, { waitUntil: 'networkidle2' });
		await new Promise(r => setTimeout(r, 3000));
		await page.screenshot({
			path: path.join(OUTPUT_DIR, '_reference-screenshot.png'),
			fullPage: true,
		});
		console.log('📸 Reference screenshot saved');

	} finally {
		await browser.close();
	}
}

scrapeMenuImages().catch(console.error);
