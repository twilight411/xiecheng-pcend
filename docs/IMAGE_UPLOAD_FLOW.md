# 图片传输与审核流程说明

本文档说明**封面图、轮播图、房型图**从商户上传 → 管理员审核 → 移动端同步的完整流程与接口约定。

**约定**：  
- **预设 / seed 酒店**：沿用原有预设图（如 Unsplash 等），不改为本地上传。  
- **手动新建酒店**：用本地上传 → 后端存到 `uploads/` → 返回自己域名下的 URL → 前端拿这个 URL 展示，只跑通这一条本地流程即可。

---

## 1. 本地最小流程（新建酒店用自己的图）

1. **上传一张图**  
   - 请求：`POST /api/upload/image`，`Content-Type: multipart/form-data`，字段名 `file`，请求头带 `Authorization: Bearer <token>`（先登录拿 token）。  
   - 响应：`{ "code": 0, "data": { "url": "http://localhost:3000/uploads/xxx.jpg" } }`（本地跑时就是本机 URL）。

2. **创建酒店时带上这张图**  
   - 请求：`POST /api/hotels`，请求体里带 `coverImage: "http://localhost:3000/uploads/xxx.jpg"`（或把多张图放进 `carouselImages` / `images`）。  
   - 后端会把 URL 存进 `hotel_photos`，不再用预设图。

3. **前端再拿图展示**  
   - 请求：`GET /api/hotels/:id`，响应里有 `coverImage`、`carouselImages`。  
   - 前端用这些 URL 做 `<img src={detail.coverImage} />` 等即可，图片就是刚上传的那张。

只要上述三步在本地能跑通，本地上传 → 后端存 → 前端展示 的闭环就成立。预设/seed 的酒店不受影响，仍用原先的图。

---

## 2. 业务区分（封面 / 轮播 / 房型）

| 类型     | 说明           | 存储位置      | 接口中的字段 |
|----------|----------------|---------------|--------------|
| 封面图   | 酒店主图，一张 | hotel_photos  | coverImage   |
| 轮播图   | 酒店详情轮播，多张 | hotel_photos  | carouselImages |
| 房型图   | 每个房型一张（或首张） | room_photos   | roomTypes[].image / 房型.images |

- 数据库中：酒店图片第一张为 `type=cover`，其余为 `type=gallery`；房型图片在 `room_photos` 表按房型聚合。
- 接口中：详情与列表统一返回 **coverImage**、**carouselImages**，房型列表中每个房型带 **image**（或 **images**），便于商户端、管理端、移动端按同一约定展示。

## 3. 整体流程（含审核与多端）

```
商户端：上传封面图、轮播图、各房型图
  → POST /api/upload/image 多次拿到 URL
  → POST /api/hotels 或 PUT /api/hotels/:id（coverImage + carouselImages + roomTypeImages）一次提交酒店信息与房型图
       ↓
管理员端：审核上传信息
  → GET /api/hotels/review 看待审核列表（含 coverImage）
  → GET /api/hotels/:id 看酒店详情：coverImage、carouselImages、roomTypes[].image
  → 审核通过后酒店状态为 online
       ↓
移动端：审核通过后同步展示
  → GET /api/hotels 列表（coverImage / images）
  → GET /api/hotels/:id 详情（coverImage、carouselImages、roomTypes[].image）
  → GET /api/hotels/:id/rooms 房型列表（每项含 images）
```

## 4. 上传接口（拿到 URL）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/upload/image | 上传单张图片，返回 URL |

- **Content-Type**: `multipart/form-data`，字段名 **file**
- **格式**: jpeg, png, gif, webp；单文件最大 5MB
- **鉴权**: `Authorization: Bearer <token>`（商户或管理员）

**响应示例**：`{ "code": 0, "message": "ok", "data": { "url": "https://host/uploads/xxx.jpg" } }`

商户端可多次调用，分别得到封面 URL、轮播图 URL、各房型图 URL，再填入下方创建/更新接口。

## 5. 商户端：创建/更新酒店（封面 + 轮播 + 房型图）

**创建**：POST /api/hotels  
**更新**：PUT /api/hotels/:id  

**请求体（图片相关）**：

| 字段 | 说明 |
|------|------|
| coverImage | 封面图 URL（一张） |
| carouselImages | 轮播图 URL 数组（多张，不含封面） |
| images | 兼容：URL 数组，第一张为封面，其余为轮播 |
| **roomTypeImages** | **(string \| null)[]**：房型主图 URL 数组，与 **roomTypes** 解析后的房型顺序一致；第 i 个元素为第 i 个房型的主图，**null** 表示不更新该房型图；不传则不改动任何房型图。一次提交即可写入 room_photos，无需再调 PATCH。 |

- 传 **coverImage** 或 **carouselImages** 时：封面 = coverImage，轮播 = carouselImages。
- **房型图**：推荐在 POST/PUT 中带 **roomTypeImages** 一次提交；顺序与房型一致，有图传 URL，不更新传 null。
- 不传任何图片字段时：创建会使用默认图；更新不修改现有图片。

## 6. 商户端：房型图（可选方式）

- **推荐**：在 **POST /api/hotels** 或 **PUT /api/hotels/:id** 请求体中带 **roomTypeImages**，与房型顺序一致，一次提交即可落库。
- **可选**：**PATCH** /api/hotels/:hotelId/rooms/:roomId，请求体 `{ "imageUrls": ["url1"] }`，按房型单独更新（房型需已存在）。

## 7. 管理员端：审核时查看上传的图片

- **列表**：GET /api/hotels/review  
  - 每条含 **coverImage**（封面）、**images**（全量，含封面+轮播），用于列表卡片。
- **详情**：GET /api/hotels/:id（需管理员或该酒店所属商户 token）  
  - **coverImage**：封面图 URL  
  - **carouselImages**：轮播图 URL 数组（含封面在内按顺序）  
  - **images**：同上，兼容旧版  
  - **roomTypes**：房型摘要，每项含 **image**（该房型主图，即房型图）  
  - 管理员在「酒店详情」中即可看到商户上传的封面、轮播和每个房型的房型图。

审核通过后，同一套详情接口对移动端开放（仅 status=online 的酒店对未登录或 C 端可见）。

## 8. 移动端：审核通过后同步展示

- **列表**：GET /api/hotels（仅返回已上线酒店）  
  - 每条含 **coverImage**、**images**，用于列表卡片。
- **详情**：GET /api/hotels/:id  
  - **coverImage**、**carouselImages**、**roomTypes[].image**，与管理员端结构一致，用于详情页封面、轮播和房型列表展示。
- **房型列表**：GET /api/hotels/:hotelId/rooms  
  - 每个房型含 **images** 数组；首张即房型图，可与详情中 roomTypes[].image 一致使用。

移动端与管理员端共用同一接口与字段，审核通过后无需额外接口即可同步看到商户上传的酒店信息与图片。

## 9. 环境变量（可选）

| 变量 | 说明 |
|------|------|
| UPLOAD_BASE_URL | 上传后返回的 URL 前缀，如 `https://your-app.onrender.com`。不设则用当前请求的 host。 |

## 10. 小结

- **封面、轮播、房型图**在接口中明确区分：**coverImage**、**carouselImages**、**roomTypeImages**（请求）/ **roomTypes[].image**（响应）。
- 商户上传审核信息：上传图片拿 URL → 创建/更新酒店时带 **coverImage**、**carouselImages**、**roomTypeImages** 一次提交即可完成酒店信息与房型图落库。
- 管理员在酒店详情中可直接看到上传的封面、轮播和每个房型的房型图，依赖现有 GET /api/hotels/:id 与 GET /api/hotels/review 即可。
- 移动端在审核通过后通过同一套列表/详情/房型接口即可同步看到上传的酒店信息与图片。
