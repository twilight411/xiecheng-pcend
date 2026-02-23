// 与 api_pc.md 对齐，便于前后端字段约定（JS 项目用注释描述即可）

/**
 * @typedef {Object} User
 * @property {string} id
 * @property {string} username
 * @property {string} role - 'merchant' | 'admin'
 */

/**
 * 酒店详情（api_pc 2.1）
 * @typedef {Object} Hotel
 * @property {string} id
 * @property {string} name
 * @property {string} [nameEn]
 * @property {string} [address]
 * @property {number} [star]
 * @property {number} [starLevel]
 * @property {string} [openedAt]
 * @property {number} [basePrice]
 * @property {string} [status] - pending | online | offline | rejected
 * @property {string[]} [images]
 * @property {Array<{ id?: string, name?: string, price?: number, area?: string, breakfast?: string }>} [roomTypes]
 * @property {string[]} [facilities]
 */

/**
 * 酒店列表项（api_pc 2.0 与移动端一致时）
 * @typedef {Object} HotelListItem
 * @property {string} id
 * @property {string} name
 * @property {string} [address]
 * @property {number} [starLevel]
 * @property {number} [score]
 * @property {number} [minPrice]
 * @property {string} [status]
 * @property {*} [city]
 * @property {string} [updatedAt]
 */

