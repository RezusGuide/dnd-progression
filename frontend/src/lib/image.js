// Downscales/recompresses an uploaded image client-side before it reaches
// the server - there's no file storage, portraits live as a data URI on the
// character row (Character#portraitData). 256x256 cap, JPEG at 0.85
// quality; typically well under 50 KB.
const MAX_PORTRAIT_DIMENSION = 256

export function resizeImageFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.onerror = () => reject(reader.error)
        reader.onload = () => {
            const img = new Image()
            img.onerror = () => reject(new Error('Could not read image'))
            img.onload = () => {
                const scale = Math.min(1, MAX_PORTRAIT_DIMENSION / Math.max(img.width, img.height))
                const canvas = document.createElement('canvas')
                canvas.width = Math.round(img.width * scale)
                canvas.height = Math.round(img.height * scale)
                canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
                resolve(canvas.toDataURL('image/jpeg', 0.85))
            }
            img.src = reader.result
        }
        reader.readAsDataURL(file)
    })
}
