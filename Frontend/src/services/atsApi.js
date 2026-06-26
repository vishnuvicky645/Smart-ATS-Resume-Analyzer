import axios from 'axios'

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000',
})

export async function analyzeResume(file, jobDescription) {
  const formData = new FormData()
  formData.append('file', file)
  formData.append('jd', jobDescription)

  const response = await api.post('/upload', formData, {
    headers: {
      // Let the browser set the Content-Type including the multipart boundary.
    },
  })

  return response.data
}