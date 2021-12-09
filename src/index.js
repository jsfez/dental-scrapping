const puppeteer = require('puppeteer')
const fs = require('fs')
const util = require('util')

const writeFile = util.promisify(fs.writeFile)
const appendFile = util.promisify(fs.appendFile)

const outputFile = 'dental-clinics.csv'
const homeUrl =
  'http://regcess.mscbs.es/regcessWeb/inicioBuscarCentrosAction.do'

function formatTime(time) {
  const seconds = Math.ceil((time / 1000) % 60)
  const minutes = Math.ceil(time / (1000 * 60))
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function convertToCSV(arr, withColumns) {
  const res = withColumns ? [Object.keys(arr[0])] : []
  return [...res, ...arr]
    .map((item) =>
      Object.values(item)
        .map((field) => `"${field}"`)
        .join(','),
    )
    .join('\n')
}

function logProgress(listPageIndex, clinicData, end, start) {
  console.log(
    `Page ${listPageIndex + 1}: ${
      clinicData.length
    } clinics imported in "${formatTime(end - start)}"`,
  )
}

async function clickAndWait(page, selector) {
  return Promise.all([
    page.click(selector),
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
  ])
}

async function extractClinicPageData(page) {
  return page.evaluate(() => {
    const sections = Array.from(document.querySelectorAll('div[class^="caja"]'))

    return sections.reduce((fields, section) => {
      if (section.className.split(' ').length > 1) return fields

      const fieldValues = Array.from(section.querySelectorAll('div')).map(
        (div) => div.innerText,
      )
      fields[fieldValues[0]] = fieldValues[1] || ''
      return fields
    }, {})
  })
}

async function goToNextPage(page, pageIndex, selectors) {
  const selectorIndex = pageIndex === 0 ? 1 : 0
  const isLinkVisible = await page.$(selectors[selectorIndex])
  if (isLinkVisible) {
    await clickAndWait(page, selectors[selectorIndex])
    return true
  }
  return false
}

async function goToListPage(page, selectors, pageNumber) {
  let i = 0
  while (i < pageNumber) {
    await goToNextPage(page, i, selectors.nextPages)
    console.log(`Go to page ${i + 2}`)
    i++
  }
}

async function parseClinicList(page) {
  let clinics = []
  let isNextPage = true
  let clinicIndex = 0
  const selectors = {
    nextPages: [
      '[class=paginacion] a:nth-child(4)',
      '[class=paginacion] a:nth-child(3)',
    ],
    firstClinicLink: 'body div.tableContainer table tr:nth-child(2) a',
  }

  await clickAndWait(page, selectors.firstClinicLink)

  while (isNextPage) {
    const clinicData = await extractClinicPageData(page)
    clinics.push(clinicData)
    isNextPage = await goToNextPage(page, clinicIndex, selectors.nextPages)
    clinicIndex++
  }

  return clinics
}

async function parseDentalCenterList() {
  const startPageIndex = 0
  const selectors = {
    dentalCenterOption: '#tipoCentroId > option:nth-child(11)',
    formSubmit: 'body > form > div.formLayout > div.formFoot > input',
    backToList:
      'body > div.tableContainer > div.tableHead > div > form > input',
    nextPages: [
      '[class=paginacion] a:nth-child(5)',
      '[class=paginacion] a:nth-child(3)',
    ],
  }

  // Initialise puppeteer
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  })
  const page = await browser.newPage()

  // Select dental center list and submit form
  await page.goto(homeUrl)
  await page.click(selectors.dentalCenterOption)
  await clickAndWait(page, selectors.formSubmit)

  // Shortcut to restart parsing
  if (startPageIndex === 0) await writeFile(outputFile, '')
  await goToListPage(page, selectors, startPageIndex)

  // Browse clinic lists
  let isNextPage = true
  let listPageIndex = startPageIndex

  while (isNextPage) {
    const start = Date.now()
    const clinicData = await parseClinicList(page)
    const csvData = convertToCSV(clinicData, listPageIndex === 0)
    await appendFile(outputFile, csvData)
    await appendFile(outputFile, '\n')
    logProgress(listPageIndex, clinicData, Date.now(), start)

    await clickAndWait(page, selectors.backToList)

    isNextPage = await goToNextPage(page, listPageIndex, selectors.nextPages)
    listPageIndex++
  }

  browser.close()
}

parseDentalCenterList()
