/*
 * 11-excel-gerador.js
 * Gerador de arquivos .xlsx (feito à mão, sem bibliotecas externas).
 */

/* =====================================================================
   EXPORTAÇÃO PARA EXCEL (.xlsx formatado, gerado no próprio navegador,
   sem internet e sem bibliotecas externas)
   ===================================================================== */
const XL = {
    _crc: null,
    crc(u8) {
        if (!this._crc) {
            this._crc = new Uint32Array(256);
            for (let n = 0; n < 256; n++) {
                let c = n;
                for (let k = 0; k < 8; k++)
                    c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
                this._crc[n] = c >>> 0;
            }
        }
        let c = 0xFFFFFFFF;
        for (let i = 0; i < u8.length; i++)
            c = this._crc[(c ^ u8[i]) & 255] ^ (c >>> 8);
        return (c ^ 0xFFFFFFFF) >>> 0;
    },
    zip(files) {
        const enc = new TextEncoder(), parts = [], central = [];
        let off = 0;
        const d = new Date(), dt = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate(), tm = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
        for (const f of files) {
            const name = enc.encode(f.name), data = enc.encode(f.data), crc = this.crc(data);
            const h = new DataView(new ArrayBuffer(30));
            h.setUint32(0, 0x04034b50, true);
            h.setUint16(4, 20, true);
            h.setUint16(6, 0x0800, true);
            h.setUint16(8, 0, true);
            h.setUint16(10, tm, true);
            h.setUint16(12, dt, true);
            h.setUint32(14, crc, true);
            h.setUint32(18, data.length, true);
            h.setUint32(22, data.length, true);
            h.setUint16(26, name.length, true);
            h.setUint16(28, 0, true);
            parts.push(new Uint8Array(h.buffer), name, data);
            const c = new DataView(new ArrayBuffer(46));
            c.setUint32(0, 0x02014b50, true);
            c.setUint16(4, 20, true);
            c.setUint16(6, 20, true);
            c.setUint16(8, 0x0800, true);
            c.setUint16(10, 0, true);
            c.setUint16(12, tm, true);
            c.setUint16(14, dt, true);
            c.setUint32(16, crc, true);
            c.setUint32(20, data.length, true);
            c.setUint32(24, data.length, true);
            c.setUint16(28, name.length, true);
            c.setUint32(42, off, true);
            central.push(new Uint8Array(c.buffer), name);
            off += 30 + name.length + data.length;
        }
        const cd = central.reduce((s, a) => s + a.length, 0), e = new DataView(new ArrayBuffer(22));
        e.setUint32(0, 0x06054b50, true);
        e.setUint16(8, files.length, true);
        e.setUint16(10, files.length, true);
        e.setUint32(12, cd, true);
        e.setUint32(16, off, true);
        return new Blob([...parts, ...central, new Uint8Array(e.buffer)], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    },
    esc(s) {
        return String(s ?? '').replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c])).replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '');
    },
    col(i) {
        let s = '';
        i++;
        while (i) {
            const m = (i - 1) % 26;
            s = String.fromCharCode(65 + m) + s;
            i = Math.floor((i - 1) / 26);
        }
        return s;
    },
    data(iso) {
        if (!iso)
            return null;
        const [y, m, d] = iso.split('-').map(Number);
        return Date.UTC(y, m - 1, d) / 864e5 + 25569;
    },
    estilos() {
        const fonts = [], fills = ['<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>'], borders = ['<border><left/><right/><top/><bottom/><diagonal/></border>'], xfs = ['<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'], cache = {};
        const idx = (a, x) => {
            let i = a.indexOf(x);
            if (i < 0) {
                a.push(x);
                i = a.length - 1;
            }
            return i;
        };
        const font = ({ b, i, sz = 10, cor = '262626' } = {}) => idx(fonts, `<font>${b ? '<b/>' : ''}${i ? '<i/>' : ''}<sz val="${sz}"/><color rgb="FF${cor}"/><name val="Calibri"/><family val="2"/></font>`);
        font();
        const fill = c => c ? idx(fills, `<fill><patternFill patternType="solid"><fgColor rgb="FF${c}"/><bgColor indexed="64"/></patternFill></fill>`) : 0;
        const lado = (t, c) => `<${t} style="thin"><color rgb="FF${c}"/></${t}>`;
        const border = c => c ? idx(borders, `<border>${lado('left', c)}${lado('right', c)}${lado('top', c)}${lado('bottom', c)}<diagonal/></border>`) : 0;
        return {
            st(o = {}) {
                const k = JSON.stringify(o);
                if (cache[k] != null)
                    return cache[k];
                const nf = o.data ? 164 : o.pct ? 9 : o.int ? 1 : 0;
                xfs.push(`<xf numFmtId="${nf}" fontId="${font(o.font)}" fillId="${fill(o.fill)}" borderId="${border(o.borda)}" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1"${nf ? ' applyNumberFormat="1"' : ''}><alignment horizontal="${o.h || 'left'}" vertical="center"${o.wrap ? ' wrapText="1"' : ''}${o.h === 'left' || !o.h ? ' indent="1"' : ''}/></xf>`);
                return cache[k] = xfs.length - 1;
            },
            xml() {
                return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/></numFmts><fonts count="${fonts.length}">${fonts.join('')}</fonts><fills count="${fills.length}">${fills.join('')}</fills><borders count="${borders.length}">${borders.join('')}</borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="${xfs.length}">${xfs.join('')}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
            }
        };
    },
    /* linhas: [{ht, cells:[{v,s}|null]}] */
    /* monta o arquivo .xlsx com várias abas. abas: [{nome, xml, filtro?:'A5:K20', titulos?:5, tabela?:{nome,ref,colunas:[...]}}] */
    livro(abas, E) {
        const NS = 'http://schemas.openxmlformats.org', agora = new Date();
        const nomeAba = (n, i) => {
            let t = String(n).replace(/[\\\/\?\*\[\]:]/g, '-').slice(0, 31).trim() || ('Aba ' + (i + 1));
            return t;
        };
        const usados = new Set();
        abas.forEach((a, i) => {
            let t = nomeAba(a.nome, i), k = 2;
            while (usados.has(t.toLowerCase())) {
                t = nomeAba(a.nome, i).slice(0, 27) + ' (' + (k++) + ')';
            }
            usados.add(t.toLowerCase());
            a._nome = t;
        });
        const q = t => `'${t.replace(/'/g, "''")}'`;
        let nTab = 0, nDes = 0, nGr = 0;
        const files = [];
        const ct = [`<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>`];
        const nomes = [];
        abas.forEach((a, i) => {
            const n = i + 1;
            ct.push(`<Override PartName="/xl/worksheets/sheet${n}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`);
            files.push({ name: `xl/worksheets/sheet${n}.xml`, data: a.xml });
            if (a.filtro)
                nomes.push(`<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${q(a._nome)}!${a.filtro.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>`);
            if (a.titulos)
                nomes.push(`<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${q(a._nome)}!$${a.titulos}:$${a.titulos}</definedName>`);
            const rels = [];
            if (a.graficos && a.graficos.length) {
                nDes++;
                rels.push(`<Relationship Id="rId2" Type="${NS}/officeDocument/2006/relationships/drawing" Target="../drawings/drawing${nDes}.xml"/>`);
                ct.push(`<Override PartName="/xl/drawings/drawing${nDes}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>`);
                const drels = [], ancoras = [];
                a.graficos.forEach((g, k) => {
                    nGr++;
                    ct.push(`<Override PartName="/xl/charts/chart${nGr}.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>`);
                    files.push({ name: `xl/charts/chart${nGr}.xml`, data: g.xml });
                    drels.push(`<Relationship Id="rId${k + 1}" Type="${NS}/officeDocument/2006/relationships/chart" Target="../charts/chart${nGr}.xml"/>`);
                    ancoras.push(`<xdr:twoCellAnchor editAs="oneCell"><xdr:from><xdr:col>${g.de[0]}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${g.de[1]}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from><xdr:to><xdr:col>${g.ate[0]}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>${g.ate[1]}</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to><xdr:graphicFrame macro=""><xdr:nvGraphicFramePr><xdr:cNvPr id="${k + 2}" name="Gráfico ${k + 1}"/><xdr:cNvGraphicFramePr/></xdr:nvGraphicFramePr><xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm><a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId${k + 1}"/></a:graphicData></a:graphic></xdr:graphicFrame><xdr:clientData/></xdr:twoCellAnchor>`);
                });
                files.push({ name: `xl/drawings/drawing${nDes}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">${ancoras.join('')}</xdr:wsDr>` });
                files.push({ name: `xl/drawings/_rels/drawing${nDes}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${NS}/package/2006/relationships">${drels.join('')}</Relationships>` });
            }
            if (a.tabela) {
                nTab++;
                const t = a.tabela;
                ct.push(`<Override PartName="/xl/tables/table${nTab}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.table+xml"/>`);
                rels.push(`<Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/table" Target="../tables/table${nTab}.xml"/>`);
                files.push({ name: `xl/tables/table${nTab}.xml`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<table xmlns="${NS}/spreadsheetml/2006/main" id="${nTab}" name="${t.nome}" displayName="${t.nome}" ref="${t.ref}" totalsRowShown="0"><autoFilter ref="${t.ref}"/><tableColumns count="${t.colunas.length}">${t.colunas.map((c, k) => `<tableColumn id="${k + 1}" name="${this.esc(c)}"/>`).join('')}</tableColumns><tableStyleInfo name="TableStyleMedium1" showFirstColumn="0" showLastColumn="0" showRowStripes="1" showColumnStripes="0"/></table>` });
            }
            if (rels.length)
                files.push({ name: `xl/worksheets/_rels/sheet${n}.xml.rels`, data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${NS}/package/2006/relationships">${rels.join('')}</Relationships>` });
        });
        files.unshift({ name: '[Content_Types].xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Types xmlns="${NS}/package/2006/content-types">${ct.join('')}</Types>` }, { name: '_rels/.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${NS}/package/2006/relationships"><Relationship Id="rId1" Type="${NS}/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="${NS}/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>` }, { name: 'docProps/core.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<cp:coreProperties xmlns:cp="${NS}/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>Controle de Notificações — ${esc(EMPRESA)}</dc:title><dc:creator>${esc(EMPRESA)}</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">${agora.toISOString().slice(0, 19)}Z</dcterms:created></cp:coreProperties>` }, { name: 'xl/workbook.xml', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<workbook xmlns="${NS}/spreadsheetml/2006/main" xmlns:r="${NS}/officeDocument/2006/relationships"><bookViews><workbookView activeTab="0"/></bookViews><sheets>${abas.map((a, i) => `<sheet name="${this.esc(a._nome)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${nomes.length ? `<definedNames>${nomes.join('')}</definedNames>` : ''}</workbook>` }, { name: 'xl/_rels/workbook.xml.rels', data: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<Relationships xmlns="${NS}/package/2006/relationships">${abas.map((a, i) => `<Relationship Id="rId${i + 1}" Type="${NS}/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join('')}<Relationship Id="rId${abas.length + 1}" Type="${NS}/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>` }, { name: 'xl/styles.xml', data: E.xml() });
        return this.zip(files);
    },
    /* gráfico de colunas do Excel (nativo). series: [{nome, ref, cor, valores:[]}], cats: {ref, valores:[]} */
    grafico({ titulo, cats, series, tipo = 'col' }) {
        const e = v => this.esc(v);
        const strCache = v => `<c:strCache><c:ptCount val="${v.length}"/>${v.map((x, i) => `<c:pt idx="${i}"><c:v>${e(x)}</c:v></c:pt>`).join('')}</c:strCache>`;
        const numCache = v => `<c:numCache><c:formatCode>General</c:formatCode><c:ptCount val="${v.length}"/>${v.map((x, i) => `<c:pt idx="${i}"><c:v>${Number(x) || 0}</c:v></c:pt>`).join('')}</c:numCache>`;
        const ser = series.map((sr, i) => `<c:ser><c:idx val="${i}"/><c:order val="${i}"/><c:tx><c:v>${e(sr.nome)}</c:v></c:tx><c:spPr><a:solidFill><a:srgbClr val="${sr.cor}"/></a:solidFill></c:spPr><c:invertIfNegative val="0"/><c:dLbls><c:spPr><a:noFill/><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="800" b="1"><a:solidFill><a:srgbClr val="404040"/></a:solidFill></a:defRPr></a:pPr><a:endParaRPr lang="pt-BR"/></a:p></c:txPr><c:showLegendKey val="0"/><c:showVal val="1"/><c:showCatName val="0"/><c:showSerName val="0"/><c:showPercent val="0"/><c:showBubbleSize val="0"/></c:dLbls><c:cat><c:strRef><c:f>${e(cats.ref)}</c:f>${strCache(cats.valores)}</c:strRef></c:cat><c:val><c:numRef><c:f>${e(sr.ref)}</c:f>${numCache(sr.valores)}</c:numRef></c:val></c:ser>`).join('');
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><c:roundedCorners val="0"/><c:chart><c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="pt-BR" sz="1200" b="1"><a:solidFill><a:srgbClr val="141414"/></a:solidFill></a:rPr><a:t>${e(titulo)}</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title><c:autoTitleDeleted val="0"/><c:plotArea><c:layout/><c:barChart><c:barDir val="${tipo === 'bar' ? 'bar' : 'col'}"/><c:grouping val="clustered"/><c:varyColors val="0"/>${ser}<c:gapWidth val="70"/><c:overlap val="-10"/><c:axId val="50010"/><c:axId val="50020"/></c:barChart><c:catAx><c:axId val="50010"/><c:scaling><c:orientation val="${tipo === 'bar' ? 'maxMin' : 'minMax'}"/></c:scaling><c:delete val="0"/><c:axPos val="${tipo === 'bar' ? 'l' : 'b'}"/><c:numFmt formatCode="General" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="BFBFBF"/></a:solidFill></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr><a:endParaRPr lang="pt-BR"/></a:p></c:txPr><c:crossAx val="50020"/><c:crosses val="autoZero"/><c:auto val="1"/><c:lblAlgn val="ctr"/><c:lblOffset val="100"/><c:noMultiLvlLbl val="0"/></c:catAx><c:valAx><c:axId val="50020"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="${tipo === 'bar' ? 'b' : 'l'}"/><c:majorGridlines><c:spPr><a:ln w="6350"><a:solidFill><a:srgbClr val="E6E6E6"/></a:solidFill></a:ln></c:spPr></c:majorGridlines><c:numFmt formatCode="0" sourceLinked="0"/><c:majorTickMark val="none"/><c:minorTickMark val="none"/><c:tickLblPos val="nextTo"/><c:spPr><a:ln><a:noFill/></a:ln></c:spPr><c:txPr><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="900"/></a:pPr><a:endParaRPr lang="pt-BR"/></a:p></c:txPr><c:crossAx val="50010"/><c:crosses val="${tipo === 'bar' ? 'max' : 'autoZero'}"/><c:crossBetween val="between"/></c:valAx><c:spPr><a:noFill/></c:spPr></c:plotArea><c:legend><c:legendPos val="b"/><c:overlay val="0"/></c:legend><c:plotVisOnly val="1"/><c:dispBlanksAs val="gap"/></c:chart><c:spPr><a:solidFill><a:srgbClr val="FFFFFF"/></a:solidFill><a:ln w="9525"><a:solidFill><a:srgbClr val="D9D9D9"/></a:solidFill></a:ln></c:spPr></c:chartSpace>`;
    },
    planilha({ linhas, larguras, mesclas = [], congelar = 0, filtro = null, paisagem = true, rodape = '', tabela = false, desenho = false }) {
        const rows = linhas.map((r, ri) => {
            const n = ri + 1;
            const cs = (r.cells || []).map((c, ci) => {
                if (!c)
                    return '';
                const ref = this.col(ci) + n, s = c.s != null ? ` s="${c.s}"` : '';
                if (c.v === null || c.v === undefined || c.v === '')
                    return `<c r="${ref}"${s}/>`;
                if (typeof c.v === 'number')
                    return `<c r="${ref}"${s}><v>${c.v}</v></c>`;
                return `<c r="${ref}"${s} t="inlineStr"><is><t xml:space="preserve">${this.esc(c.v)}</t></is></c>`;
            }).join('');
            return `<row r="${n}"${r.ht ? ` ht="${r.ht}" customHeight="1"` : ''}>${cs}</row>`;
        }).join('');
        const ultCol = this.col(larguras.length - 1);
        return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${ultCol}${Math.max(1, linhas.length)}"/><sheetViews><sheetView workbookViewId="0" showGridLines="0"${congelar ? '' : ''}>${congelar ? `<pane ySplit="${congelar}" topLeftCell="A${congelar + 1}" activePane="bottomLeft" state="frozen"/><selection pane="bottomLeft" activeCell="A${congelar + 1}" sqref="A${congelar + 1}"/>` : ''}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18" customHeight="1"/><cols>${larguras.map((w, i) => `<col min="${i + 1}" max="${i + 1}" width="${w}" customWidth="1"/>`).join('')}</cols><sheetData>${rows}</sheetData>${filtro ? `<autoFilter ref="${filtro}"/>` : ''}${mesclas.length ? `<mergeCells count="${mesclas.length}">${mesclas.map(m => `<mergeCell ref="${m}"/>`).join('')}</mergeCells>` : ''}<printOptions horizontalCentered="1"/><pageMargins left="0.4" right="0.4" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="${paisagem ? 'landscape' : 'portrait'}" fitToWidth="1" fitToHeight="0"/><headerFooter><oddFooter>${this.esc('&L' + rodape + '&RPágina &P de &N')}</oddFooter></headerFooter>${desenho ? '<drawing r:id="rId2"/>' : ''}${tabela ? '<tableParts count="1"><tablePart r:id="rId1"/></tableParts>' : ''}</worksheet>`;
    }
};

/* ordem do histórico: loja → tema/ocorrência → ordem de emissão */
function ordemHistTema(a, b) {
    const la = lojaDe(a), lb = lojaDe(b);
    return la.nome.localeCompare(lb.nome, 'pt-BR') || String(la.numero).localeCompare(String(lb.numero), 'pt-BR', { numeric: true }) || String(a.loja_id).localeCompare(String(b.loja_id))
        || ocKey(a.infracao).localeCompare(ocKey(b.infracao), 'pt-BR') || (a.data_encaminhamento || '').localeCompare(b.data_encaminhamento || '') || (ETAPA_ORD[a.etapa] || 0) - (ETAPA_ORD[b.etapa] || 0) || ordemNotif(a, b);
}

function exportarExcel(lista, nome, descFiltro, lojaTitulo = '', opts = {}) {
    if (!lista.length)
        return toast('Não há notificações para exportar.', 'bad');
    const porTema = !!opts.porTema;
    if (porTema)
        lista = [...lista].sort(ordemHistTema);
    const E = XL.estilos(), st = o => E.st(o), agora = new Date();
    const VERM = 'C8102E', PRETO = '141414', BORDA = 'D9D9D9';
    const S = {
        titulo: st({ font: { b: 1, sz: 18, cor: VERM }, h: 'left' }),
        subtitulo: st({ font: { b: 1, sz: 12, cor: PRETO }, h: 'left' }),
        info: st({ font: { i: 1, sz: 9, cor: '6B6B6B' }, h: 'left' }),
        faixa: st({ fill: VERM }),
        cab: st({ font: { b: 1, sz: 10, cor: 'FFFFFF' }, fill: PRETO, borda: '404040', h: 'center', wrap: 1 }),
        secao: st({ font: { b: 1, sz: 12, cor: VERM }, h: 'left' }),
    };
    const cel = (zebra, extra = {}) => st({ font: { sz: 10, ...(extra.font || {}) }, fill: extra.fill || (zebra ? 'F5F5F5' : null), borda: BORDA, h: extra.h, wrap: extra.wrap, data: extra.data });
    const sitEst = { vencida: { font: { b: 1, cor: VERM }, fill: 'FDE8EB' }, baixada: { font: { b: 1, cor: '595959' }, fill: 'EDEDED' }, ok: { font: { b: 1, cor: '1F7A43' }, fill: 'E8F5EC' }, warn: { font: { b: 1, cor: '8A5A00' }, fill: 'FDF3DC' } };
    /* ---- aba de notificações (a mesma montagem serve para a aba geral e para cada tema) ---- */
    const cols = ['Nº Loja', 'Loja', 'Tema / Ocorrência', 'Nº no tema', 'Nº Notificação', 'Etapa', 'Encaminhamento', 'Prazo (dias)', 'Vencimento', 'Situação', 'Data da baixa', 'Observações'];
    const larg = [9, 26, 30, 10, 14, 15, 15, 10, 13, 24, 13, 40], U = XL.col(cols.length - 1);
    const abaNotif = (lst, sub) => {
        const linhas = [
            { ht: 30, cells: [{ v: EMPRESA.toUpperCase(), s: S.titulo }] },
            { ht: 20, cells: [{ v: sub, s: S.subtitulo }] },
            { ht: 16, cells: [{ v: `Gerado em ${agora.toLocaleDateString('pt-BR')} às ${agora.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} · ${lst.length} registro(s)${descFiltro ? ` · Filtros: ${descFiltro}` : ''}`, s: S.info }] },
            { ht: 5, cells: cols.map(() => ({ v: '', s: S.faixa })) },
            { ht: 30, cells: cols.map(c => ({ v: c, s: S.cab })) },
        ];
        let grupoAnt = null, zebra = true, seq = 0;
        lst.forEach(n => {
            const l = lojaDe(n), si = situacao(n), grupo = n.loja_id + '|' + ocKey(n.infracao);
            if (grupo !== grupoAnt) {
                grupoAnt = grupo;
                zebra = !zebra;
                seq = 0;
            } // alterna a cor a cada tema de cada loja
            seq++;
            const se = si.key === 'baixada' ? sitEst.baixada : si.key === 'vencida' ? sitEst.vencida : si.cls === 'warn' ? sitEst.warn : sitEst.ok;
            linhas.push({ ht: n.observacoes && n.observacoes.length > 45 ? 32 : 20, cells: [
                    { v: String(l.numero), s: cel(zebra, { h: 'center' }) },
                    { v: l.nome, s: cel(zebra, { font: { b: 1 } }) },
                    { v: (n.infracao || '').trim(), s: cel(zebra, { wrap: 1, font: { b: 1 } }) },
                    { v: `${seq}ª`, s: cel(zebra, { h: 'center' }) },
                    { v: n.numero_notificacao, s: cel(zebra, { h: 'center', font: { b: 1 } }) },
                    { v: ETAPAS[n.etapa] || '', s: cel(zebra, { h: 'center', font: ehMulta(n.etapa) ? { b: 1, cor: VERM } : {} }) },
                    { v: XL.data(n.data_encaminhamento), s: cel(zebra, { h: 'center', data: 1 }) },
                    { v: Number(n.prazo_dias) || 0, s: cel(zebra, { h: 'center' }) },
                    { v: XL.data(n.data_vencimento), s: cel(zebra, { h: 'center', data: 1 }) },
                    { v: si.label, s: cel(zebra, { h: 'center', ...se }) },
                    { v: n.baixada ? XL.data(n.data_baixa) : '', s: cel(zebra, { h: 'center', data: 1 }) },
                    { v: n.observacoes || '', s: cel(zebra, { wrap: 1 }) },
                ] });
        });
        const fim = linhas.length;
        return { xml: XL.planilha({ linhas, larguras: larg, mesclas: [`A1:${U}1`, `A2:${U}2`, `A3:${U}3`], congelar: 5, filtro: `A5:${U}${fim}`, rodape: `${EMPRESA} — Controle de Notificações` }), filtro: `A5:${U}${fim}` };
    };
    const principal = abaNotif(porTema ? lista : [...lista].sort(ordemHistTema), lojaTitulo ? `Relatório de notificações — ${lojaTitulo}` : 'Controle de Notificações — Relatório de notificações');
    /* ---- Resumo ---- */
    const h = hoje(), ab = lista.filter(n => !n.baixada);
    const r = [
        { ht: 30, cells: [{ v: EMPRESA.toUpperCase(), s: S.titulo }] },
        { ht: 20, cells: [{ v: lojaTitulo ? `Resumo — ${lojaTitulo}` : 'Resumo das notificações exportadas', s: S.subtitulo }] },
        { ht: 16, cells: [{ v: `Gerado em ${agora.toLocaleDateString('pt-BR')}${descFiltro ? ` · Filtros: ${descFiltro}` : ''}`, s: S.info }] },
        { ht: 5, cells: [0, 1, 2, 3, 4].map(() => ({ v: '', s: S.faixa })) },
        { ht: 10, cells: [] },
        { ht: 20, cells: [{ v: 'Indicadores', s: S.secao }] },
        { ht: 22, cells: [{ v: 'Indicador', s: S.cab }, { v: 'Quantidade', s: S.cab }] },
    ];
    [['Total de registros', lista.length], ['Em aberto', ab.length], ['Vencidas', ab.filter(n => n.data_vencimento < h).length], ['Baixas', lista.filter(n => n.baixada).length], ['Multas', lista.filter(n => ehMulta(n.etapa)).length]]
        .forEach(([k, v], i) => r.push({ ht: 20, cells: [{ v: k, s: cel(i % 2, { font: { b: 1 } }) }, { v, s: cel(i % 2, { h: 'center', font: { b: 1, cor: k === 'Vencidas' || k === 'Multas' ? VERM : PRETO } }) }] }));
    r.push({ ht: 12, cells: [] }, { ht: 20, cells: [{ v: 'Por loja (ordem alfabética)', s: S.secao }] }, { ht: 22, cells: ['Loja', 'Total', 'Em aberto', 'Vencidas', 'Multas'].map(v => ({ v, s: S.cab })) });
    const porLoja = {};
    lista.forEach(n => {
        (porLoja[n.loja_id] = porLoja[n.loja_id] || []).push(n);
    });
    Object.values(porLoja).map(ns => ({ l: lojaDe(ns[0]), ns })).sort((a, b) => a.l.nome.localeCompare(b.l.nome, 'pt-BR')).forEach(({ l, ns }, i) => {
        const a = ns.filter(n => !n.baixada);
        r.push({ ht: 20, cells: [{ v: `${l.nome} — loja ${l.numero}`, s: cel(i % 2) }, { v: ns.length, s: cel(i % 2, { h: 'center', font: { b: 1 } }) }, { v: a.length, s: cel(i % 2, { h: 'center' }) }, { v: a.filter(n => n.data_vencimento < h).length, s: cel(i % 2, { h: 'center', font: { cor: VERM } }) }, { v: ns.filter(n => ehMulta(n.etapa)).length, s: cel(i % 2, { h: 'center' }) }] });
    });
    r.push({ ht: 12, cells: [] }, { ht: 20, cells: [{ v: 'Por tema / ocorrência', s: S.secao }] }, { ht: 22, cells: ['Tema / ocorrência', 'Total', 'Em aberto', 'Vencidas', 'Multas'].map(v => ({ v, s: S.cab })) });
    const porOc = {};
    lista.forEach(n => {
        const k = ocKey(n.infracao);
        (porOc[k] = porOc[k] || { nome: (n.infracao || '').trim(), t: 0, a: 0, v: 0, m: 0, ns: [] });
        const o = porOc[k];
        o.t++;
        o.ns.push(n);
        if (!n.baixada) {
            o.a++;
            if (n.data_vencimento < h)
                o.v++;
        }
        if (ehMulta(n.etapa))
            o.m++;
    });
    const temas = Object.values(porOc).sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    [...temas].sort((a, b) => b.t - a.t || a.nome.localeCompare(b.nome, 'pt-BR')).forEach((o, i) => r.push({ ht: 20, cells: [{ v: o.nome, s: cel(i % 2, { wrap: 1 }) }, { v: o.t, s: cel(i % 2, { h: 'center', font: { b: 1 } }) }, { v: o.a, s: cel(i % 2, { h: 'center' }) }, { v: o.v, s: cel(i % 2, { h: 'center', font: { cor: VERM } }) }, { v: o.m, s: cel(i % 2, { h: 'center' }) }] }));
    const resumo = XL.planilha({ linhas: r, larguras: [46, 13, 13, 13, 13], mesclas: ['A1:E1', 'A2:E2', 'A3:E3'], paisagem: false, rodape: `${EMPRESA} — Resumo` });
    const abas = [{ nome: 'Notificações', xml: principal.xml, filtro: principal.filtro, titulos: 5 }, { nome: 'Resumo', xml: resumo }];
    /* uma aba para cada tema (quando é o relatório de uma loja com mais de um tema) */
    if (porTema && temas.length > 1 && temas.length <= 40)
        temas.forEach(o => {
            const a = abaNotif(o.ns, `${lojaTitulo ? lojaTitulo + ' — ' : ''}Tema: ${o.nome}`);
            abas.push({ nome: o.nome, xml: a.xml, filtro: a.filtro, titulos: 5 });
        });
    baixarArquivo(XL.livro(abas, E), nome);
    toast('Planilha do Excel gerada.');
}
