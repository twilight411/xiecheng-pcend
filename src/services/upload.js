import axios from 'axios'
import { message as antdMessage } from 'antd'
import { getStoredToken } from './authStorage.js'

const BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

/**
 * 上传单张图片到后端，返回可公网访问的 URL。
 * 约定：POST /api/upload/image，multipart/form-data 字段名 file，鉴权 Bearer token。
 * 响应：{ code: 0, data: { url: "https://..." } }
 * @param {File} file
 * @returns {Promise<string>} 图片 URL
 */
export async function uploadImage(file) {
  if (!file || !(file instanceof File)) {
    throw new Error('请选择有效的图片文件')
  }
  const formData = new FormData()
  formData.append('file', file)

  const token = getStoredToken()
  const headers = { ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  // 不设置 Content-Type，由浏览器自动为 FormData 设置 multipart/form-data; boundary=...
  const res = await axios.post(`${BASE_URL}/upload/image`, formData, {
    headers,
    timeout: 15000,
  })

  const body = res?.data
  if (body && typeof body.code !== 'undefined' && body.code !== 0) {
    const msg = body.message || body.msg || '上传失败'
    antdMessage.error(msg)
    throw new Error(msg)
  }
  const url = body?.data?.url
  if (!url || typeof url !== 'string') {
    antdMessage.error('上传成功但未返回图片地址')
    throw new Error('上传成功但未返回图片地址')
  }
  return url
}
