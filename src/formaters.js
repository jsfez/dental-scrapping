function formatTime(time) {
  const seconds = Math.floor((time / 1000) % 60)
  const minutes = Math.floor(time / 3600)
  if (minutes > 0) return `${minutes}m ${seconds}s`
  return `${seconds}s`
}

function convertToCSV(arr, withColumns) {
  const array = withColumns ? [Object.keys(arr[0])] : []
  return [...array, ...arr]
    .map((item) =>
      Object.values(item)
        .map((field) => `"${field}"`)
        .join(','),
    )
    .join('\n')
}

export { formatTime, convertToCSV }
