import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from 'axios'
import { storage } from '@/utils/storage'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const client: AxiosInstance = axios.create({
  baseURL: `${API_URL}/api`,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor to add auth token
client.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = storage.getToken()
    if (token) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response interceptor for error handling
client.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    if (error.response?.status === 401) {
      storage.removeToken()
      window.location.href = '/login'
    }
    console.error('API Error:', error.response?.status, error.message)
    return Promise.reject(error)
  }
)

export default client
