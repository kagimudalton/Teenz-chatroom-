// Client-side NSFW image detection using nsfwjs (TensorFlow.js), fully in-browser —
// no API keys, no server calls, no cost. The model (~few MB) is lazy-loaded only
// when someone actually tries to upload an image, so it never bloats the main bundle.

let modelPromise = null

const loadModel = async () => {
  if (!modelPromise) {
    modelPromise = (async () => {
      const tf = await import('@tensorflow/tfjs')
      await tf.ready()
      // Use nsfwjs's tree-shaking entry point + explicit model import so the
      // bundler only includes MobileNetV2 (~3.5MB) instead of all three bundled
      // models including the much larger InceptionV3 (30+MB) — critical for
      // mobile users on limited data.
      const { load } = await import('nsfwjs/core')
      const { MobileNetV2Model } = await import('nsfwjs/models/mobilenet_v2')
      return load('MobileNetV2', { modelDefinitions: [MobileNetV2Model] })
    })()
  }
  return modelPromise
}

const fileToImage = (file) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => resolve({ img, url })
  img.onerror = (err) => { URL.revokeObjectURL(url); reject(err) }
  img.src = url
})

// Returns { flagged: boolean, reason: string|null, predictions: [...] }
// Flags images classified as Porn or Hentai above a high-confidence threshold.
export const checkImageNSFW = async (file) => {
  try {
    const model = await loadModel()
    const { img, url } = await fileToImage(file)
    const predictions = await model.classify(img)
    URL.revokeObjectURL(url)

    const porn = predictions.find(p => p.className === 'Porn')?.probability || 0
    const hentai = predictions.find(p => p.className === 'Hentai')?.probability || 0

    if (porn > 0.75 || hentai > 0.75) {
      return { flagged: true, reason: 'explicit', predictions }
    }
    return { flagged: false, reason: null, predictions }
  } catch (err) {
    // If the model fails to load (e.g., offline), fail open rather than blocking uploads —
    // we don't want a moderation-tool outage to break the whole app.
    console.warn('NSFW check failed, allowing upload:', err)
    return { flagged: false, reason: null, predictions: [] }
  }
}
