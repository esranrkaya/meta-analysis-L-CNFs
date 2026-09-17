document.addEventListener('DOMContentLoaded', () => {
  const records = window.SITE_DATA || [];
  const main = document.querySelector('main');
  if (!main || records.length === 0) return;

  const section = document.createElement('section');
  section.className = 'bg-slate-800/40 p-6 md:p-8 rounded-2xl border border-slate-700 shadow-xl mt-8';
  section.innerHTML = `
    <h2 class="text-2xl font-bold mb-4 text-white">5. Study records</h2>
    <p class="text-sm text-slate-300 mb-4">The site dataset contains 69 records from 69 articles. Article 70 was excluded because it has no carbohydrate component. PDF identifiers were matched, and numeric fields affected by reviewer comments were screened. Lignin groups reflect the source or type stated in each article; exact wording appears in each record. Some values still require supplementary tables or further source review.</p>
    <div class="flex flex-col md:flex-row md:items-center gap-3 mb-5">
      <label for="record-search" class="font-semibold">Search studies</label>
      <input id="record-search" type="search" class="w-full md:w-96 px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" placeholder="DOI, material, method, measurement...">
      <span id="record-count" class="text-sm text-slate-400" aria-live="polite"></span>
    </div>
    <div class="overflow-x-auto"><table class="w-full min-w-[900px] text-sm text-left"><thead><tr class="text-slate-200 bg-slate-900/70"><th class="px-3 py-3">Article</th><th class="px-3 py-3">DOI</th><th class="px-3 py-3">Lignin source/type</th><th class="px-3 py-3">Carbohydrate type</th><th class="px-3 py-3">Method type</th><th class="px-3 py-3">Application</th><th class="px-3 py-3">Record</th></tr></thead><tbody id="record-table-body"></tbody></table></div>`;
  main.appendChild(section);

  const body = section.querySelector('#record-table-body');
  const search = section.querySelector('#record-search');
  const count = section.querySelector('#record-count');

  function renderRecords() {
    const query = search.value.trim().toLowerCase();
    const shown = records.filter(record => !query || [record.DOI, record.Formulation_Relationship, ...Object.entries(record.fields).filter(([label]) => label !== 'Review Notes').map(([, value]) => value)].some(value => String(value).toLowerCase().includes(query)));
    const articleCount = new Set(shown.map(record => record.DOI)).size;
    count.textContent = `${shown.length} records from ${articleCount} ${articleCount === 1 ? 'article' : 'articles'}`;
    body.replaceChildren();
    for (const record of shown) {
      const row = document.createElement('tr');
      const values = [record.fields['Article No. & DOI'], record.DOI, record.Lignin_Type, record.Carbohydrate_Type, record.Synthesis_Method, record.Target_Application];
      for (const [index, value] of values.entries()) {
        const cell = document.createElement('td');
        if (index === 1 && /^10\.\d{4,9}\//.test(record.DOI)) {
          const link = document.createElement('a');
          link.href = `https://doi.org/${record.DOI}`;
          link.target = '_blank';
          link.rel = 'noopener noreferrer';
          link.className = 'text-sky-400 hover:text-sky-300 underline';
          link.textContent = record.DOI;
          cell.appendChild(link);
        } else {
          cell.textContent = value || 'N/R';
        }
        cell.className = 'px-3 py-3 border-b border-slate-700 align-top';
        row.appendChild(cell);
      }
      const action = document.createElement('td');
      action.className = 'px-3 py-3 border-b border-slate-700';
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = 'Details';
      button.className = 'text-sky-400 hover:text-sky-300 underline';
      action.appendChild(button);
      row.appendChild(action);
      body.appendChild(row);

      const detail = document.createElement('tr');
      detail.hidden = true;
      const detailCell = document.createElement('td');
      detailCell.colSpan = 7;
      detailCell.className = 'px-4 py-4 border-b border-slate-700 bg-slate-900/70';
      const grid = document.createElement('dl');
      grid.className = 'grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm';
      for (const [label, value] of Object.entries(record.fields)) {
        if (label === 'Review Notes') continue;
        const item = document.createElement('div');
        const term = document.createElement('dt');
        term.className = 'font-semibold text-slate-300';
        term.textContent = label;
        const description = document.createElement('dd');
        description.className = 'text-slate-400 break-words';
        description.textContent = value || 'N/R';
        item.append(term, description);
        grid.appendChild(item);
      }
      detailCell.append(grid);
      detail.appendChild(detailCell);
      body.appendChild(detail);
      button.addEventListener('click', () => {
        detail.hidden = !detail.hidden;
        button.textContent = detail.hidden ? 'Details' : 'Hide details';
      });
    }
  }
  search.addEventListener('input', renderRecords);
  renderRecords();

  function updateChartCounts() {
    const category = document.getElementById('filter-category-select').value;
    const value = document.getElementById('filter-value-select').value;
    const aliases = {'wound dressings':'wound dressing','free-radical copolymerization':'free radical polymerization','free-radical polymerization':'free radical polymerization','chemical crosslinking':'chemical cross-linking','solution casting':'solvent casting','wastewater purification':'wastewater treatment','biomedical':'biomedical devices'};
    const categoryKey = raw => {const key=String(raw || '').trim().toLowerCase();return aliases[key] || key;};
    const selected = value === 'All' ? records : records.filter(record => categoryKey(record[category]) === categoryKey(value));
    const x = document.getElementById('x-axis-select').value;
    const y = document.getElementById('y-axis-select').value;
    const logX = document.getElementById('log-x-checkbox').checked;
    const logY = document.getElementById('log-y-checkbox').checked;
    const pearsonGroup = (window.PEARSON_PAIRS || []).find(group =>
      (group.xKey === x && group.yKey === y) || (group.xKey === y && group.yKey === x));
    const pairs = pearsonGroup
      ? pearsonGroup.pairs.filter(pair => selected.some(record => record.article_number === pair.article_number) &&
          (!logX || (x === pearsonGroup.xKey ? pair.x : pair.y) > 0) &&
          (!logY || (y === pearsonGroup.yKey ? pair.y : pair.x) > 0))
      : selected.filter(record => record[x] !== null && record[y] !== null &&
          (!logX || record[x] > 0) && (!logY || record[y] > 0));
    const metric = document.getElementById('dist-y-select').value;
    const distribution = selected.filter(record => record[metric] !== null);
    document.getElementById('scatter-count').textContent = `${pairs.length} paired records shown from ${selected.length} filtered records.`;
    if (metric !== 'Tensile_Strength_MPa') {
      document.getElementById('distribution-count').textContent = `${distribution.length} records have one eligible value for this metric.`;
    }
  }
  for (const id of ['filter-category-select', 'filter-value-select', 'x-axis-select', 'y-axis-select', 'dist-y-select', 'log-x-checkbox', 'log-y-checkbox']) {
    document.getElementById(id).addEventListener('change', updateChartCounts);
  }
  updateChartCounts();

  function downloadFullCSV() {
    const fields = [...new Set(records.flatMap(record => Object.keys(record.fields)))].filter(field => field !== 'Review Notes');
    const headers = ['Article number', 'DOI', ...fields];
    const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.map(quote).join(',')];
    for (const record of records) {
      const values = [record.article_number, record.DOI, ...fields.map(field => record.fields[field])];
      lines.push(values.map(quote).join(','));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\r\n')], {type:'text/csv;charset=utf-8;'});
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = 'lignin_nanocellulose_verified_records.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(link.href);
  }
  const oldButton = document.getElementById('download-csv-btn');
  const newButton = oldButton.cloneNode(true);
  oldButton.replaceWith(newButton);
  newButton.addEventListener('click', downloadFullCSV);
});

document.addEventListener('DOMContentLoaded', () => {
  const allRecords = window.SITE_DATA || [];
  const grid = document.getElementById('evidence-grid');
  const detail = document.getElementById('evidence-detail');
  const applicationSelect = document.getElementById('evidence-application');
  const includeMfc = document.getElementById('evidence-include-mfc');
  const scope = document.getElementById('evidence-scope');
  if (!allRecords.length || !grid || !detail || !applicationSelect || !includeMfc) return;

  const rawProperties = [
    ['Lignin molecular weight (Mw)', 'Lignin Mw (g/mol)'],
    ['Lignin molecular weight (Mn)', 'Lignin Mn (g/mol)'],
    ['Lignin dispersity (PDI)', 'Lignin PDI'],
    ['NC diameter / width', 'Carbo. Diameter / Width'],
    ['NC length', 'Carbo. Length'],
    ['NC aspect ratio', 'Carbo. Aspect Ratio'],
    ['NC surface potential', 'Carbo. Surface Potential (mV)'],
    ['NC charge density', 'Carbo. Charge Density (mmol/g)']
  ];
  const contactAngleArticles = new Set([2, 3, 4, 6, 12, 13, 15, 17, 29, 30, 33, 35, 38, 41, 43, 54, 57, 59, 61, 62, 64, 66, 69]);
  const tensileArticles = new Set([1, 4, 6, 9, 12, 32, 48, 57, 59, 60, 61, 62, 65, 68]);
  const outcomes = [
    {label: 'Water contact angle', field: 'Contact Angle (°)', check: record => contactAngleArticles.has(record.article_number)},
    {label: 'Tensile strength', field: 'Mechanical Properties', check: record => tensileArticles.has(record.article_number)},
    {label: 'UV protection', field: 'UV Protection', check: record => hasReport(record.fields['UV Protection'])},
    {label: 'Antibacterial activity', field: 'Antibacterial Activity', check: record => hasReport(record.fields['Antibacterial Activity'])},
    {label: 'Antioxidant activity', field: 'Antioxidant Activity', check: record => hasReport(record.fields['Antioxidant Activity'])},
    {label: 'Barrier / other activity', field: 'Barrier / Other Activity', check: record => hasReport(record.fields['Barrier / Other Activity'])}
  ];
  const applications = [...new Set(allRecords.map(record => record.Target_Application))].sort();
  for (const app of applications) applicationSelect.add(new Option(app, app));
  applicationSelect.value = applications.includes('Packaging and barrier') ? 'Packaging and barrier' : applications[0];

  function hasReport(value) {
    const text = String(value ?? '').trim();
    return text !== '' && !/^(N\/R|N\/A|NR|NA)(\b|\s|$)/i.test(text);
  }
  function hasNumericReport(value) {
    return hasReport(value) && /\d/.test(String(value));
  }
  function hasNanocellulose(record) {
    const type = String(record.fields['Carbo. Type & Source'] || '');
    return /\b(?:TO-?CNF|LCNF|LMF|CNF|CNC|NFC|MFC|TOCN|TCNF)s?\b|nanocellulose|cellulose.{0,20}nanofib|cellulose.{0,20}nanocryst|nanofibrillated cellulose|microfibrillated cellulose/i.test(type);
  }
  function scopedRecords() {
    return allRecords.filter(record => {
      if (record.Coformulation_Eligible === false) return false;
      if (record.Target_Application !== applicationSelect.value || !hasNanocellulose(record)) return false;
      const type = String(record.fields['Carbo. Type & Source'] || '');
      return includeMfc.checked || !/\bMFC\b|microfibrillated cellulose/i.test(type);
    });
  }
  function matchingRecords(records, field, outcome) {
    return records.filter(record => hasNumericReport(record.fields[field]) && outcome.check(record));
  }
  function countLevel(count) {
    return count === 0 ? 0 : count <= 2 ? 1 : count <= 5 ? 2 : 3;
  }
  function addText(parent, tag, text, className) {
    const element = document.createElement(tag);
    element.textContent = text;
    if (className) element.className = className;
    parent.appendChild(element);
    return element;
  }

  let selectedField = 'Carbo. Diameter / Width';
  let selectedOutcome = 'Contact Angle (°)';

  function showDetail(records) {
    const property = rawProperties.find(([, field]) => field === selectedField);
    const outcome = outcomes.find(candidate => candidate.field === selectedOutcome);
    const matches = matchingRecords(records, selectedField, outcome);
    detail.replaceChildren();
    addText(detail, 'h3', `${property[0]} × ${outcome.label}`, 'text-lg font-bold text-white');
    addText(detail, 'p', `${matches.length} ${matches.length === 1 ? 'article reports' : 'articles report'} both fields in ${applicationSelect.value}.`, 'text-sm text-purple-200 mt-1 mb-3');
    if (!matches.length) {
      addText(detail, 'p', 'No article in this selection reports both fields.', 'text-sm text-slate-400');
      return;
    }
    addText(detail, 'p', 'These entries are leads for source review, not verified correlations.', 'text-xs text-slate-400 mb-3');
    const cards = document.createElement('div');
    cards.className = 'evidence-detail-cards grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3 max-h-[420px] overflow-y-auto pr-1';
    for (const record of matches) {
      const card = document.createElement('article');
      card.className = 'rounded-xl border border-slate-600 bg-slate-900/70 p-4 text-sm';
      const link = document.createElement('a');
      link.textContent = `Article ${record.article_number} · ${record.DOI}`;
      link.href = /^10\.\d{4,9}\//.test(record.DOI) ? `https://doi.org/${record.DOI}` : `https://scholar.google.com/scholar?q=${encodeURIComponent(record.DOI)}`;
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.className = 'font-semibold text-sky-300 hover:underline break-all';
      card.appendChild(link);
      addText(card, 'p', record.fields['Carbo. Type & Source'] || 'Material not reported', 'text-xs text-slate-400 mt-2 mb-3');
      addText(card, 'p', `${property[0]}: ${record.fields[selectedField]}`, 'text-slate-200 break-words mb-2');
      addText(card, 'p', `${outcome.label}: ${record.fields[outcome.field]}`, 'text-slate-200 break-words');
      cards.appendChild(card);
    }
    detail.appendChild(cards);
  }

  function render() {
    const records = scopedRecords();
    const allApplicationRecords = allRecords.filter(record => record.Target_Application === applicationSelect.value);
    scope.textContent = `${records.length} nanocellulose articles in view · ${allApplicationRecords.length} articles in this application`;
    grid.replaceChildren();
    addText(grid, 'div', 'Raw material property', 'text-sm font-semibold text-slate-300 self-end pb-2');
    for (const outcome of outcomes) {
      const reported = records.filter(outcome.check).length;
      const head = document.createElement('div');
      head.className = 'text-center self-end pb-2';
      addText(head, 'div', outcome.label, 'text-sm font-semibold text-white');
      addText(head, 'div', `${reported} with outcome`, 'text-xs text-slate-400 mt-1');
      grid.appendChild(head);
    }
    for (const [label, field] of rawProperties) {
      addText(grid, 'div', label, 'flex items-center text-sm text-slate-200 px-2');
      for (const outcome of outcomes) {
        const matches = matchingRecords(records, field, outcome);
        const button = document.createElement('button');
        button.type = 'button';
        button.className = `evidence-cell evidence-level-${countLevel(matches.length)}`;
        button.textContent = `${matches.length} ${matches.length === 1 ? 'article' : 'articles'}`;
        button.setAttribute('aria-label', `${label} and ${outcome.label}: ${matches.length} articles. Show articles.`);
        button.setAttribute('aria-pressed', String(selectedField === field && selectedOutcome === outcome.field));
        button.addEventListener('click', () => {
          selectedField = field;
          selectedOutcome = outcome.field;
          render();
        });
        grid.appendChild(button);
      }
    }
    showDetail(records);
  }

  applicationSelect.addEventListener('change', render);
  includeMfc.addEventListener('change', render);
  render();
});
