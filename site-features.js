document.addEventListener('DOMContentLoaded', () => {
  const records = window.SITE_DATA || [];
  const main = document.querySelector('main');
  if (!main || records.length === 0) return;

  const section = document.createElement('section');
  section.className = 'bg-slate-800/40 p-6 md:p-8 rounded-2xl border border-slate-700 shadow-xl mt-8';
  section.innerHTML = `
    <h2 class="text-2xl font-bold mb-4 text-white">5. Study records</h2>
    <p class="text-sm text-slate-300 mb-4">The site dataset contains 69 records from 69 articles. Article 70 was excluded because it has no carbohydrate component. PDF identifiers were matched, and numeric fields affected by reviewer comments were screened. Chart groups summarize wording in the workbook; exact reported text appears in each record. Some values still require supplementary tables or further source review.</p>
    <div class="flex flex-col md:flex-row md:items-center gap-3 mb-5">
      <label for="record-search" class="font-semibold">Search studies</label>
      <input id="record-search" type="search" class="w-full md:w-96 px-3 py-2 rounded-lg bg-slate-900 border border-slate-600 text-white" placeholder="DOI, material, method, measurement...">
      <span id="record-count" class="text-sm text-slate-400" aria-live="polite"></span>
    </div>
    <div class="overflow-x-auto"><table class="w-full min-w-[900px] text-sm text-left"><thead><tr class="text-slate-200 bg-slate-900/70"><th class="px-3 py-3">Article</th><th class="px-3 py-3">DOI</th><th class="px-3 py-3">Lignin group</th><th class="px-3 py-3">Carbohydrate group</th><th class="px-3 py-3">Method group</th><th class="px-3 py-3">Application group</th><th class="px-3 py-3">Record</th></tr></thead><tbody id="record-table-body"></tbody></table></div>`;
  main.appendChild(section);

  const body = section.querySelector('#record-table-body');
  const search = section.querySelector('#record-search');
  const count = section.querySelector('#record-count');

  function renderRecords() {
    const query = search.value.trim().toLowerCase();
    const shown = records.filter(record => !query || [record.DOI, ...Object.values(record.fields)].some(value => String(value).toLowerCase().includes(query)));
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
      const verification = document.createElement('p');
      verification.className = 'mt-5 p-3 rounded bg-slate-800 text-sm text-slate-300';
      verification.textContent = `PDF check: ${record.verification_status}. ${record.verification_note || 'DOI matched; the reviewed numeric fields were screened.'}`;
      detailCell.append(grid, verification);
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
    const pairs = selected.filter(record => record[x] !== null && record[y] !== null && (!logX || record[x] > 0) && (!logY || record[y] > 0));
    const metric = document.getElementById('dist-y-select').value;
    const distribution = selected.filter(record => record[metric] !== null);
    document.getElementById('scatter-count').textContent = `${pairs.length} paired records shown from ${selected.length} filtered records.`;
    document.getElementById('distribution-count').textContent = `${distribution.length} records have one eligible value for this metric.`;
  }
  for (const id of ['filter-category-select', 'filter-value-select', 'x-axis-select', 'y-axis-select', 'dist-y-select', 'log-x-checkbox', 'log-y-checkbox']) {
    document.getElementById(id).addEventListener('change', updateChartCounts);
  }
  updateChartCounts();

  function downloadFullCSV() {
    const fields = Object.keys(records[0].fields);
    const headers = ['Article number', 'DOI', ...fields, 'PDF verification status', 'PDF verification finding'];
    const quote = value => `"${String(value ?? '').replace(/"/g, '""')}"`;
    const lines = [headers.map(quote).join(',')];
    for (const record of records) {
      const values = [record.article_number, record.DOI, ...fields.map(field => record.fields[field]), record.verification_status, record.verification_note];
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
