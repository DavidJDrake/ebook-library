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
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-dev-shm-usage',
      '--disable-gpu',
      '--disable-software-rasterizer',
      '--disable-extensions',
      '--no-first-run',
      '--no-zygote',
      '--single-process'
    ]
  });

  try {
    const page = await browser.newPage();

    // Set a realistic viewport and user agent
    await page.setViewport({ width: 1280, height: 800 });
    await page.setUserAgent('Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');

    console.log('📄 Navigating to Humble Bundle login page...');
    await page.goto('https://www.humblebundle.com/login', { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for the login form to be ready
    await page.waitForSelector('input[name="username"]', { timeout: 15000 });

    // Wait a moment for any popups to appear
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Handle privacy consent dialog on login page if it appears
    console.log('🍪 Checking for privacy consent dialog...');
    let consentDismissed = false;
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const consentButton = await page.$('button::-p-text(I Consent)');
        if (consentButton) {
          console.log(`✓ Found consent dialog (attempt ${attempt + 1}), clicking...`);
          await consentButton.click();
          await new Promise(resolve => setTimeout(resolve, 2000));

          // Verify it's gone
          const stillThere = await page.$('button::-p-text(I Consent)');
          if (!stillThere) {
            consentDismissed = true;
            console.log('✓ Consent dialog dismissed successfully');
            break;
          }
        } else {
          console.log('✓ No consent dialog found');
          consentDismissed = true;
          break;
        }
      } catch (err) {
        console.log('✓ No consent dialog found');
        consentDismissed = true;
        break;
      }
    }

    if (!consentDismissed) {
      console.log('⚠️  Consent dialog still present, continuing anyway...');
    }

    // Take screenshot after handling consent
    await page.screenshot({ path: 'humble-login-page.png' });
    console.log('📸 Login page screenshot saved');

    // Click on the email input to ensure focus and clear any partial input
    console.log('🔐 Logging in...');
    await page.click('input[name="username"]');
    await new Promise(resolve => setTimeout(resolve, 500));

    // Clear the field first
    await page.evaluate(() => {
      const emailInput = document.querySelector('input[name="username"]');
      if (emailInput) emailInput.value = '';
      const passInput = document.querySelector('input[name="password"]');
      if (passInput) passInput.value = '';
    });

    await page.type('input[name="username"]', process.env.HUMBLE_EMAIL, { delay: 100 });
    await new Promise(resolve => setTimeout(resolve, 500));

    await page.click('input[name="password"]');
    await new Promise(resolve => setTimeout(resolve, 300));
    await page.type('input[name="password"]', process.env.HUMBLE_PASSWORD, { delay: 100 });
    await new Promise(resolve => setTimeout(resolve, 500));

    // Take screenshot before clicking submit
    await page.screenshot({ path: 'humble-before-submit.png' });
    console.log('📸 Before submit screenshot saved');

    // Click login button
    await page.click('button[type="submit"]');
    console.log('🔄 Waiting for login to complete...');

    // Wait for navigation after login with longer timeout
    try {
      await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 60000 });
    } catch (navError) {
      // Navigation might timeout, but we might have moved to verification page
      console.log('⚠️  Navigation timeout - checking current URL...');
    }

    const currentUrl = page.url();
    console.log(`Current URL: ${currentUrl}`);

    // Take screenshot to see what happened
    await page.screenshot({ path: 'humble-after-submit.png' });
    console.log('📸 After submit screenshot saved');

    // Check for email verification
    const verifyCodeInput = await page.$('input[placeholder="ENTER CODE"], input[name="code"]');
    if (verifyCodeInput) {
      console.log('\n🔐 EMAIL VERIFICATION REQUIRED');
      console.log('Humble Bundle sent a verification code to your email.');
      console.log('\nPlease check your email and enter the code in the browser window that just opened.');
      console.log('The script will wait for 5 minutes for you to complete verification...\n');

      // Wait for verification to complete (user enters code manually in the browser)
      await new Promise(resolve => setTimeout(resolve, 5000)); // Give user time to see the message

      // Wait for either the purchases page or home page to load
      try {
        await page.waitForFunction(
          () => window.location.href.includes('/home') || window.location.href.includes('/purchases'),
          { timeout: 300000 } // 5 minutes
        );
        console.log('✅ Verification complete!\n');
      } catch (err) {
        console.error('❌ Verification timeout. Please run the script again after verification.');
        throw new Error('Email verification required - please verify and try again');
      }
    } else if (currentUrl.includes('/login')) {
      // Still on login page - something went wrong
      console.error('❌ Still on login page - login may have failed');
      throw new Error('Login failed');
    } else {
      console.log('✅ Logged in successfully!\n');
    }

    // Navigate to purchases page
    console.log('📦 Navigating to purchases page...');
    await page.goto('https://www.humblebundle.com/home/purchases', { waitUntil: 'networkidle2', timeout: 60000 });

    // Wait for page to fully load
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Handle privacy consent dialog if it appears
    try {
      const consentButton = await page.$('button:has-text("I Consent"), button::-p-text(I Consent)');
      if (consentButton) {
        console.log('🍪 Clicking consent dialog...');
        await consentButton.click();
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    } catch (err) {
      // Consent button might not be there, that's okay
    }

    // Scroll down to trigger lazy loading
    await page.evaluate(() => window.scrollTo(0, 500));
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Wait for the purchases table rows to actually appear (not just the table)
    console.log('⏳ Waiting for purchases to load...');
    try {
      // Wait for actual data rows in the tbody (not just the header)
      await page.waitForFunction(
        () => {
          const rows = document.querySelectorAll('tbody tr');
          return rows.length > 0;
        },
        { timeout: 20000 }
      );
      console.log('✅ Purchases loaded!');
      await new Promise(resolve => setTimeout(resolve, 1000)); // Extra time for rendering
    } catch (err) {
      console.log('⚠️  Timeout waiting for rows. Checking what we have...');
    }

    // Take screenshot after waiting for content
    await page.screenshot({ path: 'humble-purchases-page.png', fullPage: true });
    console.log('📸 Purchases page screenshot saved');

    console.log('🔎 Extracting purchase data from all pages...\n');

    let allPurchases = [];
    let currentPage = 1;
    let hasNextPage = true;
    let previousPageBundles = [];

    // Loop through all pages using next button
    while (hasNextPage) {
      console.log(`📖 Scraping page ${currentPage}...`);

      // Wait for content to load
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Extract purchase data from current page
      const purchases = await page.evaluate(() => {
        const bundles = [];

        // Find all purchase rows using the actual class name
        const purchaseRows = document.querySelectorAll('.row.js-row, div.row');

        purchaseRows.forEach((row) => {
          try {
            // Extract bundle name from .product-name
            const nameElement = row.querySelector('.product-name');
            const bundleName = nameElement?.textContent?.trim();

            // Extract purchase date from .order-placed
            const dateElement = row.querySelector('.order-placed');
            const purchaseDate = dateElement?.textContent?.trim();

            // Extract price from .total
            const priceElement = row.querySelector('.total');
            const priceText = priceElement?.textContent?.trim();

            if (bundleName && purchaseDate) {
              bundles.push({
                name: bundleName,
                date: purchaseDate,
                price: priceText || '$0.00'
              });
            }
          } catch (err) {
            console.error('Error parsing row:', err);
          }
        });

        return bundles;
      });

      console.log(`  ✓ Found ${purchases.length} bundles on this page`);

      // Check if we're seeing the same bundles as the previous page (stuck on last page)
      if (currentPage > 1 && purchases.length > 0) {
        const currentBundleNames = purchases.map(p => p.name).sort().join('|');
        const previousBundleNames = previousPageBundles.map(p => p.name).sort().join('|');

        if (currentBundleNames === previousBundleNames) {
          console.log('  ✓ Same bundles as previous page - reached the end!');
          hasNextPage = false;
          break;
        }
      }

      previousPageBundles = purchases;
      allPurchases = allPurchases.concat(purchases);

      // Try to click next page button
      try {
        hasNextPage = await page.evaluate(() => {
          // Look for a next/forward arrow button
          const allButtons = document.querySelectorAll('button');
          let nextButton = null;

          // Find the rightmost arrow/chevron button (usually the next button)
          for (const btn of allButtons) {
            const ariaLabel = btn.getAttribute('aria-label') || '';
            const html = btn.innerHTML || '';

            // Look for buttons with "next", "forward", or arrow symbols
            if (ariaLabel.toLowerCase().includes('next') ||
                ariaLabel.toLowerCase().includes('forward') ||
                html.includes('>') ||
                html.includes('chevron') ||
                html.includes('arrow')) {
              nextButton = btn;
            }
          }

          // If found, check if it's enabled and click it
          if (nextButton && !nextButton.disabled && !nextButton.classList.contains('disabled')) {
            nextButton.click();
            return true;
          }

          return false;
        });

        if (hasNextPage) {
          console.log(`  → Moving to page ${currentPage + 1}...`);
          currentPage++;
          // Wait for the new page to load
          await new Promise(resolve => setTimeout(resolve, 4000));

          // Wait for the content to update
          await page.waitForFunction(
            () => {
              const rows = document.querySelectorAll('.row.js-row');
              return rows.length > 0;
            },
            { timeout: 10000 }
          );
        } else {
          console.log('  ✓ No more pages - scraping complete!');
        }
      } catch (err) {
        console.log(`  ⚠️  Error navigating to next page: ${err.message}`);
        hasNextPage = false;
      }
    }

    const purchases = allPurchases;

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
        console.log(`  ${idx + 1}. ${bundle.name} - ${bundle.price} (${bundle.date})`);
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

          // Parse price to number (remove $ and convert)
          let priceNumber = 0;
          try {
            const priceMatch = purchase.price.match(/[\d.]+/);
            if (priceMatch) {
              priceNumber = parseFloat(priceMatch[0]);
            }
          } catch (e) {
            // Default to 0 if parsing fails
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
              },
              'Price': {
                number: priceNumber
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
