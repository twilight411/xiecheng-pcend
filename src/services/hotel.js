import request from './request.js'

// 获取单个酒店详情（用于编辑或展示）
export function fetchHotelDetail(hotelId) {
  return request.get(`/hotels/${hotelId}`)
}

// 创建酒店信息（商户）
export function createHotel(payload) {
  return request.post('/hotels', payload)
}

// 更新酒店信息（商户）
export function updateHotel(hotelId, payload) {
  return request.put(`/hotels/${hotelId}`, payload)
}

// 审核列表（管理员）
export function fetchHotelReviewList(params) {
  return request.get('/hotels/review', { params })
}

// 审核通过
export function approveHotel(hotelId, payload) {
  return request.post(`/hotels/${hotelId}/approve`, payload)
}

// 审核不通过
export function rejectHotel(hotelId, payload) {
  return request.post(`/hotels/${hotelId}/reject`, payload)
}

// 下线 / 恢复
export function toggleHotelOnlineStatus(hotelId, payload) {
  return request.post(`/hotels/${hotelId}/status`, payload)
}

