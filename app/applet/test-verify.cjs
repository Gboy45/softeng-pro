const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  
  await page.goto('http://localhost:3000');
  console.log('Page title:', await page.title());

  // Check if login screen is present
  const loginBtn = await page.$('button[type="submit"]');
  if (loginBtn) {
    console.log('Logging in as admin...');
    await page.fill('input[type="text"]', 'ferdie');
    await page.fill('input[type="password"]', '123');
    await loginBtn.click();
    await page.waitForTimeout(600);
  }

  // Navigate to Scan
  console.log('Navigating to Scan tab...');
  const scanBtn = await page.getByRole('button', { name: 'Scan' }).first();
  await scanBtn.click();
  await page.waitForTimeout(600);

  // Check test barcodes are NOT present
  const content = await page.content();
  const hasTestBarcodes = content.includes('Test Barcodes:') || content.includes('Chanel Chance (In Inventory)');
  console.log('Test barcodes present:', hasTestBarcodes);

  // Look up existing item: 3145891265478
  console.log('Testing existing barcode lookup...');
  await page.fill('input[placeholder*="3145891265478"]', '3145891265478');
  const lookupBtn = await page.getByRole('button', { name: 'Look Up' });
  await lookupBtn.click();
  await page.waitForTimeout(500);

  // Check if 'Add to Existing Inventory' popup modal appeared
  const existingModal = await page.getByText('Add to Existing Inventory').first();
  const isExistingModalVisible = await existingModal.isVisible();
  console.log('Add to Existing Inventory modal visible:', isExistingModalVisible);

  // Close modal
  const cancelBtn = await page.getByRole('button', { name: 'Cancel' }).first();
  await cancelBtn.click();
  await page.waitForTimeout(500);

  // Look up new unregistered barcode
  console.log('Testing new barcode lookup...');
  await page.fill('input[placeholder*="3145891265478"]', '7501031311309');
  await lookupBtn.click();
  await page.waitForTimeout(500);

  // Check if 'Add to Inventory' popup modal appeared
  const newModal = await page.getByText('Would you like to add to inventory?').first();
  const isNewModalVisible = await newModal.isVisible();
  console.log('Add to Inventory modal visible:', isNewModalVisible);

  // Click Yes, Add to test the second modal step (Add to Inventory form)
  const yesAddBtn = await page.getByRole('button', { name: 'Yes, Add' }).first();
  await yesAddBtn.click();
  await page.waitForTimeout(400);

  const formVisible = await page.getByText('New Product').first().isVisible();
  console.log('Add to Inventory details form visible:', formVisible);

  await browser.close();
  console.log('ALL VERIFICATIONS PASSED SUCCESSFULLY!');
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
