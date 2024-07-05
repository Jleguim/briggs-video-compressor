const drag_container = document.querySelector('#drag-files')

drag_container.addEventListener('drop', async (event) => {
  event.preventDefault()
  event.stopPropagation()

  let files = []
  let extensions = ['mkv', 'avi', 'mp4']

  for (const file of event.dataTransfer.files) {
    let valid = false
    extensions.forEach((extension) => {
      if (file.path.endsWith(extension)) valid = true
    })

    if (valid) files.push(file.path)
  }

  if (files.length === 0) return leftDrop()

  compressBtn.disabled = false
  abortBtn.disabled = true
  selectVideosBtn.value = files

  leftDrop()
})

drag_container.addEventListener('dragover', (e) => {
  e.preventDefault()
  e.stopPropagation()
})

document.addEventListener('dragenter', (e) => {
  drag_container.classList.add('active')
})

drag_container.addEventListener('dragleave', leftDrop)

function leftDrop() {
  drag_container.classList.remove('active')
}
