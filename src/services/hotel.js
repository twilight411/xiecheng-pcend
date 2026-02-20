import request from './request.js'

/**
 * 获取酒店详情（管理端）。返回字段含 name, nameEn, address, star, basePrice, openedAt, status, roomTypes, images 等
 */
export async function fetchHotelDetail(hotelId) {
  const res = await request.get(`/hotels/${hotelId}`)
  return res.data
}

/**
 * 创建酒店。请求体见 API 文档（name 必填，其余可选）。返回 { id }
 */
export async function createHotel(payload) {
  const res = await request.post('/hotels', payload)
  return res.data
}

/**
 * 更新酒店。请求体与创建相同，支持部分更新。
 */
export async function updateHotel(hotelId, payload) {
  const res = await request.put(`/hotels/${hotelId}`, payload)
  return res.data
}

/**
 * 商户端：获取当前用户的酒店列表。若后端未实现则返回 []
 */
export async function fetchMyHotels() {
  try {
    const res = await request.get('/hotels')
    return Array.isArray(res.data) ? res.data : []
  } catch {
    return []
  }
}

/**
 * 审核列表（管理员）。params: { page?, pageSize?, status? }，status: pending|online|offline|rejected
 * 返回 { list, meta: { total, page, pageSize } }
 */
export async function fetchHotelReviewList(params = {}) {
  const res = await request.get('/hotels/review', { params })
  return { list: res.data || [], meta: res.meta || {} }
}

/**
 * 审核通过。payload: { remark? }
 */
export async function approveHotel(hotelId, payload = {}) {
  const res = await request.post(`/hotels/${hotelId}/approve`, payload)
  return res.data
}

/**
 * 审核不通过。payload: { reason? }
 */
export async function rejectHotel(hotelId, payload = {}) {
  const res = await request.post(`/hotels/${hotelId}/reject`, payload)
  return res.data
}

/**
 * 上线/下线。payload: { status: 'online' | 'offline' | 'pending' | 'rejected' }
 */
export async function setHotelStatus(hotelId, payload) {
  const res = await request.post(`/hotels/${hotelId}/status`, payload)
  return res.data
}

