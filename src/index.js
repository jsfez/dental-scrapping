/* eslint-disable no-console */
/* eslint-disable no-await-in-loop */
import puppeteer from 'puppeteer'
import { writeFile, appendFile } from 'fs/promises'
import { parseClinicList } from './parser'
import { clickAndWait, goToNextPage, goToListPage } from './navigation'
import { formatTime, convertToCSV } from './formaters'

const outputFile = 'dental-clinics.csv'

function logProgress(listPageIndex, clinicData, end, start) {
  console.log(
    `Page ${listPageIndex + 1}: ${
      clinicData.length
    } clinics imported in "${formatTime(end - start)}"`,
  )
}

async function scrapeDentalCenterList() {
  const startPageIndex = 0
  const nextPageSelectors = [
    '[class=paginacion] a:nth-child(5)',
    '[class=paginacion] a:nth-child(3)',
  ]

  // Initialise puppeteer
  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
  })
  const page = await browser.newPage()

  // Submit form
  await page.goto(
    'http://regcess.mscbs.es/regcessWeb/inicioBuscarCentrosAction.do',
  )
  await page.click('#tipoCentroId > option:nth-child(11)')
  await clickAndWait(
    page,
    'body > form > div.formLayout > div.formFoot > input',
  )

  // Shortcut to restart parsing
  if (startPageIndex === 0) await writeFile(outputFile, '')
  await goToListPage(page, nextPageSelectors, startPageIndex)

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

    // Go back to list page
    await clickAndWait(
      page,
      'body > div.tableContainer > div.tableHead > div > form > input',
    )

    // Go to next list page
    isNextPage = await goToNextPage(page, listPageIndex, ...nextPageSelectors)

    listPageIndex += 1
  }

  browser.close()
}

scrapeDentalCenterList()
