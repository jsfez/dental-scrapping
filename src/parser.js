/* eslint-disable no-param-reassign */
import { clickAndWait, goToNextPage } from './navigation'

async function parseClinicPage(page) {
  return page.evaluate(() => {
    // eslint-disable-next-line no-undef
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

async function parseClinicList(page) {
  const clinics = []
  let isNextPage = true
  let clinicIndex = 0

  // Click on first clinic link
  await clickAndWait(page, 'body div.tableContainer table tr:nth-child(2) a')

  while (isNextPage) {
    const clinicData = await parseClinicPage(page)
    clinics.push(clinicData)
    isNextPage = await goToNextPage(
      page,
      clinicIndex,
      '[class=paginacion] a:nth-child(4)',
      '[class=paginacion] a:nth-child(3)',
    )
    clinicIndex += 1
  }

  return clinics
}

export { parseClinicList }
