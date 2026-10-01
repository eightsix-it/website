// Local browser regression checks. Every external request is blocked or mocked.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const os = require('node:os');
const { chromium } = require('playwright');
const { default: AxeBuilder } = require('@axe-core/playwright');
const { HtmlValidate } = require('html-validate');

const root = path.resolve(__dirname, '..');
const output = process.env.MIPS_QA_OUTPUT || path.join(os.tmpdir(), 'mips-intelligence-review');
fs.mkdirSync(output, { recursive: true });
const ignored = fs.readFileSync(path.join(root, '.assetsignore'), 'utf8').split(/\r?\n/).filter(s => s && !s.startsWith('#'));
const isIgnored = file => ignored.some(entry => file === entry || file.startsWith(entry + '/'));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon' };
const server = http.createServer((req, res) => {
  let file = decodeURIComponent(new URL(req.url, 'http://localhost').pathname).replace(/^\/+/, '');
  if (!file) file = 'index.html';
  if (!path.extname(file)) file += '.html';
  const resolved = path.resolve(root, file);
  if (!resolved.startsWith(root + path.sep) || isIgnored(file) || !fs.existsSync(resolved) || !fs.statSync(resolved).isFile()) {
    res.writeHead(404); res.end(); return;
  }
  res.writeHead(200, { 'Content-Type': mime[path.extname(file)] || 'application/octet-stream' });
  fs.createReadStream(resolved).pipe(res);
});
const results = [];
const pass = name => { results.push(name); console.log('PASS ' + name); };

(async () => {
  const validator = new HtmlValidate({ extends: ['html-validate:recommended'], rules: {
    // Match this repository's existing XHTML-style void tags and utility classes.
    'void-style': ['error', { style: 'selfclose' }],
    'no-inline-style': 'off', 'prefer-native-element': 'off', 'svg-focusable': 'off',
    'no-trailing-whitespace': 'off', 'long-title': 'off'
  } });
  const report = await validator.validateFile(path.join(root, 'mips-intelligence.html'));
  assert.equal(report.valid, true, JSON.stringify(report.results.flatMap(r=>r.messages), null, 2));
  pass('HTML structure and accessible names');
  for (const file of ['assets/mips/studies-acrad-44.webp', 'assets/mips/detail-met.webp', 'assets/mips/detail-not-met.webp']) assert(isIgnored(file));
  const source = fs.readFileSync(path.join(root, 'mips-intelligence.html'), 'utf8');
  assert(!/studies-acrad-44|detail-met\.webp|detail-not-met\.webp/.test(source));
  assert(!/accuracy percentage|rate card|A product\. Not managed IT\./i.test(source));
  pass('Only reviewed crops referenced; originals excluded from deployment');
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const origin = 'http://127.0.0.1:' + server.address().port;
  const browser = await chromium.launch({ headless: true, ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
  try {
    const contexts = [
      { name: 'desktop', width: 1440, height: 1000 },
      { name: 'laptop', width: 1280, height: 800 },
      { name: 'tablet', width: 768, height: 1024 },
      { name: 'mobile', width: 390, height: 844 },
      { name: 'small-mobile', width: 320, height: 720 },
      { name: 'reduced-motion', width: 1440, height: 1000, reducedMotion: 'reduce' },
      { name: 'no-javascript', width: 390, height: 844, javaScriptEnabled: false }
    ];
    for (const view of contexts) {
      const context = await browser.newContext({ viewport: { width: view.width, height: view.height }, reducedMotion: view.reducedMotion, javaScriptEnabled: view.javaScriptEnabled });
      await context.route('**/*', route => route.request().url().startsWith(origin + '/') ? route.continue() : route.abort());
      const page = await context.newPage();
      const errors = [];
      page.on('pageerror', e => errors.push(e.message));
      await page.goto(origin + '/mips-intelligence');
      await page.evaluate(() => document.fonts.ready);
      assert.equal(await page.locator('h1').count(), 1);
      assert.deepEqual(errors, []);
      assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), view.name + ' has horizontal overflow');
      assert.equal(await page.locator('main [data-reveal], main .hero-stagger, main .e86-word-mask').count(), 0);
      // Scan opacity/visibility through ancestors, including below-fold content.
      assert.deepEqual(await page.locator('main h1, main h2, main h3, main p').evaluateAll(nodes => nodes.filter(node => {
        if (node.closest('#success-message, #form-error, details:not([open]) > div')) return false;
        for (let el = node; el && el.tagName !== 'HTML'; el = el.parentElement) {
          const s = getComputedStyle(el);
          if (s.opacity === '0' || s.visibility === 'hidden' || s.display === 'none') return true;
        }
        return false;
      }).map(n=>n.textContent)), []);
      const hero = await page.locator('.mips-dashboard').boundingBox();
      if (view.width >= 1024) assert(hero.y + hero.height < view.height, 'Desktop product view must fit first screen');
      if (view.javaScriptEnabled !== false) {
        const a11y = await new AxeBuilder({page}).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
        assert.deepEqual(a11y.violations.map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})), [], view.name + ' accessibility violations');
        if (view.width < 1024) {
          const button=page.locator('#mobile-menu-btn');
          await button.click();
          assert.equal(await button.getAttribute('aria-expanded'), 'true');
          await button.click();
          assert.equal(await button.getAttribute('aria-expanded'), 'false');
        }
      }
      await page.locator('.mips-rule-note summary').click();
      assert(await page.locator('.mips-rule-note').getAttribute('open') !== null);
      await page.locator('.mips-rule-note summary').click();
      // Assets, clean internal links and fragment targets are all resolvable.
      const links = await page.locator('[href], img[src], script[src]').evaluateAll(nodes => nodes.map(n=>n.getAttribute('href')||n.getAttribute('src')));
      for (const url of new Set(links)) {
        if (url.startsWith('#')) assert(await page.locator(url).count(), 'Missing anchor '+url);
        if (url.startsWith('/')) assert.equal((await context.request.get(origin+url)).status(), 200, 'Broken local URL '+url);
      }
      // Force lazy images to load before capturing the complete page.
      await page.locator('img[loading="lazy"]').evaluateAll(nodes=>nodes.forEach(n=>n.loading='eager'));
      await page.waitForFunction(()=>[...document.images].every(i=>i.complete&&i.naturalWidth>0));
      await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      if (['desktop','mobile'].includes(view.name)) {
        await page.screenshot({path:path.join(output,view.name+'-hero.png')});
        await page.screenshot({path:path.join(output,view.name+'-full.png'),fullPage:true});
        if(view.name==='desktop') {
          const style = 'header, .e86-top { visibility: hidden !important; }';
          await page.locator('#how-it-works').screenshot({path:path.join(output,'workflow.png'),style});
          await page.locator('#product-details').screenshot({path:path.join(output,'details.png'),style});
        }
      }
      pass(view.name + ': visible content, layout, navigation, links' + (view.javaScriptEnabled === false ? '' : ', WCAG checks'));
      await context.close();
    }

    // This context intercepts the form endpoint before navigation. No real POST can leave.
    const context = await browser.newContext({ viewport: {width:1280,height:900}, reducedMotion:'reduce' });
    let responseMode='success', posts=0, releaseResponse;
    await context.route('**/*', async route => {
      const url=route.request().url();
      if(url.startsWith(origin+'/')) return route.continue();
      if(url!=='https://api.web3forms.com/submit') return route.abort();
      posts++;
      assert.equal(route.request().method(),'POST');
      if(responseMode==='network-error') return route.abort();
      if(responseMode==='delayed') await new Promise(resolve=>{releaseResponse=resolve;});
      return route.fulfill({status:responseMode==='http-error'?500:200,contentType:'application/json',body:JSON.stringify({success:responseMode!=='rejected'})});
    });
    const page = await context.newPage();
    const reset = async () => { await page.goto(origin+'/mips-intelligence'); await page.evaluate(()=>localStorage.clear()); };
    const fill = async () => {
      for(const [id,value] of [['name','QA Example'],['org','Synthetic Test Organization'],['role','Quality lead'],['email','qa@example.invalid']]) await page.locator('#demo-'+id).fill(value);
    };
    const submit = () => page.locator('#mips-demo-form button[type="submit"]').click();
    await reset();
    await submit();
    assert.equal(posts,0);
    assert.match(await page.locator('#form-error').innerText(),/required fields/);
    assert.equal(await page.locator('[aria-invalid="true"]').count(),4);
    await fill();
    await page.locator('#demo-email').fill('invalid');
    await submit();
    assert.equal(posts,0);
    assert.match(await page.locator('#form-error').innerText(),/email address/);
    pass('Form: required fields and invalid email never send');
    for(const mode of ['rejected','http-error','network-error']) {
      responseMode=mode;
      await reset(); await fill(); await submit();
      await page.waitForFunction(()=>!document.querySelector('#mips-demo-form button[type="submit"]').disabled);
      assert.match(await page.locator('#form-error').innerText(),/Something went wrong/);
    }
    pass('Form: API rejection, HTTP error and network failure allow retry');
    responseMode='delayed';
    await reset(); await fill(); await submit();
    await page.waitForFunction(()=>document.querySelector('#mips-demo-form button[type="submit"]').disabled);
    const before=posts;
    await page.locator('#mips-demo-form').evaluate(form=>form.dispatchEvent(new Event('submit',{cancelable:true})));
    assert.equal(posts,before);
    while(!releaseResponse) await new Promise(r=>setTimeout(r,10));
    releaseResponse();
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('#success-message')).display!=='none');
    assert.equal(await page.evaluate(()=>document.activeElement.id),'success-message');
    assert(await page.evaluate(()=>localStorage.getItem('e86-mips-demo-at')));
    pass('Form: single in-flight submission, mocked success, confirmation focus');
    await page.reload(); await fill(); await submit();
    assert.equal(posts,before);
    assert.match(await page.locator('#form-error').innerText(),/wait a minute/);
    pass('Form: successful submission starts the cooldown');
    await reset();
    await page.locator('[name="botcheck"]').evaluate(el=>el.checked=true);
    await submit();
    assert.equal(posts,before);
    assert(await page.locator('#success-message').isVisible());
    pass('Form: honeypot never sends');
    // Storage denial must not prevent an otherwise valid request.
    await reset(); await fill(); responseMode='success';
    await page.evaluate(()=>{Storage.prototype.getItem=()=>{throw Error('blocked');};Storage.prototype.setItem=()=>{throw Error('blocked');};});
    await submit();
    await page.waitForFunction(()=>getComputedStyle(document.querySelector('#success-message')).display!=='none');
    pass('Form: storage unavailable still completes with mocked success');
    assert.equal(posts,5);
    await context.close();
    fs.writeFileSync(path.join(output,'checks.json'),JSON.stringify({checks:results,externalFormSubmissions:0,mockedFormRequests:posts},null,2)+'\n');
    console.log(results.length+' checks passed. No external form submissions. Screenshots: '+output);
  } finally { await browser.close(); }
})().catch(error=>{console.error(error);process.exitCode=1;}).finally(()=>server.close());
