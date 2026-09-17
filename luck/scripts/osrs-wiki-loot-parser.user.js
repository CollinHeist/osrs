// ==UserScript==
// @name         OSRS Wiki Loot to activities.json
// @namespace    https://github.com/collinheist/osrs
// @version      1.1.1
// @description  Convert OSRS Wiki loot tables into an activity definition.
// @match        https://oldschool.runescape.wiki/w/*
// @grant        none
// @run-at       document-idle
// ==/UserScript==

(() => {
  'use strict'

  const WIKI_ORIGIN = 'https://oldschool.runescape.wiki'
  const TABLE_SELECTOR = 'table.item-drops'
  const styles = `
    #osrs-loot-parser-launcher {
      position: fixed;
      right: 18px;
      bottom: 18px;
      z-index: 10000;
      padding: 10px 14px;
      border: 1px solid #765827;
      border-radius: 5px;
      background: #3f3325;
      color: #fff;
      font: 600 14px/1.2 sans-serif;
      box-shadow: 0 2px 8px #0006;
      cursor: pointer;
    }
    #osrs-loot-parser-overlay {
      position: fixed;
      inset: 0;
      z-index: 10001;
      display: none;
      place-items: center;
      padding: 24px;
      background: #000a;
      box-sizing: border-box;
    }
    #osrs-loot-parser-overlay.open { display: grid; }
    #osrs-loot-parser-panel {
      width: min(920px, 100%);
      max-height: 92vh;
      overflow: auto;
      padding: 20px;
      border: 1px solid #8c784f;
      border-radius: 7px;
      background: #f2eadb;
      color: #2d261c;
      font: 14px/1.4 sans-serif;
      box-sizing: border-box;
      box-shadow: 0 8px 30px #0009;
    }
    #osrs-loot-parser-panel * { box-sizing: border-box; }
    #osrs-loot-parser-panel h2 { margin: 0 0 14px; }
    #osrs-loot-parser-panel h3 { margin: 0; font-size: 15px; }
    .osrs-parser-grid {
      display: grid;
      grid-template-columns: repeat(3, minmax(0, 1fr));
      gap: 10px;
      margin-bottom: 14px;
    }
    .osrs-parser-field { display: grid; gap: 3px; }
    .osrs-parser-field label { font-weight: 600; }
    .osrs-parser-field input,
    .osrs-parser-field select,
    #osrs-loot-parser-output {
      width: 100%;
      padding: 7px;
      border: 1px solid #9b8b70;
      border-radius: 3px;
      background: #fff;
      color: #211c15;
    }
    .osrs-parser-table {
      margin: 8px 0;
      border: 1px solid #b4a78f;
      border-radius: 4px;
      background: #fffaf0;
    }
    .osrs-parser-table summary {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 9px;
      cursor: pointer;
      list-style: none;
    }
    .osrs-parser-table summary::-webkit-details-marker { display: none; }
    .osrs-parser-table summary h3 { flex: 1; }
    .osrs-parser-table-controls {
      display: grid;
      grid-template-columns: 1fr 150px 105px auto;
      gap: 8px;
      padding: 0 9px 9px;
    }
    .osrs-parser-items {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 4px 12px;
      max-height: 260px;
      overflow: auto;
      padding: 9px;
      border-top: 1px solid #d8cdbb;
    }
    .osrs-parser-item {
      display: flex;
      align-items: baseline;
      gap: 6px;
      min-width: 0;
    }
    .osrs-parser-item span {
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .osrs-parser-muted { color: #6c6254; font-size: 12px; }
    #osrs-parser-gp-value {
      margin: 12px 0;
      padding: 10px 12px;
      border: 1px solid #b4a78f;
      border-radius: 4px;
      background: #e7ddc9;
      font-size: 16px;
      font-weight: 600;
    }
    .osrs-parser-actions {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      margin: 14px 0 8px;
    }
    .osrs-parser-actions button {
      padding: 7px 11px;
      border: 1px solid #765827;
      border-radius: 3px;
      background: #4e402d;
      color: #fff;
      cursor: pointer;
    }
    .osrs-parser-actions button.secondary {
      background: #eee4d3;
      color: #2d261c;
    }
    #osrs-loot-parser-output {
      min-height: 260px;
      resize: vertical;
      font: 12px/1.45 ui-monospace, SFMono-Regular, Menlo, monospace;
    }
    #osrs-loot-parser-status {
      min-height: 20px;
      margin: 6px 0;
      color: #725213;
    }
    @media (max-width: 720px) {
      .osrs-parser-grid { grid-template-columns: 1fr; }
      .osrs-parser-table-controls { grid-template-columns: 1fr 1fr; }
      .osrs-parser-items { grid-template-columns: 1fr; }
    }
  `

  function slugify(value) {
    return value
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/&/g, ' and ')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
  }

  function cleanText(element) {
    return element?.textContent.replace(/\s+/g, ' ').trim() ?? ''
  }

  function parseFraction(value) {
    const match = value
      ?.replace(/[~,]/g, '')
      .match(/^\s*(\d+(?:\.\d+)?)\s*\/\s*(\d+(?:\.\d+)?)\s*$/)
    if (!match) return null

    const numerator = Number(match[1])
    const denominator = Number(match[2])
    return numerator > 0 && denominator >= numerator
      ? [numerator, denominator]
      : null
  }

  function parseGpNumber(value) {
    const match = value.trim().match(/^([\d,.]+)\s*([kmb])?$/i)
    if (!match) return null

    const number = Number(match[1].replace(/,/g, ''))
    const multiplier = { k: 1_000, m: 1_000_000, b: 1_000_000_000 }[match[2]?.toLowerCase()] ?? 1
    return Number.isFinite(number) ? number * multiplier : null
  }

  function parseGpValue(cell) {
    if (!cell) return null
    if (cell.classList.contains('table-na') || /not (?:sold|tradeable)/i.test(cleanText(cell))) {
      return 0
    }

    const values = cleanText(cell)
      .split(/\s*(?:–|—|-|;)\s*/)
      .map(parseGpNumber)
      .filter((value) => value !== null)
    if (values.length === 0) return null
    return values.reduce((sum, value) => sum + value, 0) / values.length
  }

  function canonicalWikiUrl() {
    const canonical = document.querySelector('link[rel="canonical"]')?.href
    if (canonical?.startsWith(WIKI_ORIGIN)) return canonical

    const pageName = window.mw?.config?.get('wgPageName')
    return pageName
      ? `${WIKI_ORIGIN}/w/${pageName}`
      : `${WIKI_ORIGIN}${window.location.pathname}`
  }

  function fileRedirectUrl(filename) {
    if (!filename) return ''
    return `${WIKI_ORIGIN}/w/Special:Redirect/file/${filename.replaceAll(' ', '_')}`
  }

  function filenameFromFileLink(link) {
    if (!link) return ''

    try {
      const decodedPath = decodeURIComponent(new URL(link.href, window.location.href).pathname)
      return decodedPath.match(/\/File:(.+)$/)?.[1] ?? ''
    } catch {
      return ''
    }
  }

  function dropImageUrl(row, name) {
    const image = row.querySelector('.inventory-image img, img')
    const alt = image?.alt ?? ''
    const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const namedFile = alt.match(new RegExp(`^(${escapedName}(?: \\(.*?\\))?\\.(?:png|gif|jpg|webp))(?::|$)`, 'i'))
    const genericFile = alt.match(/^(.+?\.(?:png|gif|jpg|webp))(?::|$)/i)
    return fileRedirectUrl(namedFile?.[1] ?? genericFile?.[1] ?? `${name}.png`)
  }

  function headingTrail(table) {
    let node = table.previousElementSibling
    const headings = []
    let smallestLevel = 7

    while (node) {
      const heading = node.matches('.mw-heading')
        ? node.querySelector('h2, h3, h4, h5, h6')
        : node.matches('h2, h3, h4, h5, h6') ? node : null
      if (heading) {
        const level = Number(heading.tagName.slice(1))
        if (level < smallestLevel) {
          headings.unshift(cleanText(heading))
          smallestLevel = level
        }
        if (level === 2) break
      }
      node = node.previousElementSibling
    }

    const detailedHeadings = headings.filter((_, index) => index > 0 || headings.length === 1)
    return detailedHeadings.length > 0 ? detailedHeadings : ['Drops']
  }

  function tableColumnIndexes(table) {
    const headers = [...table.querySelectorAll('thead th')]
    const find = (pattern) => headers.findIndex((header) => pattern.test(cleanText(header)))
    const gePrice = headers.findIndex((header) => header.classList.contains('ge-column'))
    return {
      rarity: find(/^(?:rarity|chance|rate)$/i),
      price: gePrice >= 0 ? gePrice : find(/^(?:price|ge price|value)$/i),
    }
  }

  function parseDropRow(row, tableName, columns) {
    const itemLink = row.querySelector('td.item-col a[href], td:nth-child(2) a[href]')
    const name = cleanText(itemLink)
    if (!name) return null

    const fractionElement = row.querySelector('[data-drop-fraction]')
    const rarityCell = fractionElement?.closest('td')
      ?? (columns.rarity >= 0 ? row.cells[columns.rarity] : null)
      ?? [...row.cells].find((cell) => /\balways\b/i.test(cleanText(cell)))
    const rarityText = cleanText(rarityCell)
    const fraction = fractionElement?.dataset.dropFraction
    const raritySortValue = Number(rarityCell?.dataset.sortValue?.replace(/,/g, ''))
    const rate = parseFraction(fraction)
      ?? (/\balways\b/i.test(rarityText) ? [1, 1] : null)
      ?? (Number.isFinite(raritySortValue) && raritySortValue >= 1
        ? [1, raritySortValue]
        : null)
    if (!rate) {
      return {
        warning: `${tableName}: skipped "${name}" because its rate is not one exact fraction (${fraction || rarityText || 'missing'}).`,
      }
    }

    const wikiUrl = new URL(itemLink.getAttribute('href'), WIKI_ORIGIN).href
    const priceCell = row.querySelector('td.ge-column')
      ?? (columns.price >= 0 ? row.cells[columns.price] : null)
    return {
      drop: {
        id: slugify(name),
        name,
        rate,
        wikiUrl,
        imageUrl: dropImageUrl(row, name),
        gpValue: parseGpValue(priceCell),
      },
    }
  }

  function parseTable(table, index) {
    const headings = headingTrail(table)
    const name = headings.join(' — ')
    const warnings = []
    const drops = []
    const columns = tableColumnIndexes(table)

    for (const row of table.querySelectorAll('tbody tr')) {
      const result = parseDropRow(row, name, columns)
      if (result?.drop) drops.push(result.drop)
      if (result?.warning) warnings.push(result.warning)
    }

    return {
      id: slugify(name) || `drops-${index + 1}`,
      name,
      familyId: headings.length > 1 ? slugify(headings.slice(0, -1).join('-')) : '',
      hasPriceColumn: columns.price >= 0 || Boolean(table.querySelector('td.ge-column')),
      drops,
      warnings,
    }
  }

  function parsePage() {
    const title = cleanText(document.querySelector('.mw-page-title-main, #firstHeading'))
      || document.title.replace(/\s*-\s*OSRS Wiki\s*$/, '')
    const infoboxFileLink = document.querySelector('.infobox-image a[href*="/File:"]')
    const tables = [...document.querySelectorAll(TABLE_SELECTOR)]
      .map(parseTable)
      .filter((table) => table.drops.length > 0)
    const usedTableIds = new Set()
    const familyCounts = new Map()

    for (const table of tables) {
      const baseId = table.id
      let suffix = 2
      while (usedTableIds.has(table.id)) {
        table.id = `${baseId}-${suffix}`
        suffix += 1
      }
      usedTableIds.add(table.id)
      if (table.familyId) {
        familyCounts.set(table.familyId, (familyCounts.get(table.familyId) ?? 0) + 1)
      }
    }

    const selectedFamilies = new Set()
    for (const table of tables) {
      table.isAlternative = (familyCounts.get(table.familyId) ?? 0) > 1
      table.defaultEnabled = !table.isAlternative || !selectedFamilies.has(table.familyId)
      if (table.isAlternative) selectedFamilies.add(table.familyId)
    }

    return {
      title,
      wikiUrl: canonicalWikiUrl(),
      imageUrl: fileRedirectUrl(filenameFromFileLink(infoboxFileLink) || `${title}.png`),
      tables,
    }
  }

  function field(label, value, attributes = '') {
    return `
      <div class="osrs-parser-field">
        <label>${label}</label>
        <input value="${escapeHtml(value)}" ${attributes}>
      </div>
    `
  }

  function escapeHtml(value) {
    const element = document.createElement('div')
    element.textContent = value
    return element.innerHTML
  }

  function tableMarkup(table, tableIndex) {
    const itemMarkup = table.drops.map((drop, dropIndex) => `
      <label class="osrs-parser-item" title="${escapeHtml(drop.name)}">
        <input type="checkbox" class="osrs-parser-drop" data-drop-index="${dropIndex}" checked>
        <span>${escapeHtml(drop.name)}</span>
        <small class="osrs-parser-muted">${drop.rate[0]}/${drop.rate[1]}</small>
        ${drop.gpValue === null ? '' : `<small class="osrs-parser-muted">${formatGp(drop.gpValue)} gp</small>`}
      </label>
    `).join('')

    return `
      <details
        class="osrs-parser-table"
        data-table-index="${tableIndex}"
        data-family-id="${escapeHtml(table.isAlternative ? table.familyId : '')}"
      >
        <summary>
          <input type="checkbox" class="osrs-parser-group-enabled" ${table.defaultEnabled ? 'checked' : ''}>
          <h3>${escapeHtml(table.name)}</h3>
          <span class="osrs-parser-muted">
            ${table.drops.length} parsed${table.isAlternative ? ' · alternative subtable' : ''}
          </span>
        </summary>
        <div class="osrs-parser-table-controls">
          <input class="osrs-parser-group-id" aria-label="Group ID" value="${escapeHtml(table.id)}">
          <select class="osrs-parser-group-type" aria-label="Group type">
            <option value="exclusive">Exclusive</option>
            <option value="independent">Independent</option>
          </select>
          <input class="osrs-parser-rolls" type="number" aria-label="Rolls per unit" min="0.000001" step="any" value="1">
          <span>
            <button type="button" class="osrs-parser-select-all secondary">All</button>
            <button type="button" class="osrs-parser-select-none secondary">None</button>
          </span>
        </div>
        <div class="osrs-parser-items">${itemMarkup}</div>
      </details>
    `
  }

  function createInterface(page) {
    document.querySelector('#osrs-loot-parser-launcher')?.remove()
    document.querySelector('#osrs-loot-parser-overlay')?.remove()
    document.querySelector('#osrs-loot-parser-styles')?.remove()

    const style = document.createElement('style')
    style.id = 'osrs-loot-parser-styles'
    style.textContent = styles
    document.head.append(style)

    const launcher = document.createElement('button')
    launcher.id = 'osrs-loot-parser-launcher'
    launcher.type = 'button'
    launcher.textContent = `Export loot JSON (${page.tables.length})`

    const overlay = document.createElement('div')
    overlay.id = 'osrs-loot-parser-overlay'
    overlay.innerHTML = `
      <section id="osrs-loot-parser-panel" role="dialog" aria-modal="true" aria-labelledby="osrs-parser-title">
        <h2 id="osrs-parser-title">Export activity JSON</h2>
        <div class="osrs-parser-grid">
          ${field('Activity name', page.title, 'id="osrs-parser-name"')}
          ${field('Activity ID', slugify(page.title), 'id="osrs-parser-id"')}
          ${field('Category', 'Other', 'id="osrs-parser-category"')}
          ${field('Singular unit', 'kill', 'id="osrs-parser-unit-singular"')}
          ${field('Plural unit', 'kills', 'id="osrs-parser-unit-plural"')}
          ${field('Activity image URL', page.imageUrl, 'id="osrs-parser-image"')}
        </div>
        <p class="osrs-parser-muted">
          Select only drops tracked by the app. Review group type and rolls per unit;
          Wiki table headings do not encode those mechanics. For alternative level or
          condition subtables, select only the applicable table.
        </p>
        <div id="osrs-parser-tables">
          ${page.tables.map(tableMarkup).join('')}
        </div>
        <div id="osrs-parser-gp-value"></div>
        <div class="osrs-parser-actions">
          <button type="button" id="osrs-parser-generate">Generate JSON</button>
          <button type="button" id="osrs-parser-copy">Copy JSON</button>
          <button type="button" id="osrs-parser-download">Download JSON</button>
          <button type="button" id="osrs-parser-close" class="secondary">Close</button>
        </div>
        <div id="osrs-loot-parser-status" role="status"></div>
        <textarea id="osrs-loot-parser-output" spellcheck="false" aria-label="Generated JSON"></textarea>
      </section>
    `

    document.body.append(launcher, overlay)
    bindInterface(page, launcher, overlay)
  }

  function selectedActivity(page, overlay) {
    const groups = []
    const drops = []
    const usedDropIds = new Map()
    const warnings = page.tables.flatMap((table) => table.warnings)
    let expectedGp = 0
    let pricedDrops = 0
    let selectedDropsCount = 0

    for (const details of overlay.querySelectorAll('.osrs-parser-table')) {
      if (!details.querySelector('.osrs-parser-group-enabled').checked) continue

      const table = page.tables[Number(details.dataset.tableIndex)]
      const selectedDrops = [...details.querySelectorAll('.osrs-parser-drop:checked')]
        .map((checkbox) => table.drops[Number(checkbox.dataset.dropIndex)])
      const groupDropIds = []
      const rollsPerUnit = Number(details.querySelector('.osrs-parser-rolls').value) || 1

      for (const drop of selectedDrops) {
        const previous = usedDropIds.get(drop.id)
        if (previous) {
          if (JSON.stringify(previous.rate) !== JSON.stringify(drop.rate)) {
            warnings.push(`"${drop.name}" has multiple rates; kept ${previous.rate.join('/')} and omitted ${drop.rate.join('/')}.`)
          } else {
            warnings.push(`"${drop.name}" appears in multiple tables; kept only its first table membership.`)
          }
          continue
        }

        usedDropIds.set(drop.id, drop)
        groupDropIds.push(drop.id)
        selectedDropsCount += 1
        if (drop.gpValue !== null) {
          expectedGp += (drop.rate[0] / drop.rate[1]) * drop.gpValue * rollsPerUnit
          pricedDrops += 1
        }
        drops.push({
          id: drop.id,
          name: drop.name,
          rate: drop.rate,
          wikiUrl: drop.wikiUrl,
          imageUrl: drop.imageUrl,
        })
      }

      if (groupDropIds.length > 0) {
        groups.push({
          id: details.querySelector('.osrs-parser-group-id').value.trim() || table.id,
          type: details.querySelector('.osrs-parser-group-type').value,
          rollsPerUnit,
          drops: groupDropIds,
        })
      }
    }

    const activity = {
      id: overlay.querySelector('#osrs-parser-id').value.trim(),
      name: overlay.querySelector('#osrs-parser-name').value.trim(),
      category: overlay.querySelector('#osrs-parser-category').value.trim(),
      wikiUrl: page.wikiUrl,
      imageUrl: overlay.querySelector('#osrs-parser-image').value.trim(),
      unit: {
        singular: overlay.querySelector('#osrs-parser-unit-singular').value.trim(),
        plural: overlay.querySelector('#osrs-parser-unit-plural').value.trim(),
      },
      groups,
      drops,
    }

    return { activity, warnings, expectedGp, pricedDrops, selectedDropsCount }
  }

  function generate(page, overlay) {
    const { activity, warnings } = selectedActivity(page, overlay)
    const output = overlay.querySelector('#osrs-loot-parser-output')
    const status = overlay.querySelector('#osrs-loot-parser-status')
    output.value = JSON.stringify(activity, null, 2)
    status.textContent = warnings.length > 0
      ? `${warnings.length} warning(s): ${warnings.join(' ')}`
      : `Generated ${activity.drops.length} drops in ${activity.groups.length} groups.`
    return output.value
  }

  function formatGp(value) {
    return new Intl.NumberFormat('en-GB', {
      maximumFractionDigits: value < 10 ? 2 : 0,
    }).format(value)
  }

  function updateGpValue(page, overlay) {
    const { expectedGp, pricedDrops, selectedDropsCount } = selectedActivity(page, overlay)
    const display = overlay.querySelector('#osrs-parser-gp-value')
    if (!page.tables.some((table) => table.hasPriceColumn)) {
      display.textContent = 'Effective GP value unavailable: no Price column found.'
      return
    }

    const coverage = pricedDrops < selectedDropsCount
      ? ` (${pricedDrops} of ${selectedDropsCount} selected drops priced)`
      : ''
    display.textContent = `Effective selected loot value: ${formatGp(expectedGp)} GP per tracked unit${coverage}`
  }

  async function copyText(text, output) {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      output.focus()
      output.select()
      document.execCommand('copy')
    }
  }

  function downloadJson(json, filename) {
    const link = document.createElement('a')
    link.href = URL.createObjectURL(new Blob([`${json}\n`], { type: 'application/json' }))
    link.download = `${filename || 'activity'}.json`
    link.click()
    setTimeout(() => URL.revokeObjectURL(link.href), 0)
  }

  function bindInterface(page, launcher, overlay) {
    const output = overlay.querySelector('#osrs-loot-parser-output')
    const status = overlay.querySelector('#osrs-loot-parser-status')

    launcher.addEventListener('click', () => {
      overlay.classList.add('open')
      generate(page, overlay)
      updateGpValue(page, overlay)
    })
    overlay.querySelector('#osrs-parser-close').addEventListener('click', () => {
      overlay.classList.remove('open')
    })
    overlay.addEventListener('click', (event) => {
      if (event.target === overlay) overlay.classList.remove('open')
    })
    overlay.querySelector('#osrs-parser-name').addEventListener('input', (event) => {
      overlay.querySelector('#osrs-parser-id').value = slugify(event.target.value)
    })
    overlay.querySelector('#osrs-parser-generate').addEventListener('click', () => {
      generate(page, overlay)
      updateGpValue(page, overlay)
    })
    overlay.querySelector('#osrs-parser-copy').addEventListener('click', async () => {
      await copyText(generate(page, overlay), output)
      status.textContent = 'Copied activity JSON to the clipboard.'
    })
    overlay.querySelector('#osrs-parser-download').addEventListener('click', () => {
      const json = generate(page, overlay)
      downloadJson(json, overlay.querySelector('#osrs-parser-id').value.trim())
      status.textContent = 'Downloaded activity JSON.'
    })
    overlay.querySelectorAll('.osrs-parser-select-all, .osrs-parser-select-none').forEach((button) => {
      button.addEventListener('click', () => {
        const checked = button.classList.contains('osrs-parser-select-all')
        button.closest('.osrs-parser-table').querySelectorAll('.osrs-parser-drop')
          .forEach((checkbox) => { checkbox.checked = checked })
        updateGpValue(page, overlay)
      })
    })
    overlay.querySelectorAll('.osrs-parser-group-enabled').forEach((checkbox) => {
      checkbox.addEventListener('click', (event) => {
        event.stopPropagation()
        const details = checkbox.closest('.osrs-parser-table')
        const familyId = details.dataset.familyId
        if (!checkbox.checked || !familyId) return

        overlay.querySelectorAll('.osrs-parser-table').forEach((candidate) => {
          if (candidate !== details && candidate.dataset.familyId === familyId) {
            candidate.querySelector('.osrs-parser-group-enabled').checked = false
          }
        })
      })
    })
    overlay.querySelector('#osrs-parser-tables').addEventListener('change', () => {
      updateGpValue(page, overlay)
    })
    overlay.querySelector('#osrs-parser-tables').addEventListener('input', () => {
      updateGpValue(page, overlay)
    })
  }

  const parsedPage = parsePage()
  if (parsedPage.tables.length > 0) createInterface(parsedPage)
})()
