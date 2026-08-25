from pathlib import Path

runtime = Path('src/fixture/public-runtime.js')
text = runtime.read_text()
old = "    const headerLogo = $('.sm-logo');\n    headerLogo.style.display = 'none';\n    const headerWrap = $('.sm-logo-wrap');\n    headerWrap.classList.add('restbr-logo-placeholder');\n    headerWrap.textContent = 'G';\n    const introWrap = $('.sm-intro-logo-wrap');\n    introWrap.classList.add('restbr-logo-placeholder');\n    introWrap.textContent = 'G';\n    $('.sm-intro-logo').style.display = 'none';\n"
new = "    const headerLogo = $('.sm-logo');\n    if (headerLogo) {\n      headerLogo.removeAttribute('src');\n      headerLogo.style.display = 'none';\n    }\n    const headerWrap = $('.sm-logo-wrap');\n    if (headerWrap) headerWrap.classList.add('restbr-logo-placeholder');\n\n    const introLogo = $('.sm-intro-logo');\n    if (introLogo) {\n      introLogo.removeAttribute('src');\n      introLogo.style.display = 'none';\n    }\n    const introWrap = $('.sm-intro-logo-wrap');\n    if (introWrap) introWrap.classList.add('restbr-logo-placeholder');\n"
if text.count(old) != 1:
    raise SystemExit(f'Expected renderHeader block exactly once; found {text.count(old)}')
runtime.write_text(text.replace(old, new, 1))

css = Path('css/fixture-shell.css')
css_text = css.read_text()
old_css = '.restbr-logo-placeholder{display:grid!important;place-items:center;background:radial-gradient(circle at 35% 30%,#eac36f,#70471e)!important;color:#120c05!important;font-size:28px!important;font-weight:1000!important;letter-spacing:0!important}'
extra = '.restbr-logo-placeholder{position:relative!important;overflow:hidden!important}.restbr-logo-placeholder>img{display:none!important}.restbr-logo-placeholder::after{content:"G";display:grid;place-items:center;position:absolute;inset:0;color:#120c05;font-size:28px;font-weight:1000;line-height:1}'
if css_text.count(old_css) != 1:
    raise SystemExit(f'Expected placeholder CSS exactly once; found {css_text.count(old_css)}')
css.write_text(css_text.replace(old_css, old_css + '\n' + extra, 1))

print('Phase 1A preview boot patch applied safely.')
