/** Fictional demo content. Replace these details with your own before publishing. */
export const samplePortfolio = {
  name: 'Alex Morgan',
  role: 'Designer of clear, useful digital worlds',
  bio: 'Alex Morgan is a fictional product designer interested in the space between a complicated system and the person trying to use it. This sample is illustrative, but the work is shaped around a real design practice: notice the friction, find the signal, make the next step feel obvious.',
  email: 'alex@example.com',
  skills: ['Product thinking', 'Interface design', 'Prototyping', 'Design systems'],
  projects: [
    { id: 'project-1', title: 'The Reading Room', description: 'A fictional library interface that turns an unread list into a calmer ritual. The work focuses on discovery, pacing, and the small decisions that make returning to a book feel easy.', url: '' },
    { id: 'project-2', title: 'Field Notes for a Living City', description: 'A fictional civic field guide for collecting observations on neighborhood walks. The concept makes local knowledge feel lightweight, useful, and worth passing on.', url: '' },
    { id: 'project-3', title: 'Small Hours', description: 'A fictional planning tool for people whose best work happens in fragments. The system gives unfinished ideas a place to wait without turning life into a checklist.', url: '' },
  ],
};

const asText = (value) => typeof value === 'string' ? value : '';
const emailPattern = /^[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}$/i;
const headingPattern = /^(skills|technical skills|core skills|expertise|projects|selected projects|personal projects|experience|work experience|professional experience|employment|education|certifications|summary|profile|about(?: me)?|contact)\s*:?\s*$/i;

/** Local, deterministic extraction. Placeholders are editable, never inferred achievements. */
export function parseResume(text) {
  const source = asText(text).replace(/\r\n?/g, '\n').replace(/\u0000/g, '');
  const lines = source.split('\n').map((line) => line.trim());
  const sections = { header: [], skills: [], projects: [], experience: [], summary: [], other: [] };
  let section = 'header';
  for (const line of lines) {
    const inline = line.match(/^(skills|technical skills|core skills|expertise|summary|profile|about me)\s*:\s*(.+)$/i);
    if (inline) {
      section = /skills|expertise/i.test(inline[1]) ? 'skills' : 'summary';
      sections[section].push(inline[2]);
      continue;
    }
    const heading = line.match(headingPattern);
    if (heading) {
      const label = heading[1].toLowerCase();
      section = /skills|expertise/.test(label) ? 'skills' : /projects/.test(label) ? 'projects' : /experience|employment/.test(label) ? 'experience' : /summary|profile|about/.test(label) ? 'summary' : 'other';
    } else {
      sections[section].push(line);
    }
  }

  const email = source.match(/[A-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Z0-9](?:[A-Z0-9.-]*[A-Z0-9])?\.[A-Z]{2,}/i)?.[0] || '';
  const header = sections.header.filter(Boolean).filter((line) => !/^(resume|résumé|curriculum vitae|portfolio)$/i.test(line));
  const nameLine = header.slice(0, 5).find((line) => /^[\p{L}][\p{L}\p{M} .'’\-]{0,79}$/u.test(line) && line.split(/\s+/).length <= 5);
  const name = nameLine || 'Your name';
  const nameIndex = header.indexOf(nameLine);
  const roleCandidate = nameIndex >= 0 ? header[nameIndex + 1] : '';
  const role = roleCandidate && roleCandidate.length <= 100 && !/[@\d]|https?:|www\.|\||,/.test(roleCandidate) ? roleCandidate : 'Your role';
  const skills = [...new Set(sections.skills.flatMap((line) => line.replace(/^[-*•▪]\s*/, '').split(/[,;|•▪]|\s{2,}/)).map((skill) => skill.trim()).filter(Boolean))];
  const experience = sections.experience.filter(Boolean).map((line) => line.replace(/^[-*•▪]\s*/, ''));

  const projects = [];
  let current = null;
  let afterBlank = true;
  for (const line of sections.projects) {
    if (!line) { afterBlank = true; continue; }
    const urlMatch = line.match(/https?:\/\/[^\s<>]+/i);
    const link = urlMatch ? safeUrl(urlMatch[0].replace(/[),.;]+$/, '')) : '';
    const clean = line.replace(/^[-*•▪]\s*/, '').replace(urlMatch?.[0] || /$^/, '').replace(/\s*[|—–-]\s*$/, '').trim();
    const isBullet = /^[-*•▪]\s/.test(line);
    const isTitle = clean && (!current || (afterBlank && !isBullet) || (!isBullet && clean.length <= 85 && !/[.!?]$/.test(clean)));
    if (isTitle) {
      const parts = clean.split(/\s+[—–|]\s+|:\s+/);
      current = { id: `project-${projects.length + 1}`, title: parts.shift(), description: parts.join(' — '), url: link };
      projects.push(current);
    } else if (current) {
      if (clean) current.description = [current.description, clean].filter(Boolean).join(' ');
      if (link && !current.url) current.url = link;
    }
    afterBlank = false;
  }
  const warnings = [];
  if (!nameLine) warnings.push('A name was not detected. Replace the name placeholder.');
  if (role === 'Your role') warnings.push('A role was not detected. Add your role.');
  if (!email) warnings.push('An email address was not detected. Add one if you want a contact link.');
  if (!skills.length) warnings.push('No skills section was detected. Add skills you want to share.');
  if (!projects.length) {
    projects.push({ id: 'project-1', title: 'Untitled project', description: '', url: '' });
    warnings.push('No projects were detected. An editable project placeholder has been added.');
  }
  const bio = sections.summary.filter(Boolean).join(' ') || experience.slice(0, 3).join(' ');
  if (!bio) warnings.push('No summary or experience was detected. Write a short introduction.');
  return { name, role, bio, email, skills, projects, experience, warnings };
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}

/** Only absolute HTTP(S) project links are publishable. */
export function safeUrl(value) {
  const text = asText(value).trim();
  if (!text || /[\u0000-\u0020\u007f]/.test(text) || !/^https?:\/\//i.test(text)) return '';
  try {
    const url = new URL(text);
    return ['http:', 'https:'].includes(url.protocol) && url.hostname && !url.username && !url.password ? url.href : '';
  } catch { return ''; }
}

/** Rephrase presentation only; preserve the supplied facts and all project details. */
export function refinePortfolio(portfolio, tone = 'professional') {
  const input = portfolio || {};
  const bio = asText(input.bio).trim();
  const name = asText(input.name).trim();
  let refinedBio = bio;
  if ((tone === 'friendly' || tone === 'warm') && name && bio && !bio.startsWith(`Hi, I'm ${name}.`)) {
    refinedBio = `Hi, I'm ${name}. ${bio}`;
  } else if (tone === 'concise' || tone === 'minimal') {
    refinedBio = bio.match(/^[\s\S]*?[.!?](?=\s|$)/)?.[0] || bio;
  } else if (tone === 'bold' || tone === 'confident') {
    refinedBio = bio.replace(/\bI am\b/g, "I'm").replace(/\bI have\b/g, "I've");
  } else if (tone === 'professional') {
    refinedBio = bio.replace(/\bI'm\b/g, 'I am').replace(/\bI've\b/g, 'I have').replace(/!+/g, '.');
  }
  return {
    ...input,
    bio: refinedBio,
    skills: Array.isArray(input.skills) ? [...input.skills] : [],
    projects: Array.isArray(input.projects) ? input.projects.map((project) => ({ ...project })) : [],
    ...(Array.isArray(input.warnings) ? { warnings: [...input.warnings] } : {}),
    ...(Array.isArray(input.experience) ? { experience: [...input.experience] } : {}),
  };
}

/** A complete offline page: no fonts, libraries, images or network requests required. */
export function exportPortfolio(portfolio, theme = 'ember', template = 'orbit') {
  const data = portfolio || {};
  const palettes = {
    ember: ['#f3eee5', '#171713', '#d65b36'],
    ocean: ['#eef4f2', '#14201f', '#197a78'],
    forest: ['#eef0e5', '#172016', '#56733b'],
    cosmic: ['#111018', '#f6f0e9', '#c5a7ff'],
    midnight: ['#0b1324', '#edf3ff', '#99c8ff'],
    aurora: ['#081e20', '#ecfff4', '#9de7bb'],
    sunset: ['#241411', '#fff0e4', '#ffb17a'],
    light: ['#f6f0e9', '#201d29', '#6941a5'],
  };
  const [background, foreground, accent] = Object.hasOwn(palettes, theme) ? palettes[theme] : palettes.cosmic;
  const projects = Array.isArray(data.projects) ? data.projects : [];
  const skills = Array.isArray(data.skills) ? data.skills : [];
  const name = escapeHtml(asText(data.name));
  const email = asText(data.email).trim();
  const contact = emailPattern.test(email) ? `<a class="contact" href="mailto:${escapeHtml(encodeURIComponent(email).replace(/%40/g, '@'))}">${escapeHtml(email)} ↗</a>` : '';
  const cards = projects.map((project, index) => {
    const url = safeUrl(project?.url);
    return `<article id="project-${index + 1}" tabindex="-1"><p class="index">PROJECT ${String(index + 1).padStart(2, '0')}</p><h3>${escapeHtml(asText(project?.title))}</h3><p>${escapeHtml(asText(project?.description))}</p>${url ? `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer">Explore project ↗</a>` : ''}</article>`;
  }).join('');
  const nodes = projects.slice(0, 8).map((project, index, visible) => `<a class="node" style="--angle:${index * 360 / visible.length}deg" href="#project-${index + 1}"><span>${escapeHtml(asText(project?.title))}</span></a>`).join('');
  const templateId = ['orbit', 'editorial', 'studio'].includes(template) ? template : 'orbit';
  const templateCss = templateId === 'editorial' ? '.hero{grid-template-columns:1fr;min-height:520px}.universe{max-width:620px;margin:auto}.projects{grid-template-columns:1fr!important}.projects article{border-left:3px solid var(--accent);border-radius:0!important}.signal-bar{max-width:760px;margin-left:0!important}' : templateId === 'studio' ? '.hero{grid-template-columns:.72fr 1.28fr}.projects{grid-template-columns:repeat(3,minmax(0,1fr))!important}.projects article{padding:22px!important}.universe{order:-1}' : '';
  const signal = `<style>${templateCss}</style><section class="signal-bar" aria-label="Portfolio snapshot" style="display:grid;grid-template-columns:repeat(3,1fr);gap:1px;background:color-mix(in srgb,var(--fg) 18%,transparent);margin:28px 0 80px"><div style="padding:22px;background:color-mix(in srgb,var(--bg) 88%,var(--accent))"><strong style="display:block;font:32px Georgia,serif;color:var(--accent)">${projects.length}</strong><span>project${projects.length === 1 ? '' : 's'} in orbit</span></div><div style="padding:22px;background:color-mix(in srgb,var(--bg) 88%,var(--accent))"><strong style="display:block;font:32px Georgia,serif;color:var(--accent)">${skills.length}</strong><span>skill${skills.length === 1 ? '' : 's'} named</span></div><div style="padding:22px;background:color-mix(in srgb,var(--bg) 88%,var(--accent))"><strong style="display:block;font:32px Georgia,serif;color:var(--accent)">Local</strong><span>draft, ready for your review</span></div></section>`;
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="description" content="${escapeHtml(asText(data.bio))}"><title>${name} — Portfolio</title>
<style>
:root{color-scheme:${background === '#f6f0e9' ? 'light' : 'dark'};--bg:${background};--fg:${foreground};--accent:${accent}}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--fg);font-family:Arial,Helvetica,sans-serif;line-height:1.65}a{color:inherit;text-underline-offset:5px}a:focus-visible,button:focus-visible{outline:3px solid var(--accent);outline-offset:6px}header,main,footer{max-width:1160px;margin:auto;padding:32px 6vw}header{display:flex;justify-content:space-between;gap:24px;border-bottom:1px solid color-mix(in srgb,var(--fg) 20%,transparent)}header a{text-decoration:none;font-size:12px;letter-spacing:.15em}.hero{display:grid;grid-template-columns:1.1fr 1fr;align-items:center;gap:40px;min-height:620px}.eyebrow,.index{font-size:11px;letter-spacing:.16em;color:var(--accent);text-transform:uppercase}h1{font:clamp(48px,7vw,96px)/1.05 Georgia,serif;letter-spacing:-.05em;margin:20px 0;overflow-wrap:anywhere}h2{font:40px/1.2 Georgia,serif}h3{font:28px/1.2 Georgia,serif;margin:12px 0}p{white-space:pre-line;overflow-wrap:anywhere}.bio{max-width:52ch;opacity:.8}.role{font-size:20px}.contact{display:inline-block;margin-top:20px;color:var(--accent);overflow-wrap:anywhere}.universe{position:relative;aspect-ratio:1;min-width:0;perspective:800px;--tilt:0deg}.orbit{position:absolute;inset:12%;border:1px solid color-mix(in srgb,var(--accent) 40%,transparent);border-radius:50%;transform:rotateX(54deg) rotateY(var(--tilt));transition:transform .2s}.orbit.second{inset:4% 23%;transform:rotate(-32deg)}.core{position:absolute;inset:36%;border:1px solid var(--accent);border-radius:50%;display:grid;place-items:center;font:34px Georgia,serif;color:var(--accent);box-shadow:0 0 90px color-mix(in srgb,var(--accent) 13%,transparent)}.nodes{position:absolute;inset:0;animation:orbit 90s linear infinite}.universe:hover .nodes,.universe:focus-within .nodes{animation-play-state:paused}.node{position:absolute;left:50%;top:50%;width:112px;margin:-24px -56px;padding:10px;background:var(--bg);border:1px solid var(--accent);text-align:center;font-size:11px;text-decoration:none;transform:rotate(var(--angle)) translateY(clamp(-160px,-15vw,-110px)) rotate(calc(-1 * var(--angle)));overflow-wrap:anywhere}.node:hover{background:var(--accent);color:var(--bg)}.node span{display:block}.skills{display:flex;gap:10px;flex-wrap:wrap;padding:0;list-style:none}.skills li{border:1px solid color-mix(in srgb,var(--fg) 25%,transparent);padding:5px 13px;font-size:13px;overflow-wrap:anywhere}.work{margin-top:50px}.projects{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:28px}article{padding:28px 0;border-top:1px solid color-mix(in srgb,var(--fg) 25%,transparent);scroll-margin-top:24px}article:target{border-color:var(--accent)}article p{opacity:.8}article a{font-size:13px;color:var(--accent)}footer{margin-top:60px;font-size:11px;letter-spacing:.1em;border-top:1px solid color-mix(in srgb,var(--fg) 20%,transparent)}@keyframes orbit{50%{transform:rotate(8deg)}}@media(max-width:700px){.hero{grid-template-columns:1fr;padding-top:36px;gap:0}.universe{max-width:380px;width:100%;margin:0 auto}.projects{grid-template-columns:1fr}header,main,footer{padding-left:7vw;padding-right:7vw}h1{font-size:64px}.node{transform:rotate(var(--angle)) translateY(-130px) rotate(calc(-1 * var(--angle)))}}@media(prefers-reduced-motion:reduce){html{scroll-behavior:auto}.nodes{animation:none}.orbit{transition:none}}
 </style></head><body data-template="${templateId}"><header><a href="#top">${name}</a><a href="#work">SELECTED WORK ↗</a></header><main id="top"><section class="hero"><div><p class="eyebrow">A PERSONAL UNIVERSE</p><h1>${name}</h1><p class="role">${escapeHtml(asText(data.role))}</p><p class="bio">${escapeHtml(asText(data.bio))}</p>${contact}</div><div class="universe" aria-label="Project orbit. Select a project to read more."><div class="orbit"></div><div class="orbit second"></div><div class="core" aria-hidden="true">✦</div><div class="nodes">${nodes}</div></div></section>${skills.length ? `<section aria-label="Skills"><ul class="skills">${skills.map((skill) => `<li>${escapeHtml(asText(skill))}</li>`).join('')}</ul></section>` : ''}${signal}<section class="work" id="work"><p class="eyebrow">SELECTED WORK</p><h2>Ideas in orbit.</h2><div class="projects">${cards}</div></section></main><footer>${name} · MADE WITH PORTFOLIOVERSE</footer><script>
(()=>{const stage=document.querySelector('.universe');if(!stage||matchMedia('(prefers-reduced-motion: reduce)').matches)return;stage.addEventListener('pointermove',event=>{const rect=stage.getBoundingClientRect();stage.style.setProperty('--tilt',((event.clientX-rect.left)/rect.width-.5)*24+'deg')});stage.addEventListener('pointerleave',()=>stage.style.setProperty('--tilt','0deg'))})();
</script></body></html>`;
}
