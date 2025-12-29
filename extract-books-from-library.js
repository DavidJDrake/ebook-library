#!/usr/bin/env node

/**
 * Extract Individual Books from Humble Bundle Library
 *
 * Uses the analyzed selectors to extract book details and populate the Books database.
 */

const puppeteer = require('puppeteer');
const { Client } = require('@notionhq/client');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envFile = path.join(__dirname, '.env.humble');
if (fs.existsSync(envFile)) {
  const envContent = fs.readFileSync(envFile, 'utf-8');
  envContent.split('\n').forEach(line => {
    const match = line.match(/^([^#=]+)=(.*)$/);
    if (match) {
      process.env[match[1].trim()] = match[2].trim();
    }
  });
}

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const BUNDLES_DB_ID = 'a14c3451-3db6-4158-804c-2f404f31c179';
const BOOKS_DB_ID = 'e3f6ee71-0b6a-4558-8168-83be4af679d9';

async function extractBooks() {
  console.log('📚 Extracting books from Humble Bundle library...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Login
    console.log('🔐 Logging in...');
    await page.goto('https://www.humblebundle.com/login', { waitUntil: 'networkidle2' });

    try {
      await page.waitForSelector('button::-p-text(I Consent)', { timeout: 5000 });
      await page.click('button::-p-text(I Consent)');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {}

    await page.type('input[name="username"]', process.env.HUMBLE_EMAIL, { delay: 50 });
    await page.type('input[name="password"]', process.env.HUMBLE_PASSWORD, { delay: 50 });
    await page.click('button[type="submit"]');

    console.log('📧 If prompted, enter verification code');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 });
    console.log('   ✓ Login successful!\n');

    // Navigate to library
    console.log('📖 Loading library...');
    await page.goto('https://www.humblebundle.com/home/library', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Wait for the library to load
    console.log('⏳ Waiting for library content to load...');
    try {
      await page.waitForSelector('.js-subproducts-holder', { timeout: 30000 });
      console.log('   ✓ Library container found');
    } catch (err) {
      console.log('   ⚠️  Library container not found, continuing anyway...');
    }

    await new Promise(resolve => setTimeout(resolve, 5000));

    // Scroll to load more products
    console.log('📜 Scrolling to load all products...');
    let previousHeight = 0;
    let scrollAttempts = 0;
    while (scrollAttempts < 15) {
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await new Promise(resolve => setTimeout(resolve, 3000));

      const currentHeight = await page.evaluate(() => document.body.scrollHeight);
      if (currentHeight === previousHeight) {
        scrollAttempts++;
        if (scrollAttempts >= 3) break; // Stop after 3 attempts with no change
      } else {
        scrollAttempts = 0; // Reset if height changed
      }

      previousHeight = currentHeight;
    }

    // Wait a bit more for any final loading
    await new Promise(resolve => setTimeout(resolve, 3000));
    console.log('   ✓ Page loaded\n');

    // Extract books
    console.log('📚 Extracting book details...');
    const extraction = await page.evaluate(() => {
      const products = [];
      const debug = {
        selectorsTriedCount: 0,
        elementsFound: {}
      };

      // Try multiple selectors
      const selectors = [
        '.subproduct-selector',
        '[class*="subproduct"]',
        '.js-subproduct',
        '[data-product-name]'
      ];

      for (const selector of selectors) {
        const elements = document.querySelectorAll(selector);
        debug.elementsFound[selector] = elements.length;
        debug.selectorsTriedCount++;

        if (elements.length > 0) {
          elements.forEach(element => {
            try {
              const text = element.textContent.trim();
              const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0 && l.length < 500);

              if (lines.length >= 2) {
                const title = lines[0];
                const author = lines[1];

                let bundleName = '';
                const bundleHeader = element.closest('[data-human-name]');
                if (bundleHeader) {
                  bundleName = bundleHeader.getAttribute('data-human-name');
                }

                // Only add if title looks like a book title (not too long, not navigation text)
                if (title.length > 3 && title.length < 200 && !title.includes('Menu') && !title.includes('Search')) {
                  products.push({
                    title,
                    author: author || '',
                    bundleName: bundleName || ''
                  });
                }
              }
            } catch (err) {
              // Skip
            }
          });

          // If we found products with this selector, stop trying others
          if (products.length > 0) break;
        }
      }

      return { products, debug };
    });

    const books = extraction.products;

    console.log(`   Selectors tried: ${extraction.debug.selectorsTriedCount}`);
    Object.entries(extraction.debug.elementsFound).forEach(([selector, count]) => {
      if (count > 0) {
        console.log(`   • ${selector}: ${count} elements`);
      }
    });
    console.log(`   Found ${books.length} books!\n`);

    if (books.length === 0) {
      console.log('⚠️  No books found. Taking screenshot for debugging...');
      await page.screenshot({ path: 'extraction-debug.png', fullPage: true });
      console.log('   📸 Screenshot saved to extraction-debug.png');

      // Save page HTML
      const html = await page.content();
      fs.writeFileSync('library-page.html', html);
      console.log('   📄 HTML saved to library-page.html\n');

      console.log('   Please check the files and page structure.');
      return;
    }

    // Get all bundles from Notion
    console.log('📊 Fetching bundles from Notion...');
    let allBundles = [];
    let hasMore = true;
    let startCursor = undefined;

    while (hasMore) {
      const response = await notion.search({
        filter: {
          value: 'page',
          property: 'object'
        },
        page_size: 100,
        start_cursor: startCursor
      });

      const bundles = response.results.filter(p =>
        p.parent && p.parent.database_id === BUNDLES_DB_ID
      );

      allBundles = allBundles.concat(bundles);
      hasMore = response.has_more;
      startCursor = response.next_cursor;
    }

    console.log(`   Found ${allBundles.length} bundles in Notion\n`);

    // Add books to Notion
    console.log('💾 Adding books to Notion Books database...\n');

    let addedCount = 0;
    let skippedCount = 0;
    const uniqueBooks = new Map();

    // Deduplicate books
    books.forEach(book => {
      const key = `${book.title}|${book.author}`;
      if (!uniqueBooks.has(key)) {
        uniqueBooks.set(key, book);
      }
    });

    console.log(`   Processing ${uniqueBooks.size} unique books (${books.length - uniqueBooks.size} duplicates removed)\n`);

    for (const [_, book] of uniqueBooks) {
      try {
        const bookName = book.author ? `${book.title} by ${book.author}` : book.title;

        // Find matching bundle if bundleName is available
        let bundleRelation = [];
        if (book.bundleName) {
          const matchingBundle = allBundles.find(b => {
            const notionBundleName = b.properties['Bundle Name']?.rich_text?.[0]?.plain_text || '';
            return notionBundleName.toLowerCase().includes(book.bundleName.toLowerCase()) ||
                   book.bundleName.toLowerCase().includes(notionBundleName.toLowerCase());
          });
          if (matchingBundle) {
            bundleRelation = [{ id: matchingBundle.id }];
          }
        }

        await notion.pages.create({
          parent: { database_id: BOOKS_DB_ID },
          properties: {
            'Name': {
              title: [{ type: 'text', text: { content: bookName } }]
            },
            'Title': {
              rich_text: [{ type: 'text', text: { content: book.title } }]
            },
            'Author': {
              rich_text: [{ type: 'text', text: { content: book.author || '' } }]
            },
            ...(bundleRelation.length > 0 && {
              'Bundles': {
                relation: bundleRelation
              }
            })
          }
        });

        addedCount++;
        if (addedCount % 50 === 0) {
          console.log(`   Added ${addedCount} books...`);
        }

      } catch (error) {
        console.log(`   ✗ Failed: ${book.title} - ${error.message}`);
        skippedCount++;
      }
    }

    console.log(`\n✅ Book extraction complete!`);
    console.log(`   • Total books found: ${books.length}`);
    console.log(`   • Unique books: ${uniqueBooks.size}`);
    console.log(`   • Successfully added: ${addedCount}`);
    console.log(`   • Skipped/Failed: ${skippedCount}\n`);

  } catch (error) {
    console.error('❌ Error:', error.message);
    await page.screenshot({ path: 'error-screenshot.png' });
    console.log('   Screenshot saved to error-screenshot.png');
  } finally {
    await browser.close();
  }
}

if (!process.env.HUMBLE_EMAIL || !process.env.HUMBLE_PASSWORD) {
  console.error('❌ Missing HUMBLE_EMAIL or HUMBLE_PASSWORD');
  process.exit(1);
}

if (!process.env.NOTION_TOKEN) {
  console.error('❌ Missing NOTION_TOKEN');
  process.exit(1);
}

extractBooks();
