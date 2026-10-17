import test from 'node:test';
import assert from 'node:assert/strict';
import { samplePortfolio, parseResume, escapeHtml, safeUrl, exportPortfolio, refinePortfolio } from '../src/portfolio.js';
import { extractDocument } from '../src/documents.js';

test('sample is explicitly fictional and follows the portfolio contract', () => {
  assert.match(samplePortfolio.bio, /fictional/i);
  assert.equal(samplePortfolio.email, 'alex@example.com');
  assert.ok(samplePortfolio.skills.every((skill) => typeof skill === 'string'));
  assert.ok(samplePortfolio.projects.every((project) => project.id && project.title && typeof project.url === 'string'));
});

test('parser deterministically extracts only resume facts and named sections', () => {
  const resume = `Jamie Rivera\nInterface designer\njamie@example.com\nSummary\nI design accessible tools.\nSkills\nFigma, HTML; CSS | Research\nExperience\nDesigner at Example Studio\nBuilt a scheduling prototype.\nProjects\nCommunity Calendar — A calendar prototype\nhttps://example.com/calendar\n- Designed the event form.\n\nReading List\n- A personal bookmarking concept.`;
  const result = parseResume(resume);
  assert.deepEqual(result, parseResume(resume));
  assert.equal(result.name, 'Jamie Rivera');
  assert.equal(result.role, 'Interface designer');
  assert.equal(result.email, 'jamie@example.com');
  assert.equal(result.bio, 'I design accessible tools.');
  assert.deepEqual(result.skills, ['Figma', 'HTML', 'CSS', 'Research']);
  assert.deepEqual(result.experience, ['Designer at Example Studio', 'Built a scheduling prototype.']);
  assert.equal(result.projects.length, 2);
  assert.deepEqual(result.projects[0], { id: 'project-1', title: 'Community Calendar', description: 'A calendar prototype Designed the event form.', url: 'https://example.com/calendar' });
  assert.equal(result.projects[1].title, 'Reading List');
  assert.deepEqual(result.warnings, []);
});

test('parser handles CRLF, Unicode names, inline skills and experience-based bio', () => {
  const result = parseResume('Zoë García\r\nFrontend developer\r\nzoe@example.com\r\nTechnical Skills: JavaScript, CSS, CSS\r\nProfessional Experience:\r\nBuilt a local reading tool.');
  assert.equal(result.name, 'Zoë García');
  assert.deepEqual(result.skills, ['JavaScript', 'CSS']);
  assert.equal(result.bio, 'Built a local reading tool.');
  assert.equal(result.projects[0].title, 'Untitled project');
  assert.ok(result.warnings.some((warning) => /editable project/.test(warning)));
});

test('empty input produces editable placeholders without invented credentials', () => {
  for (const input of ['', null, undefined]) {
    const result = parseResume(input);
    assert.equal(result.bio, '');
    assert.equal(result.email, '');
    assert.deepEqual(result.skills, []);
    assert.deepEqual(result.projects, [{ id: 'project-1', title: 'Untitled project', description: '', url: '' }]);
    assert.ok(result.warnings.length >= 4);
  }
});

test('HTML escaping handles all attribute and text delimiters', () => {
  assert.equal(escapeHtml('<img src="x" onerror=\'evil()\'>&'), '&lt;img src=&quot;x&quot; onerror=&#39;evil()&#39;&gt;&amp;');
  assert.equal(escapeHtml(null), '');
});

test('project URL validation rejects executable, ambiguous and credential-bearing links', () => {
  for (const url of ['javascript:alert(1)', 'data:text/html,hello', '//evil.test', '/relative', 'file:///etc/passwd', 'https://a:b@example.com', 'https://exa\nmple.com', 'https://', 'mailto:alex@example.com', 'https://example.com/ bad']) assert.equal(safeUrl(url), '', url);
  assert.equal(safeUrl(' https://example.com/work?q=one&sort=two '), 'https://example.com/work?q=one&sort=two');
  assert.equal(safeUrl('HTTP://example.com'), 'http://example.com/');
});

test('standalone export escapes every supplied field, ignores unsafe URLs and theme injection', () => {
  const attack = '</script><img src=x onerror="alert(1)">';
  const html = exportPortfolio({ name: attack, role: attack, bio: attack, email: 'x" onmouseover="alert(1)@example.com', skills: [attack], projects: [{ id: attack, title: attack, description: attack, url: 'javascript:alert(1)' }] }, '</style><script>alert(1)</script>');
  assert.ok(html.startsWith('<!doctype html>'));
  assert.ok(!html.includes('<img'));
  assert.ok(!html.includes('javascript:'));
  assert.ok(!html.includes('mailto:'));
  assert.ok(!html.includes('</style><script>alert'));
  assert.ok(html.includes('&lt;/script&gt;&lt;img'));
  assert.equal((html.match(/<script>/g) || []).length, 1);
  assert.ok(!/<(?:script|link|img)[^>]+(?:src|href)="https?:/.test(html));
  assert.ok(html.includes('prefers-reduced-motion'));
  assert.ok(html.includes('pointermove'));
});

test('standalone export includes real content and safely encoded usable links', () => {
  const html = exportPortfolio({ ...samplePortfolio, projects: [{ id: 'one', title: 'A & B', description: 'A real description', url: 'https://example.com/?a=1&b=2' }] }, 'aurora');
  assert.ok(html.includes('<title>Alex Morgan — Portfolio</title>'));
  assert.ok(html.includes('A &amp; B'));
  assert.ok(html.includes('href="https://example.com/?a=1&amp;b=2"'));
  assert.ok(html.includes('rel="noopener noreferrer"'));
  assert.ok(html.includes('href="mailto:alex@example.com"'));
  assert.ok(html.includes('href="#project-1"'));
  assert.ok(html.includes('id="project-1"'));
  assert.ok(html.includes('Portfolio snapshot'));
  assert.ok(html.includes('--bg:#081e20'));
  assert.doesNotThrow(() => exportPortfolio(null));
});

test('email local-part characters cannot become mailto query headers or fragments', () => {
  const html = exportPortfolio({ ...samplePortfolio, email: 'alex?subject=hello#tag@example.com' });
  assert.ok(html.includes('href="mailto:alex%3Fsubject%3Dhello%23tag@example.com"'));
  assert.ok(!html.includes('href="mailto:alex?'));
});

test('refinement is deterministic, immutable, fact-preserving and visibly changes tone', () => {
  const original = structuredClone(samplePortfolio);
  original.bio = 'I am a designer. I have built a reading prototype.';
  const before = structuredClone(original);
  const friendly = refinePortfolio(original, 'friendly');
  assert.equal(friendly.bio, `Hi, I'm ${original.name}. ${original.bio}`);
  assert.deepEqual(friendly, refinePortfolio(original, 'friendly'));
  assert.equal(refinePortfolio(original, 'concise').bio, 'I am a designer.');
  assert.equal(refinePortfolio(original, 'bold').bio, "I'm a designer. I've built a reading prototype.");
  assert.equal(refinePortfolio({ ...original, bio: "I'm a designer!" }, 'professional').bio, 'I am a designer.');
  assert.equal(refinePortfolio(original, 'unknown').bio, original.bio);
  friendly.skills.push('Changed');
  friendly.projects[0].title = 'Changed';
  assert.deepEqual(original, before);
  assert.equal(refinePortfolio({ name: 'Jamie', bio: '' }, 'friendly').bio, '');
});

test('text document extraction stays local and works without loading PDF dependencies', async () => {
  assert.equal(await extractDocument({ name: 'resume.txt', type: 'text/plain', size: 28, text: async () => '\uFEFF  Jamie\nDesigner  ' }), 'Jamie\nDesigner');
  await assert.rejects(extractDocument(null), /Choose a text/);
  await assert.rejects(extractDocument({ name: 'big.pdf', size: 8 * 1024 * 1024 + 1 }), /8 MB/);
  await assert.rejects(extractDocument({ name: 'empty.txt', size: 0 }), /empty/);
  await assert.rejects(extractDocument({ name: 'resume.docx', size: 100 }), /Unsupported/);
  await assert.rejects(extractDocument({ name: 'empty.txt', size: 10, text: async () => '  ' }), /no readable content/);
});
