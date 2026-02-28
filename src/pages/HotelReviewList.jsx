import { Badge, Button, Card, Descriptions, Drawer, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchHotelDetail, fetchHotelReviewList, approveHotel, rejectHotel, setHotelStatus } from '../services/hotel.js'
import { REVIEW_STATUS } from '../constants/index.js'
import { PAGE_SIZE } from '../constants/index.js'

const { Title, Text } = Typography
const { Option } = Select

/** 兼容后端返回数字或字符串的 status（常见：1=pending, 2=online, 3=rejected, 4=offline） */
function normalizeStatus(s) {
  if (s === REVIEW_STATUS.APPROVED || s === 'online' || s === 2) return REVIEW_STATUS.APPROVED
  if (s === REVIEW_STATUS.REJECTED || s === 'rejected' || s === 3) return REVIEW_STATUS.REJECTED
  if (s === REVIEW_STATUS.OFFLINE || s === 'offline' || s === 4) return REVIEW_STATUS.OFFLINE
  return REVIEW_STATUS.PENDING // pending / 0 / 1 / 其他
}

function statusTag(status) {
  const s = normalizeStatus(status)
  switch (s) {
    case REVIEW_STATUS.APPROVED:
      return <Tag color="green">通过</Tag>
    case REVIEW_STATUS.REJECTED:
      return <Tag color="red">不通过</Tag>
    case REVIEW_STATUS.OFFLINE:
      return <Tag color="default">已下线</Tag>
    default:
      return (
        <Tag color="processing">
          <Badge status="processing" /> 审核中
        </Tag>
      )
  }
}

function HotelReviewList() {
  const [form] = Form.useForm()
  const [list, setList] = useState([])
  const [meta, setMeta] = useState({ total: 0, page: 1, pageSize: PAGE_SIZE })
  const [loading, setLoading] = useState(true)
  const [rejectModal, setRejectModal] = useState({ open: false, hotelId: null, hotelName: '' })
  const [rejectReason, setRejectReason] = useState('')
  const [detailDrawer, setDetailDrawer] = useState({
    open: false,
    hotelId: null,
    detail: null,
    loading: false,
    fallbackRow: null,
  })

  const [statusFilter, setStatusFilter] = useState(undefined)
  const [keyword, setKeyword] = useState('')

  const onFilterChange = (_, allValues) => {
    setStatusFilter(allValues.status === 'all' ? undefined : allValues.status)
    setKeyword((allValues.keyword || '').trim())
  }

  const fetchList = useCallback(async (page = 1) => {
    setLoading(true)
    try {
      const { list: data, meta: m } = await fetchHotelReviewList({
        page,
        pageSize: PAGE_SIZE,
        status: statusFilter,
      })
      setList(Array.isArray(data) ? data : [])
      setMeta(m || { total: 0, page: 1, pageSize: PAGE_SIZE })
    } catch {
      setList([])
    } finally {
      setLoading(false)
    }
  }, [statusFilter])

  useEffect(() => {
    fetchList(1)
  }, [fetchList])

  const filteredData = useMemo(() => {
    if (!keyword) return list
    const kw = keyword.toLowerCase()
    return list.filter(
      (item) =>
        (item.name && item.name.toLowerCase().includes(kw)) ||
        (item.address && item.address.toLowerCase().includes(kw)),
    )
  }, [list, keyword])

  const hotelIdStr = (record) => (record?.id != null ? String(record.id) : '')

  const handleApprove = (record) => {
    const id = hotelIdStr(record)
    if (!id) {
      message.error('无法获取酒店 ID，请刷新列表后重试')
      return
    }
    Modal.confirm({
      title: `确认通过「${record.name}」的审核？`,
      content: '通过后酒店将上线，移动端可展示并预订。',
      onOk: async () => {
        try {
          await approveHotel(id, {})
          message.success('已通过审核，酒店已上线，移动端将展示该酒店。')
          // 乐观更新：先改本地列表，再刷新，避免后端返回慢或格式不一致仍显示“审核中”
          setList((prev) =>
            prev.map((item) =>
              String(item.id) === id ? { ...item, status: REVIEW_STATUS.APPROVED } : item,
            ),
          )
          fetchList(meta.page)
        } catch {
          // 错误已由 request 拦截器提示
        }
      },
    })
  }

  const handleReject = (record) => {
    setRejectModal({ open: true, hotelId: hotelIdStr(record), hotelName: record.name })
    setRejectReason(record.rejectReason || '')
  }

  const submitReject = async () => {
    if (!rejectReason.trim()) {
      message.warning('请填写不通过原因')
      return
    }
    try {
      await rejectHotel(rejectModal.hotelId, { reason: rejectReason.trim() })
      message.success('已标记为不通过')
      setRejectModal({ open: false, hotelId: null, hotelName: '' })
      setRejectReason('')
      fetchList(meta.page)
    } catch {
      // 错误已由 request 拦截器提示
    }
  }

  const handleViewDetail = (record, e) => {
    if (e?.stopPropagation) e.stopPropagation()
    const hid = hotelIdStr(record)
    if (!hid) return
    setDetailDrawer({
      open: true,
      hotelId: hid,
      detail: null,
      loading: true,
      fallbackRow: record,
    })
    fetchHotelDetail(hid)
      .then((d) =>
        setDetailDrawer((prev) => ({ ...prev, detail: d ?? null, loading: false })),
      )
      .catch(() =>
        setDetailDrawer((prev) => ({ ...prev, loading: false })),
      )
  }

  const handleOfflineToggle = (record) => {
    const id = hotelIdStr(record)
    if (!id) {
      message.error('无法获取酒店 ID，请刷新列表后重试')
      return
    }
    const isOffline = normalizeStatus(record.status) === REVIEW_STATUS.OFFLINE
    Modal.confirm({
      title: isOffline ? `确认恢复「${record.name}」上线？` : `确认将「${record.name}」下线？`,
      onOk: async () => {
        try {
          await setHotelStatus(id, { status: isOffline ? 'online' : 'offline' })
          message.success(isOffline ? '已恢复上线' : '已下线酒店')
          fetchList(meta.page)
        } catch {
          // 错误已由 request 拦截器提示
        }
      },
    })
  }

  const columns = [
    {
      title: '酒店名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
      render: (c, record) => (record.cityName ?? (c && typeof c === 'object' ? c.name : c)) || '-',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value) => statusTag(value),
    },
    {
      title: '开业日期',
      dataIndex: 'openedAt',
      key: 'openedAt',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space onClick={(e) => e.stopPropagation()}>
          <Button type="link" size="small" onClick={() => handleViewDetail(record)}>
            查看详情
          </Button>
          <Button
            type="link"
            size="small"
            disabled={record.status === 'online' || record.status === 2 || record.status === '2'}
            onClick={() => handleApprove(record)}
          >
            通过
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={normalizeStatus(record.status) === REVIEW_STATUS.REJECTED}
            onClick={() => handleReject(record)}
          >
            不通过
          </Button>
          <Button
            type="link"
            size="small"
            disabled={normalizeStatus(record.status) === REVIEW_STATUS.REJECTED}
            onClick={() => handleOfflineToggle(record)}
          >
            {normalizeStatus(record.status) === REVIEW_STATUS.OFFLINE ? '恢复上线' : '下线'}
          </Button>
        </Space>
      ),
    },
  ]

  return (
    <div className="page-hotel-review">
      <Card>
        <Title level={3} style={{ marginBottom: 8 }}>
          酒店信息审核 / 发布 / 下线
        </Title>
        <Text type="secondary" style={{ display: 'block', marginBottom: 16 }}>
          可以按状态筛选待审核酒店，查看商户提交的酒店信息，并进行通过 / 不通过 / 下线等操作。
        </Text>

        <Form
          form={form}
          layout="inline"
          initialValues={{ status: 'all', keyword: '' }}
          onValuesChange={onFilterChange}
          style={{ marginBottom: 16 }}
        >
          <Form.Item label="关键字" name="keyword">
            <Input placeholder="按酒店名 / 地址搜索" allowClear />
          </Form.Item>
          <Form.Item label="审核状态" name="status">
            <Select style={{ width: 160 }}>
              <Option value="all">全部</Option>
              <Option value={REVIEW_STATUS.PENDING}>审核中</Option>
              <Option value={REVIEW_STATUS.APPROVED}>通过</Option>
              <Option value={REVIEW_STATUS.REJECTED}>不通过</Option>
              <Option value={REVIEW_STATUS.OFFLINE}>已下线</Option>
            </Select>
          </Form.Item>
        </Form>

        <Table
          rowKey="id"
          columns={columns}
          dataSource={filteredData}
          loading={loading}
          onRow={(record) => ({
            onClick: () => handleViewDetail(record),
            style: { cursor: 'pointer' },
          })}
          pagination={{
            current: meta.page,
            pageSize: meta.pageSize,
            total: meta.total,
            showSizeChanger: false,
            onChange: (page) => fetchList(page),
          }}
        />
      </Card>

      <Drawer
        title="酒店详情"
        placement="right"
        width={520}
        open={detailDrawer.open}
        onClose={() =>
          setDetailDrawer({ open: false, hotelId: null, detail: null, loading: false, fallbackRow: null })
        }
      >
        {detailDrawer.loading && <div>加载中...</div>}
        {!detailDrawer.loading && !detailDrawer.detail && !detailDrawer.fallbackRow && (
          <Text type="secondary">
            加载失败或暂无数据，请检查网络或后端 GET /hotels/:id 是否返回酒店详情。
          </Text>
        )}
        {!detailDrawer.loading && !detailDrawer.detail && detailDrawer.fallbackRow && (
          <>
            <Text type="warning" style={{ display: 'block', marginBottom: 12 }}>
              详情接口（GET /hotels/:id）返回 404，以下为列表数据。可通过表格行操作「通过」「不通过」「下线」。
            </Text>
            <Descriptions column={1} bordered size="small">
              <Descriptions.Item label="酒店名称">{detailDrawer.fallbackRow.name ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="地址">{detailDrawer.fallbackRow.address ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="城市">
                {(detailDrawer.fallbackRow.cityName != null && String(detailDrawer.fallbackRow.cityName).trim())
                  ? detailDrawer.fallbackRow.cityName
                  : detailDrawer.fallbackRow.city && typeof detailDrawer.fallbackRow.city === 'object'
                    ? detailDrawer.fallbackRow.city.name
                    : (detailDrawer.fallbackRow.city ?? '-')}
              </Descriptions.Item>
              <Descriptions.Item label="星级">{detailDrawer.fallbackRow.star ?? detailDrawer.fallbackRow.starLevel ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="基础房价">{detailDrawer.fallbackRow.basePrice ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="开业日期">{detailDrawer.fallbackRow.openedAt ?? '-'}</Descriptions.Item>
              <Descriptions.Item label="审核状态">{statusTag(detailDrawer.fallbackRow.status)}</Descriptions.Item>
            </Descriptions>
          </>
        )}
        {detailDrawer.detail && (
          <Descriptions column={1} bordered size="small">
            <Descriptions.Item label="酒店名称">{detailDrawer.detail.name}</Descriptions.Item>
            <Descriptions.Item label="英文名">{detailDrawer.detail.nameEn || '-'}</Descriptions.Item>
            <Descriptions.Item label="地址">{detailDrawer.detail.address || '-'}</Descriptions.Item>
            <Descriptions.Item label="城市">
              {(detailDrawer.detail.cityName != null && String(detailDrawer.detail.cityName).trim())
                ? detailDrawer.detail.cityName
                : detailDrawer.detail.city && typeof detailDrawer.detail.city === 'object'
                  ? (detailDrawer.detail.city.name ?? detailDrawer.detail.city)
                  : (detailDrawer.detail.city || '-')}
            </Descriptions.Item>
            <Descriptions.Item label="星级">{detailDrawer.detail.star ?? detailDrawer.detail.starLevel ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="基础房价">{detailDrawer.detail.basePrice ?? '-'}</Descriptions.Item>
            <Descriptions.Item label="开业日期">{detailDrawer.detail.openedAt || '-'}</Descriptions.Item>
            <Descriptions.Item label="审核状态">{statusTag(detailDrawer.detail.status)}</Descriptions.Item>
            <Descriptions.Item label="周边亮点">
              {Array.isArray(detailDrawer.detail.highlights)
                ? detailDrawer.detail.highlights.join('、')
                : typeof detailDrawer.detail.highlights === 'string'
                  ? detailDrawer.detail.highlights
                  : '-'}
            </Descriptions.Item>
            <Descriptions.Item label="房型">
              {Array.isArray(detailDrawer.detail.roomTypes) && detailDrawer.detail.roomTypes.length ? (
                <Table
                  size="small"
                  pagination={false}
                  dataSource={detailDrawer.detail.roomTypes.map((r, i) => ({ ...r, key: r.id ?? i }))}
                  columns={[
                    { title: '房型', dataIndex: 'name', key: 'name', render: (t) => t || '-' },
                    { title: '价格', dataIndex: 'price', key: 'price', render: (v) => (v != null ? `¥${v}` : '-') },
                    { title: '床型', dataIndex: 'bedType', key: 'bedType', render: (t) => t || '-' },
                    { title: '人数', dataIndex: 'capacity', key: 'capacity', render: (v) => v ?? '-' },
                    {
                      title: '图片',
                      key: 'image',
                      width: 72,
                      render: (_, r) => {
                        // 按接口约定仅展示房型主图：roomTypes[i].image
                        // 若历史数据里有 imageUrl 字段，则兼容读取，但不再从 images[0] 回退，避免把酒店轮播图误当成房型图
                        const url = r.image ?? r.imageUrl
                        return url ? (
                          <a href={url} target="_blank" rel="noreferrer">
                            <img src={url} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />
                          </a>
                        ) : (
                          '-'
                        )
                      },
                    },
                  ]}
                />
              ) : detailDrawer.detail.roomTypesSummary && String(detailDrawer.detail.roomTypesSummary).trim() ? (
                detailDrawer.detail.roomTypesSummary
              ) : (
                '-'
              )}
            </Descriptions.Item>
            <Descriptions.Item label="图片">
              {(() => {
                const d = detailDrawer.detail || {}
                // 优先使用后端约定的统一图片列表：images 或 carouselImages，其次才用 coverImage
                let all = []
                if (Array.isArray(d.images) && d.images.length) {
                  all = d.images
                } else if (Array.isArray(d.carouselImages) && d.carouselImages.length) {
                  all = d.carouselImages
                } else if (d.coverImage) {
                  all = [d.coverImage]
                }
                // 去重，避免 coverImage 同时出现在 images/carouselImages 里导致重复展示
                const uniq = []
                const seen = new Set()
                for (const url of all) {
                  if (!url || seen.has(url)) continue
                  seen.add(url)
                  uniq.push(url)
                }
                if (!uniq.length) return '-'
                return (
                  <Space wrap size="small">
                    {uniq.map((url, i) => (
                      <a key={i} href={url} target="_blank" rel="noreferrer" title={`图${i + 1}`}>
                        <img
                          src={url}
                          alt={`酒店图${i + 1}`}
                          style={{
                            width: i === 0 ? 120 : 64,
                            height: i === 0 ? 80 : 64,
                            objectFit: 'cover',
                            borderRadius: 4,
                            display: 'block',
                          }}
                        />
                      </a>
                    ))}
                  </Space>
                )
              })()}
            </Descriptions.Item>
          </Descriptions>
        )}
      </Drawer>

      <Modal
        title="填写不通过原因"
        open={rejectModal.open}
        onOk={submitReject}
        onCancel={() => {
          setRejectModal({ open: false, hotelId: null, hotelName: '' })
          setRejectReason('')
        }}
      >
        <Input.TextArea
          rows={4}
          value={rejectReason}
          onChange={(e) => setRejectReason(e.target.value)}
          placeholder="请说明不通过原因，方便商户修改后再次提交"
        />
      </Modal>
    </div>
  )
}

export default HotelReviewList
