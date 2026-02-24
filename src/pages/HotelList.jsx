import { Alert, Button, Card, Space, Table, Tag, Typography } from 'antd'
import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyHotels } from '../services/hotel.js'

const { Title, Paragraph, Text } = Typography

// 兼容后端返回数字状态：1=pending, 2=online, 3=rejected, 4=offline
function normalizeStatus(s) {
  if (s === 'template') return 'template'
  if (s === 'online' || s === 2 || s === '2') return 'online'
  if (s === 'rejected' || s === 3 || s === '3') return 'rejected'
  if (s === 'offline' || s === 4 || s === '4') return 'offline'
  return 'pending'
}

// 取列表项「最近更新时间」。商户端 GET /hotels 返回 updatedAt（ISO 8601），兼容 updated_at、reviewedAt 等，格式化为 YYYY-MM-DD
function pickListUpdatedAt(h) {
  const raw =
    h?.updatedAt ??
    h?.updated_at ??
    h?.reviewedAt ??
    h?.reviewed_at ??
    h?.extra?.updatedAt ??
    h?.extra?.reviewedAt ??
    h?.createdAt ??
    h?.created_at
  if (raw == null || raw === '') return null
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}/.test(raw)) return raw.slice(0, 10)
  if (typeof raw === 'string' && /^\d{4}\/\d{2}\/\d{2}/.test(raw)) return raw.replace(/\//g, '-').slice(0, 10)
  if (typeof raw === 'number' || (typeof raw === 'string' && /^\d+$/.test(raw))) {
    const d = new Date(Number(raw) < 1e12 ? Number(raw) * 1000 : Number(raw))
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  }
  try {
    const d = new Date(raw)
    if (!Number.isNaN(d.getTime())) return d.toISOString().slice(0, 10)
  } catch (_) {}
  return raw
}

// 取未通过原因。商户端 GET /hotels 在 status=rejected 时返回 rejectReason（与 POST /hotels/:id/reject 的 reason 一致）
function pickRejectReason(h) {
  const r =
    h?.rejectReason ??
    h?.reject_reason ??
    h?.extra?.rejectReason ??
    h?.extra?.reject_reason ??
    h?.reject_reason_display
  return r != null && String(r).trim() !== '' ? String(r).trim() : null
}

const TEMPLATE_ROW = {
  id: 'template',
  name: '【示例】陆家嘴示范酒店',
  city: '上海',
  status: 'template',
  updatedAt: '2025-01-01',
  minPrice: 399,
}

function HotelList() {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(null)

  const fetchList = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const data = await fetchMyHotels()
      const rows = (data || []).map((h) => ({
        id: String(h.id),
        name: h.name,
        city: h.city?.name ?? h.cityName ?? h.city ?? '-',
        status: normalizeStatus(h.status),
        updatedAt: pickListUpdatedAt(h) ?? '-',
        rejectReason: pickRejectReason(h),
        minPrice: h.minPrice ?? h.basePrice,
      }))
      setList(rows)
    } catch (err) {
      setList([])
      const msg = err?.response?.data?.message || err?.message || '请求失败'
      setLoadError(msg)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchList()
  }, [fetchList])

  // 从编辑页返回或切回本标签页时刷新列表，避免管理员通过后列表仍显示「待审核」
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') fetchList()
    }
    document.addEventListener('visibilitychange', onVisible)
    return () => document.removeEventListener('visibilitychange', onVisible)
  }, [fetchList])

  const columns = [
    {
      title: '酒店名称',
      dataIndex: 'name',
      key: 'name',
      render: (text, record) => (
        <Space>
          <span>{text}</span>
          {record.status === 'template' && <Tag color="gold">新手参考模板</Tag>}
        </Space>
      ),
    },
    {
      title: '城市',
      dataIndex: 'city',
      key: 'city',
    },
    {
      title: '参考价',
      dataIndex: 'minPrice',
      key: 'minPrice',
      render: (v) => (v != null ? `¥${v}` : '-'),
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status, record) => {
        const s = normalizeStatus(status)
        if (s === 'template') return <Tag color="default">模板</Tag>
        if (s === 'pending') return <Tag color="processing">待审核</Tag>
        if (s === 'online') return <Tag color="green">已上线</Tag>
        if (s === 'offline') return <Tag color="default">已下线</Tag>
        if (s === 'rejected') {
          const reason = record.rejectReason
          return (
            <span>
              <Tag color="red">未通过</Tag>
              {reason && (
                <div style={{ marginTop: 4, fontSize: 12, color: 'rgba(0,0,0,0.55)' }} title={reason}>
                  {reason.length > 24 ? `${reason.slice(0, 24)}…` : reason}
                </div>
              )}
            </span>
          )
        }
        return <Tag>未知</Tag>
      },
    },
    {
      title: '最近更新时间',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => {
        if (record.status === 'template') {
          return (
            <Button type="link" onClick={() => navigate('/merchant/hotels/new?from=template')}>
              基于模板新建
            </Button>
          )
        }
        return (
          <Button type="link" onClick={() => navigate(`/merchant/hotels/${record.id}`)}>
            查看详情 / 编辑
          </Button>
        )
      },
    },
  ]

  const onRow = (record) => ({
    onClick: () => {
      if (record.status === 'template') {
        navigate('/merchant/hotels/new?from=template')
      } else {
        navigate(`/merchant/hotels/${record.id}`)
      }
    },
    style: { cursor: 'pointer' },
  })

  return (
    <div className="page-hotel-list">
      <Card>
        <Title level={3} style={{ marginBottom: 8 }}>
          我的酒店
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          首次使用可点击上方模板酒店了解填写方式。新建酒店提交后为待审核，管理员审核通过后酒店将上线并在移动端展示。
        </Paragraph>
        {loadError && (
          <Alert
            type="warning"
            showIcon
            message="列表加载失败"
            description={
              <>
                {loadError}
                <br />
                请确认后端已提供 <strong>GET /hotels</strong> 接口，并可按当前登录用户返回其提交的酒店（含待审核、未通过等状态）。若接口未实现，提交后的酒店无法在此展示。
              </>
            }
            action={<Button size="small" onClick={fetchList}>重试</Button>}
            style={{ marginBottom: 16 }}
          />
        )}
        <div style={{ marginBottom: 16, display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <Button onClick={fetchList} loading={loading}>
            刷新列表
          </Button>
          <Button type="primary" onClick={() => navigate('/merchant/hotels/new')}>
            新建酒店
          </Button>
        </div>
        <Table
          rowKey="id"
          columns={columns}
          dataSource={[TEMPLATE_ROW, ...list]}
          pagination={false}
          loading={loading}
          onRow={onRow}
        />
        {list.length === 0 && !loading && !loadError && (
          <Paragraph type="secondary" style={{ marginTop: 12 }}>
            <Text>暂无已提交的酒店，可点击「新建酒店」或「基于模板新建」开始录入。</Text>
          </Paragraph>
        )}
        {list.length === 0 && !loading && loadError && (
          <Paragraph type="secondary" style={{ marginTop: 12 }}>
            <Text>若您已提交过酒店但仍看不到，请先解决上方「列表加载失败」提示（后端需实现 GET /hotels 并按当前用户返回酒店列表）。</Text>
          </Paragraph>
        )}
      </Card>
    </div>
  )
}

export default HotelList

