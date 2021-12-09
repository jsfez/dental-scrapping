/* eslint-disable no-console */
async function clickAndWait(page, selector) {
  return Promise.all([
    page.click(selector),
    page.waitForNavigation({ waitUntil: 'networkidle2' }),
  ])
}

async function goToNextPage(
  page,
  pageIndex,
  nextPageSelector,
  firstNextPageSelector,
) {
  const linkSelector =
    firstNextPageSelector && pageIndex === 0
      ? firstNextPageSelector
      : nextPageSelector
  const isLinkVisible = await page.$(linkSelector)
  if (isLinkVisible) {
    await clickAndWait(page, linkSelector)
    return true
  }
  return false
}

async function goToListPage(page, selectors, pageNumber) {
  let i = 0
  while (i < pageNumber) {
    await goToNextPage(page, i, ...selectors)
    console.log(`Go to page ${i + 2}`)
    i += 1
  }
}

export { clickAndWait, goToNextPage, goToListPage }
