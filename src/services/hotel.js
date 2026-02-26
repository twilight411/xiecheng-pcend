import request from './request.js'

/**
 * 获取酒店详情（api_pc 2.1 / 2.0）。返回 name, nameEn, address, city, cityName, roomTypesSummary, roomTypes 等。
 * 兼容：直接返回酒店对象（2.0 无 code/data 包装）、{ data: hotel }、{ data: { data: hotel } }。
 */
export async function fetchHotelDetail(hotelId) {
  const res = await request.get(`/hotels/${hotelId}`)
  if (!res || typeof res !== 'object') return null
  const inner = res.data != null && typeof res.data === 'object' && res.data.data != null && typeof res.data.data === 'object'
    ? res.data.data
    : res.data
  if (inner && typeof inner === 'object' && (inner.id != null || inner.name != null)) return inner
  if (res.id != null || res.name != null) return res
  return null
}

/**
 * 创建酒店（api_pc 2.2）。请求体：name 必填，nameEn/address/cityId/star/openedAt/basePrice/roomTypes/highlights/images 可选。
 * 响应 data: { id }，新建默认 status 为 pending。
 */
export async function createHotel(payload) {
  const res = await request.post('/hotels', payload)
  const data = res?.data
  return data != null ? data : res
}

/**
 * 更新酒店（api_pc 2.3）。请求体与创建相同，支持部分更新。
 */
export async function updateHotel(hotelId, payload) {
  const res = await request.put(`/hotels/${hotelId}`, payload)
  return res?.data ?? res
}

/**
 * 商户端/管理员：获取酒店列表（api_pc 2.0）。
 * GET /hotels，请求头须带 Authorization。商户只看自己，管理员不按 user_id 过滤。
 * 支持 Query：page, pageSize, cityId, keyword, checkIn, checkOut（可选）。
 * 后端列表数组为 response.data.data（非 response.data 或 response.data.list）。
 */
export async function fetchMyHotels(params = {}) {
  const res = await request.get('/hotels', { params })
  const d = res?.data
  if (d && Array.isArray(d.data)) return d.data
  if (Array.isArray(d)) return d
  if (d && typeof d === 'object' && Array.isArray(d.list)) return d.list
  if (d && Array.isArray(d.records)) return d.records
  if (Array.isArray(res?.list)) return res.list
  if (Array.isArray(res?.records)) return res.records
  return []
}

/**
 * 审核列表（管理员）（api_pc 2.4）。GET /hotels/review，params: { page?, pageSize?, status? }
 * 列表数组为 response.data.data（与 GET /hotels 一致）。
 */
export async function fetchHotelReviewList(params = {}) {
  const res = await request.get('/hotels/review', { params })
  const list =
    (res?.data && Array.isArray(res.data.data))
      ? res.data.data
      : Array.isArray(res?.data)
        ? res.data
        : (res?.data?.list ? res.data.list : [])
  return { list, meta: res?.meta || {} }
}

/**
 * 审核通过（api_pc 2.5）。payload: { remark? }
 */
export async function approveHotel(hotelId, payload = {}) {
  const res = await request.post(`/hotels/${hotelId}/approve`, payload)
  return res?.data ?? res
}

/**
 * 审核不通过（api_pc 2.6）。payload: { reason? }
 */
export async function rejectHotel(hotelId, payload = {}) {
  const res = await request.post(`/hotels/${hotelId}/reject`, payload)
  return res?.data ?? res
}

/**
 * 上线/下线（api_pc 2.7）。payload: { status: 'online' | 'offline' | 'pending' | 'rejected' }
 */
export async function setHotelStatus(hotelId, payload) {
  const res = await request.post(`/hotels/${hotelId}/status`, payload)
  return res?.data ?? res
}

/**
 * 更新房型图片（api_pc 2.5）。PATCH /hotels/:hotelId/rooms/:roomId，请求体 { imageUrls: string[] }。
 * URL 需先通过 POST /upload/image 上传获得。
 */
export async function updateRoomImages(hotelId, roomId, payload) {
  const res = await request.patch(`/hotels/${hotelId}/rooms/${roomId}`, payload)
  return res?.data ?? res
}

