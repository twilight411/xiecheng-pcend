# 易宿 PC 端接口约定 2.0（酒店详情 / 创建 / 更新）

> 相对 1.0 的变更：**英文名、城市、房型说明** 的请求与响应约定，解决「提交了但详情/编辑页看不到」的问题。  
> 后端已按本约定实现；前端需按下方字段取数与提交。

---

## 1. GET 酒店详情 `GET /hotels/:id`

**响应体**：直接返回酒店对象（无 `{ code, message, data }` 包装），即 `response.data` 即为酒店对象。

**必须包含的字段（编辑页与审核「查看详情」依赖）：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `nameEn` | string \| null | 酒店英文名；无则 `null` 或 `""` |
| `city` | object \| null | `{ id, name, countryCode }`；无则 `null` |
| `cityName` | string \| null | 城市名称，便于直接展示；无则 `null` |
| `roomTypesSummary` | string | 房型说明文案（与创建/更新时提交的 `roomTypes` 一致） |
| `roomTypes` | array | 房间列表（来自 rooms 表），用于房型卡片等 |

**前端展示建议：**

- **英文名**：用 `response.data.nameEn`
- **城市**：用 `response.data.cityName` 或 `response.data.city?.name`
- **房型（说明文案）**：用 `response.data.roomTypesSummary`（不要用 `roomTypes` 数组当文案，否则会显示为空或异常）

---

## 2. 创建酒店 `POST /hotels` 与 更新酒店 `PUT /hotels/:id`

**请求体需支持并持久化的字段：**

| 字段 | 类型 | 说明 |
|------|------|------|
| `nameEn` | string | 酒店英文名，后端存于 `hotels.extra.nameEn` |
| `city` | string | 城市名称；后端按名称解析为 `city_id` 并写入库 |
| `cityId` | number | 城市 ID，与 `city` 二选一；传则优先用 `cityId` |
| `roomTypes` | string | 房型说明（一段文本），后端存于 `hotels.extra.roomTypes` |

后端行为简述：

- **创建**：若传 `city`（字符串），按城市名解析为 `city_id` 再入库；未传或解析不到则使用默认城市。`nameEn`、`roomTypes` 写入 `extra`。
- **更新**：同上，支持 `city` 或 `cityId` 更新 `city_id`；`nameEn`、`roomTypes` 更新到 `extra`。
- **详情**：GET 详情会从 `extra` 和 cities 表读出并返回 `nameEn`、`city`/`cityName`、`roomTypesSummary`（即 extra 中的房型说明字符串）。

**城市填「汝城」却显示「北京」的原因：**

- 前端已正确提交 `city: "汝城"`。后端用城市名在 `cities` 表里解析 `city_id`；若表中没有「汝城」（或名称不完全一致），会回退为「第一个可用城市」（如北京），于是详情里的 `city`/`cityName` 就变成北京。
- **建议后端**：当按城市名解析不到时，（1）不更新 `city_id`，保留原值；或（2）将请求里的 `city` 字符串存入 `extra.cityDisplayName`（或等价字段），GET 详情时若存在则优先把该值作为 `cityName` 返回，这样前端能展示用户输入的「汝城」；或（3）在 `cities` 表中补充「汝城」等城市数据。

---

## 3. GET 审核列表 `GET /hotels/review` 列表项城市

列表项包含 **city**（`{ id, name }`）、**cityName**（与 `city.name` 一致）。城市显示名后端优先用 `extra.cityNameDisplay`，无则退回 `cities.name`。前端列表展示用 **item.cityName** 或 **item.city.name** 即可（二者已一致，支持汝城等自定义城市名）。

---

## 4. 前端自检清单

1. **提交**：创建/更新时请求体是否包含 `nameEn`、`city`（字符串）、`roomTypes`（字符串）？
2. **详情/编辑页**：是否用 `nameEn`、`cityName` 或 `city.name`、`roomTypesSummary` 展示与回填？若仍用 `roomTypes` 当房型文案，请改为 `roomTypesSummary`。
3. **审核列表城市列**：用 `item.cityName` 或 `item.city.name` 展示。
4. **后端**：确认已拉取最新代码并**重启服务**；旧进程不会返回上述新字段。

---

## 5. 与 api_pc.md 的关系

- 本 2.0 文档仅约定「英文名、城市、房型」的请求/响应与前端用法。
- 其余 Base URL、认证、列表、审核等仍以 `api_pc.md` 为准。
