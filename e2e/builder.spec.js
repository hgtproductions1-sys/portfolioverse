import { test, expect } from '@playwright/test';

const resume = 'Jamie Rivera\nCreative developer\njamie@example.com\n\nSummary\nI create accessible digital experiences.\n\nSkills\nReact, Design, Illustration\n\nProjects\nGarden Atlas\n- A field guide for neighborhood gardens.\nhttps://example.com/garden';

test('resume to editable preview, saved draft and offline HTML export', async ({ page }) => {
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('/');
  await page.getByRole('button', { name: 'Build my portfolio', exact: true }).click();
  await page.getByRole('button', { name: 'Paste text', exact: true }).click();
  await page.getByLabel('Resume text', { exact: true }).fill(resume);
  await page.getByRole('button', { name: 'Create my draft' }).click();
  await expect(page.getByLabel('Full name')).toHaveValue('Jamie Rivera');
  await expect(page.getByLabel('Professional role')).toHaveValue('Creative developer');
  await page.getByLabel('Full name').fill('Jamie Studio');
  await page.getByRole('tab', { name: 'Projects (1)' }).click();
  await expect(page.getByLabel('Project title', { exact: true })).toHaveValue('Garden Atlas');
  await page.getByRole('button', { name: 'Add project', exact: true }).click();
  await page.getByLabel('Project title', { exact: true }).last().fill('Paper Trail');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.reload();
  await expect(page.getByLabel('Full name')).toHaveValue('Jamie Studio');
  await page.getByRole('button', { name: 'View portfolio', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Jamie Studio', exact: true })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Garden Atlas', exact: true })).toBeVisible();
  const downloaded = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export website', exact: true }).click();
  const download = await downloaded;
  expect(download.suggestedFilename()).toBe('jamie-studio.html');
  const stream = await download.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const exported = await page.context().newPage();
  await exported.route('**/*', route => route.abort());
  await exported.setContent(Buffer.concat(chunks).toString('utf8'));
  await expect(exported.getByRole('heading', { name: 'Jamie Studio', exact: true })).toBeVisible();
  await expect(exported.getByRole('heading', { name: 'Paper Trail', exact: true })).toBeVisible();
  await exported.close();
  expect(errors).toEqual([]);
});

test('text uploads and invalid files have visible outcomes', async ({ page }) => {
  await page.goto('/');
  await page.locator('#resume-file').setInputFiles({ name: 'resume.txt', mimeType: 'text/plain', buffer: Buffer.from(resume) });
  await expect(page.getByLabel('Full name')).toHaveValue('Jamie Rivera');
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await page.locator('#resume-file').setInputFiles({ name: 'broken.pdf', mimeType: 'application/pdf', buffer: Buffer.from('invalid pdf') });
  await expect(page.getByRole('alert')).toContainText(/could not be read|Unable to read/);
  await expect(page.getByLabel('Full name')).toHaveValue('Jamie Rivera');
});

function pdfBuffer(text) {
  const stream = `BT /F1 12 Tf 50 750 Td (${text}) Tj ET`;
  const objects = ['<< /Type /Catalog /Pages 2 0 R >>', '<< /Type /Pages /Kids [3 0 R] /Count 1 >>', '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>', '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>', `<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`];
  let data = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, i) => { offsets.push(Buffer.byteLength(data)); data += `${i + 1} 0 obj\n${object}\nendobj\n`; });
  const start = Buffer.byteLength(data);
  data += `xref\n0 6\n0000000000 65535 f \n${offsets.slice(1).map(offset => `${String(offset).padStart(10, '0')} 00000 n \n`).join('')}trailer\n<< /Size 6 /Root 1 0 R >>\nstartxref\n${start}\n%%EOF`;
  return Buffer.from(data);
}

test('real PDF worker extracts a PDF locally', async ({ page }) => {
  await page.goto('/');
  await page.locator('#resume-file').setInputFiles({ name: 'resume.pdf', mimeType: 'application/pdf', buffer: pdfBuffer('Jamie Rivera') });
  await expect(page.getByLabel('Full name')).toHaveValue('Jamie Rivera', { timeout: 20000 });
});

test('mobile builder stays within viewport and accessible tabs work', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore a sample', exact: true }).click();
  await expect(page.getByLabel('Full name')).toHaveValue('Alex Morgan');
  await page.getByRole('tab', { name: 'Your story', exact: true }).focus();
  await page.keyboard.press('End');
  await expect(page.getByRole('tab', { name: 'Look & feel' })).toHaveAttribute('aria-selected', 'true');
  await page.getByRole('radio', { name: /Ocean/ }).check();
  await expect(page.locator('.app')).toHaveClass(/theme-ocean/);
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > innerWidth + 1);
  expect(overflow).toBe(false);
});

test('JSON backups restore content and theme', async ({ page }) => {
  await page.goto('/');
  await page.getByLabel('Restore a PortfolioVerse JSON backup').setInputFiles({ name: 'portfolioverse-draft.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify({ portfolio: { name: 'Taylor Chen', role: 'Artist', bio: 'I draw.', email: '', skills: ['Drawing'], projects: [] }, theme: 'forest' })) });
  await expect(page.getByLabel('Full name')).toHaveValue('Taylor Chen');
  await expect(page.locator('.app')).toHaveClass(/theme-forest/);
});

test('template choices and improvement actions change the portfolio output', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: 'Explore a sample', exact: true }).click();
  await page.getByRole('radio', { name: /Editorial/ }).click();
  await page.getByRole('button', { name: 'Make it warmer' }).click();
  await expect(page.getByRole('status')).toContainText(/warmer voice/);
  await page.getByRole('button', { name: 'View portfolio', exact: true }).click();
  await expect(page.locator('.template-editorial')).toBeVisible();
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Export website', exact: true }).click();
  const file = await download;
  const stream = await file.createReadStream();
  const chunks = [];
  for await (const chunk of stream) chunks.push(chunk);
  const html = Buffer.concat(chunks).toString('utf8');
  expect(html).toContain('data-template="editorial"');
  expect(html).toContain('data-template="editorial"');
  expect(html).toContain('.projects{grid-template-columns:1fr!important}');
});

test('responsive landing and editor visual captures', async ({ page }, testInfo) => {
  for (const width of [1440, 768, 390]) {
    await page.setViewportSize({ width, height: 1000 });
    await page.goto('/');
    await expect(page.locator('canvas[data-rendered="true"]')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`landing-${width}.png`), fullPage: true });
    await page.getByRole('button', { name: 'Explore a sample', exact: true }).click();
    await expect(page.getByLabel('Full name')).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath(`editor-${width}.png`), fullPage: true });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true);
  }
});

test('demo film is shipped with the website', async ({ page }) => {
  await page.goto('/');
  const video = page.locator('video[aria-label="PortfolioVerse product demo video"]');
  await expect(video).toBeVisible();
  await expect(video.locator('source')).toHaveAttribute('src', '/portfolioverse-demo.mp4');
  const response = await page.request.get('/portfolioverse-demo.mp4');
  expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).toContain('video/mp4');
});
