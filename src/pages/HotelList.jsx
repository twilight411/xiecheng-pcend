import { Button, Card, Space, Table, Tag, Typography } from 'antd'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { fetchMyHotels } from '../services/hotel.js'

const { Title, Paragraph, Text } = Typography

const TEMPLATE_ROW = {
  id: 'template',
  name: '【示例】陆家嘴示范酒店',
  city: '上海',
  status: 'template',
  updatedAt: '2025-01-01',
}

function HotelList() {
  const navigate = useNavigate()
  const [list, setList] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    fetchMyHotels()
      .then((data) => {
        if (!cancelled) {
          const rows = (data || []).map((h) => ({
            id: String(h.id),
            name: h.name,
            city: h.city?.name ?? h.city ?? '-',
            status: h.status || 'pending',
            updatedAt: h.updatedAt || h.updated_at || '-',
          }))
          setList(rows)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [])

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
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (status) => {
        if (status === 'template') return <Tag color="default">模板</Tag>
        if (status === 'pending') return <Tag color="processing">待审核</Tag>
        if (status === 'online') return <Tag color="green">已上线</Tag>
        if (status === 'offline') return <Tag color="default">已下线</Tag>
        if (status === 'rejected') return <Tag color="red">未通过</Tag>
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
              基于模板新建酒店
            </Button>
          )
        }
        return (
          <Space>
            <Button type="link" onClick={() => navigate(`/merchant/hotels/${record.id}`)}>
              查看 / 编辑
            </Button>
          </Space>
        )
      },
    },
  ]

  return (
    <div className="page-hotel-list">
      <Card>
        <Title level={3} style={{ marginBottom: 8 }}>
          我的酒店
        </Title>
        <Paragraph type="secondary" style={{ marginBottom: 16 }}>
          首次使用建议先点击上方模板酒店，了解推荐的填写方式；之后可以基于模板快速创建属于自己的酒店。
        </Paragraph>
        <div style={{ marginBottom: 16, textAlign: 'right' }}>
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
        />
        {list.length === 0 && !loading && (
          <Paragraph type="secondary" style={{ marginTop: 12 }}>
            <Text>暂无已提交的酒店，可点击「新建酒店」或「基于模板新建酒店」开始录入。</Text>
          </Paragraph>
        )}
      </Card>
    </div>
  )
}

export default HotelList

