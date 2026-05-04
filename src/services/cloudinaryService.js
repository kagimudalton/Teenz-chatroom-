const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET
const UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/upload`

export const uploadToCloudinary = async (file, type, onProgress = null) => {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', `teenz_chatroom/${type}s`)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', UPLOAD_URL)
    xhr.upload.onprogress = (e) => {
      if (onProgress && e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
    }
    xhr.onload = () => {
      if (xhr.status === 200) resolve(JSON.parse(xhr.responseText).secure_url)
      else reject(new Error(JSON.parse(xhr.responseText).error?.message || 'Upload failed'))
    }
    xhr.onerror = () => reject(new Error('Network error'))
    xhr.send(formData)
  })
}

export const uploadAvatar = async (file) => {
  if (file.size > 5 * 1024 * 1024) throw new Error('Profile photo must be under 5MB')
  const formData = new FormData()
  formData.append('file', file)
  formData.append('upload_preset', UPLOAD_PRESET)
  formData.append('folder', 'teenz_chatroom/avatars')
  const res = await fetch(UPLOAD_URL, { method: 'POST', body: formData })
  const data = await res.json()
  if (!res.ok) throw new Error(data.error?.message || 'Avatar upload failed')
  return data.secure_url
}

export const uploadStoryMedia = async (file, type) => uploadToCloudinary(file, type)
