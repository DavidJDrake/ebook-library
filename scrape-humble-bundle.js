#!/usr/bin/env node

/**
 * Humble Bundle Purchase History Scraper
 *
 * This script logs into your Humble Bundle account and extracts your purchase history
 * to populate the Notion Bundles database.
 *
 * Required environment variables:
 * - HUMBLE_EMAIL: Your Humble Bundle email
 * - HUMBLE_PASSWORD: Your Humble Bundle password
 * - NOTION_TOKEN: Your Notion integration token
 */

const puppeteer = require('puppeteer');
const { Client } = require('@notionhq/client');

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';

async function scrapeHumbleBundle() {
  console.log('🔍 Starting Humble Bundle scraper...\n');

  // Validate environment variables
  if (!process.env.HUMBLE_EMAIL || !process.env.HUMBLE_PASSWORD) {
    console.error('❌ Error: HUMBLE_EMAIL and HUMBLE_PASSWORD environment variables are required');
    console.error('\nUsage:');
    console.error('  HUMBLE_EMAIL="your@email.com" HUMBLE_PASSWORD="yourpass" NOTION_TOKEN="..." node scrape-humble-bundle.js');
    process.exit(1);
  }

  const browser = await puppeteer.launch({
    headless: false, // Set to true once you verify it works
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('📄 Navigating to Humble Bundle login page...');
    await page.goto('https://www.humblebundle.com/login', { waitUntil: 'networkidle2' });

    // Wait for and fill in login form
    console.log('🔐 Logging in...');
    await page.waitForSelector('input[name="username"]', { timeout: 10000 });
    await page.type('input[name="username"]', process.env.HUMBLE_EMAIL);
    await page.type('input[name="password"]', process.env.HUMBLE_PASSWORD);

    // Click login button
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 30000 });

    console.log('✅ Logged in successfully!\n');

    // Navigate to purchases page
    console.log('📦 Navigating to purchases page...');
    await page.goto('https://www.humblebundle.com/home/purchases', { waitUntil: 'networkidle2' });

    // Wait for purchases to load
    await page.waitForSelector('.js-subscription-product-list, .game-collection', { timeout: 10000 });

    console.log('🔎 Extracting purchase data...\n');

    // Extract purchase data
    const purchases = await page.evaluate(() => {
      const bundles = [];

      // Try different selectors that Humble Bundle might use
      const purchaseElements = document.querySelectorAll('.subproduct-selector, .js-subscription-product');

      purchaseElements.forEach(element => {
        try {
          // Extract bundle name
          const nameElement = element.querySelector('.item-title, .subproduct-name, h4, .human-name');
          const bundleName = nameElement ? nameElement.textContent.trim() : null;

          // Extract purchase date
          const dateElement = element.querySelector('.purchase-date, .acquired-date, time');
          let purchaseDate = null;

          if (dateElement) {
            // Try to get datetime attribute first
            purchaseDate = dateElement.getAttribute('datetime') || dateElement.textContent.trim();
          }

          if (bundleName && purchaseDate) {
            bundles.push({
              name: bundleName,
              date: purchaseDate
            });
          }
        } catch (err) {
          console.error('Error parsing element:', err);
        }
      });

      return bundles;
    });

    console.log(`📊 Found ${purchases.length} purchases\n`);

    if (purchases.length === 0) {
      console.log('⚠️  No purchases found. The page structure might have changed.');
      console.log('💡 Taking a screenshot for debugging...');
      await page.screenshot({ path: 'humble-bundle-debug.png', fullPage: true });
      console.log('📸 Screenshot saved to: humble-bundle-debug.png');
    } else {
      // Display found purchases
      console.log('Found bundles:');
      purchases.forEach((bundle, idx) => {
        console.log(`  ${idx + 1}. ${bundle.name} (${bundle.date})`);
      });

      console.log('\n📤 Importing to Notion...\n');

      // Import to Notion
      let imported = 0;
      for (const purchase of purchases) {
        try {
          // Parse date to YYYY-MM-DD format
          let formattedDate = purchase.date;
          try {
            const dateObj = new Date(purchase.date);
            if (!isNaN(dateObj.getTime())) {
              formattedDate = dateObj.toISOString().split('T')[0];
            }
          } catch (e) {
            // Keep original date if parsing fails
          }

          await notion.pages.create({
            parent: { database_id: BUNDLES_DB_ID },
            properties: {
              'Name': {
                title: [{ text: { content: purchase.name } }]
              },
              'Bundle Name': {
                rich_text: [{ text: { content: purchase.name } }]
              },
              'Purchase Date': {
                date: { start: formattedDate }
              }
            }
          });

          imported++;
          console.log(`  ✓ Imported: ${purchase.name}`);
        } catch (error) {
          console.error(`  ✗ Failed to import "${purchase.name}": ${error.message}`);
        }
      }

      console.log(`\n🎉 Successfully imported ${imported}/${purchases.length} bundles to Notion!`);
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n💡 Taking a screenshot for debugging...');
    const page = (await browser.pages())[0];
    if (page) {
      await page.screenshot({ path: 'humble-bundle-error.png', fullPage: true });
      console.log('📸 Screenshot saved to: humble-bundle-error.png');
    }
    throw error;
  } finally {
    await browser.close();
  }
}

// Run the scraper
scrapeHumbleBundle().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
