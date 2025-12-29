#!/usr/bin/env node

/**
 * Explore Humble Bundle Library Structure
 *
 * This script logs into Humble Bundle and analyzes the library page
 * to help us understand how to extract book data.
 */

const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

// Load environment variables from .env.humble
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

async function exploreLibrary() {
  console.log('🔍 Exploring Humble Bundle library structure...\n');

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  try {
    const page = await browser.newPage();

    // Login process
    console.log('🔐 Logging in to Humble Bundle...');
    await page.goto('https://www.humblebundle.com/login', { waitUntil: 'networkidle2' });

    // Handle consent dialog
    try {
      await page.waitForSelector('button::-p-text(I Consent)', { timeout: 5000 });
      await page.click('button::-p-text(I Consent)');
      console.log('   ✓ Consent dismissed\n');
      await new Promise(resolve => setTimeout(resolve, 2000));
    } catch (err) {
      console.log('   ✓ No consent dialog\n');
    }

    // Enter credentials
    await page.type('input[name="username"]', process.env.HUMBLE_EMAIL, { delay: 50 });
    await page.type('input[name="password"]', process.env.HUMBLE_PASSWORD, { delay: 50 });
    await page.click('button[type="submit"]');

    console.log('📧 If prompted, enter your email verification code');
    await page.waitForNavigation({ waitUntil: 'networkidle2', timeout: 120000 });
    console.log('   ✓ Login successful!\n');

    // Navigate to library
    console.log('📖 Navigating to library...');
    await page.goto('https://www.humblebundle.com/home/library', { waitUntil: 'networkidle2' });
    await new Promise(resolve => setTimeout(resolve, 5000));

    // Take screenshot
    await page.screenshot({ path: 'library-page.png', fullPage: true });
    console.log('   📸 Screenshot saved: library-page.png\n');

    // Analyze page structure
    console.log('🔍 Analyzing page structure...\n');

    const analysis = await page.evaluate(() => {
      const results = {
        possibleBookContainers: [],
        possibleTitleSelectors: [],
        possibleAuthorSelectors: [],
        sampleHTML: '',
        allClassNames: new Set()
      };

      // Look for common patterns
      const selectors = [
        '.item', '.book', '.product', '.subproduct', '.title',
        '[class*="book"]', '[class*="item"]', '[class*="product"]',
        '[data-product]', '[data-book]', '[data-item]'
      ];

      selectors.forEach(selector => {
        const elements = document.querySelectorAll(selector);
        if (elements.length > 0) {
          results.possibleBookContainers.push({
            selector,
            count: elements.length,
            sampleText: elements[0]?.textContent?.substring(0, 100)
          });
        }
      });

      // Collect all class names
      document.querySelectorAll('[class]').forEach(el => {
        el.className.split(' ').forEach(className => {
          if (className) results.allClassNames.add(className);
        });
      });

      // Get a sample of the page HTML
      results.sampleHTML = document.body.innerHTML.substring(0, 5000);

      results.allClassNames = Array.from(results.allClassNames)
        .filter(name => name.includes('book') || name.includes('item') || name.includes('product') || name.includes('title'))
        .sort();

      return results;
    });

    console.log('📊 Analysis Results:\n');
    console.log('Possible book container selectors:');
    analysis.possibleBookContainers.slice(0, 10).forEach(container => {
      console.log(`   • ${container.selector} (${container.count} elements)`);
      if (container.sampleText) {
        console.log(`     Sample: ${container.sampleText.trim().substring(0, 80)}...`);
      }
    });

    console.log('\nRelevant class names found:');
    analysis.allClassNames.slice(0, 20).forEach(className => {
      console.log(`   • ${className}`);
    });

    // Save full analysis
    const fs = require('fs');
    fs.writeFileSync('library-analysis.json', JSON.stringify(analysis, null, 2));
    console.log('\n💾 Full analysis saved to: library-analysis.json');

    console.log('\n⏸️  Browser will stay open for 60 seconds.');
    console.log('   Please manually inspect the page structure.');
    console.log('   Look for book titles, authors, and how they\'re organized.');
    console.log('   Press Ctrl+C to exit early.\n');

    await new Promise(resolve => setTimeout(resolve, 60000));

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await browser.close();
  }
}

if (!process.env.HUMBLE_EMAIL || !process.env.HUMBLE_PASSWORD) {
  console.error('❌ Error: Missing HUMBLE_EMAIL or HUMBLE_PASSWORD in environment');
  process.exit(1);
}

exploreLibrary();
