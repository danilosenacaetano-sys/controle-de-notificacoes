/*
 * 01-imagens.js
 * Identidade visual: nome da empresa (definido no config.ini), logo e fundo.
 * O logo é desenhado em SVG a partir do nome da empresa; nenhuma imagem externa é necessária.
 */

const EMPRESA = document.querySelector('meta[name="empresa"]')?.content || 'Minha Empresa';

function logoSVG(nome) {
    const t = String(nome).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    const tam = nome.length > 22 ? 22 : nome.length > 14 ? 28 : 34, larg = Math.max(260, 104 + nome.length * tam * .62);
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="${larg}" height="96" viewBox="0 0 ${larg} 96">
      <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#e0213f"/><stop offset="1" stop-color="#8f0a20"/></linearGradient></defs>
      <rect x="6" y="10" width="76" height="76" rx="20" fill="url(#g)"/>
      <path d="M24 68V44l20-14 20 14v24" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round" stroke-linecap="round"/>
      <path d="M36 68V54h16v14" fill="none" stroke="#fff" stroke-width="5" stroke-linejoin="round"/>
      <text x="98" y="${48 + tam * .36}" font-family="Segoe UI, Arial, sans-serif" font-size="${tam}" font-weight="800" fill="#141414">${t}</text></svg>`);
}

const LOGO = logoSVG(EMPRESA);

/* fundo abstrato (blocos e linhas), usado no login e no topo da tela inicial */
const FUNDO = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="700" viewBox="0 0 1200 700">
  <rect width="1200" height="700" fill="#2b2b2b"/>
  <g fill="#3a3a3a">${[[60, 300, 140, 400], [220, 220, 120, 480], [360, 340, 180, 360], [560, 180, 150, 520], [730, 280, 170, 420], [920, 240, 120, 460], [1060, 330, 120, 370]]
        .map(([x, y, w, h]) => `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="6"/>`).join('')}</g>
  <g stroke="#4a4a4a" stroke-width="2">${Array.from({ length: 24 }, (_, i) => `<line x1="0" y1="${i * 30}" x2="1200" y2="${i * 30}" opacity=".25"/>`).join('')}</g></svg>`);

document.documentElement.style.setProperty('--foto', `url("${FUNDO}")`);
document.body?.setAttribute('data-empresa', EMPRESA);
