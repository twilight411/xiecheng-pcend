# 图片传输与审核流程说明

本文档说明**封面图、轮播图、房型图**从商户上传 → 管理员审核 → 移动端同步的完整流程与接口约定。

## 1. 业务区分

| 类型     | 说明           | 存储位置      | 接口中的字段 |
|----------|----------------|---------------|--------------|
| 封面图   | 酒店主图，一张 | hotel_photos  | coverImage   |
| 轮播图   | 酒店详情轮播，多张 | hotel_photos  | carouselImages |
| 房型图   | 每个房型一张（或首张） | room_photos   | roomTypes[].image / 房型.images |

- 数据库中：酒店图片第一张为 `type=cover`，其余为 `type=gallery`；房型图片在 `room_photos` 表按房型聚合。
- 接口中：详情与列表统一返回 **coverImage**、**carouselImages**，房型列表中每个房型带 **image**（或 **images**），便于商户端、管理端、移动端按同一约定展示。

## 2. 整体流程

```
商户端：上传封面图、轮播图、各房型图
  → POST /api/upload/image 多次拿到 URL
  → POST /api/hotels（coverImage + carouselImages）创建酒店
  → PATCH /api/hotels/:hotelId/rooms/:roomId（imageUrls）为每个房型设置房型图
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

## 3. 上传接口（拿到 URL）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | /api/upload/image | 上传单张图片，返回 URL |

- **Content-Type**: `multipart/form-data`，字段名 **file**
- **格式**: jpeg, png, gif, webp；单文件最大 5MB
- **鉴权**: `Authorization: Bearer <token>`（商户或管理员）

**响应示例**：`{ "code": 0, "message": "ok", "data": { "url": "https://host/uploads/xxx.jpg" } }`

商户端可多次调用，分别得到封面 URL、轮播图 URL、各房型图 URL，再填入下方创建/更新接口。

## 4. 商户端：创建/更新酒店（封面 + 轮播）

**创建**：POST /api/hotels  
**更新**：PUT /api/hotels/:id  

**请求体（图片相关）**，以下三种方式任选其一：

| 方式 | 字段 | 说明 |
|------|------|------|
| 推荐 | coverImage | 封面图 URL（一张） |
| 推荐 | carouselImages | 轮播图 URL 数组（多张，不含封面） |
| 兼容 | images | URL 数组，第一张为封面，其余为轮播 |

- 传 **coverImage** 或 **carouselImages** 时：封面 = coverImage，轮播 = carouselImages；若只传 carouselImages 不传 coverImage，则第一张轮播会作为封面。
- 仅传 **images** 时：第一张为封面，其余为轮播（与原有逻辑一致）。
- 不传任何图片字段时：创建会使用默认图；更新不修改现有图片。

## 5. 商户端：设置房型图

- **PATCH** /api/hotels/:hotelId/rooms/:roomId  
- **请求体**：`{ "imageUrls": ["url1"] }`（通常每个房型一张，即数组长度为 1；多张亦可，首张作为房型主图）

房型需已存在（如通过 seed 或后续房型创建接口）；商户为每个房型调用一次，传入该房型的图片 URL（来自 POST /api/upload/image）。

## 6. 管理员端：审核时查看上传的图片

- **列表**：GET /api/hotels/review  
  - 每条含 **coverImage**（封面）、**images**（全量，含封面+轮播），用于列表卡片。
- **详情**：GET /api/hotels/:id（需管理员或该酒店所属商户 token）  
  - **coverImage**：封面图 URL  
  - **carouselImages**：轮播图 URL 数组（含封面在内按顺序）  
  - **images**：同上，兼容旧版  
  - **roomTypes**：房型摘要，每项含 **image**（该房型主图，即房型图）  
  - 管理员在「酒店详情」中即可看到商户上传的封面、轮播和每个房型的房型图。

审核通过后，同一套详情接口对移动端开放（仅 status=online 的酒店对未登录或 C 端可见）。

## 7. 移动端：审核通过后同步展示

- **列表**：GET /api/hotels（仅返回已上线酒店）  
  - 每条含 **coverImage**、**images**，用于列表卡片。
- **详情**：GET /api/hotels/:id  
  - **coverImage**、**carouselImages**、**roomTypes[].image**，与管理员端结构一致，用于详情页封面、轮播和房型列表展示。
- **房型列表**：GET /api/hotels/:hotelId/rooms  
  - 每个房型含 **images** 数组；首张即房型图，可与详情中 roomTypes[].image 一致使用。

移动端与管理员端共用同一接口与字段，审核通过后无需额外接口即可同步看到商户上传的酒店信息与图片。

## 8. 环境变量（可选）

| 变量 | 说明 |
|------|------|
| UPLOAD_BASE_URL | 上传后返回的 URL 前缀，如 `https://your-app.onrender.com`。不设则用当前请求的 host。 |

## 9. 小结

- **封面、轮播、房型图**在接口中明确区分：**coverImage**、**carouselImages**、**roomTypes[].image** / 房型 **images**。
- 商户上传审核信息：上传图片拿 URL → 创建/更新酒店（封面+轮播）→ 为每个房型设置房型图。
- 管理员在酒店详情中可直接看到上传的封面、轮播和每个房型的房型图，依赖现有 GET /api/hotels/:id 与 GET /api/hotels/review 即可。
- 移动端在审核通过后通过同一套列表/详情/房型接口即可同步看到上传的酒店信息与图片。
