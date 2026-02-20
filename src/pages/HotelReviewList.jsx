import { Badge, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd'
import { useMemo, useState } from 'react'
import { REVIEW_STATUS } from '../constants/index.js'

const { Title, Text } = Typography
const { Option } = Select

const MOCK_HOTELS = [
  {
    id: '1',
    name: '上海陆家嘴示范酒店',
    merchant: '示例商户 A',
    status: REVIEW_STATUS.PENDING,
    submittedAt: '2025-01-10 12:00',
  },
  {
    id: '2',
    name: '杭州西湖假日酒店',
    merchant: '示例商户 B',
    status: REVIEW_STATUS.APPROVED,
    submittedAt: '2025-01-08 09:30',
  },
  {
    id: '3',
    name: '苏州古镇精品客栈',
    merchant: '示例商户 C',
    status: REVIEW_STATUS.REJECTED,
    submittedAt: '2025-01-05 16:20',
    rejectReason: '图片不清晰，请补充高清酒店大堂与房型照片',
  },
  {
    id: '4',
    name: '成都宽窄巷子酒店',
    merchant: '示例商户 D',
    status: REVIEW_STATUS.OFFLINE,
    submittedAt: '2024-12-30 10:00',
  },
]

function statusTag(status) {
  switch (status) {
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
  const [data, setData] = useState(MOCK_HOTELS)
  const [rejectModal, setRejectModal] = useState({ open: false, hotelId: null })
  const [rejectReason, setRejectReason] = useState('')

  const [filters, setFilters] = useState({
    keyword: '',
    status: 'all',
  })

  const handleFilterChange = () => {
    const values = form.getFieldsValue()
    setFilters({
      keyword: values.keyword || '',
      status: values.status || 'all',
    })
  }

  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.status !== 'all' && item.status !== filters.status) return false
      if (filters.keyword) {
        const kw = filters.keyword.toLowerCase()
        return item.name.toLowerCase().includes(kw) || item.merchant.toLowerCase().includes(kw)
      }
      return true
    })
  }, [data, filters])

  const updateStatus = (id, status, extra = {}) => {
    setData((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status, ...extra } : item)),
    )
  }

  const handleApprove = (record) => {
    Modal.confirm({
      title: `确认通过「${record.name}」的审核？`,
      onOk: () => {
        updateStatus(record.id, REVIEW_STATUS.APPROVED)
        message.success('已通过审核')
      },
    })
  }

  const handleReject = (record) => {
    setRejectModal({ open: true, hotelId: record.id })
    setRejectReason(record.rejectReason || '')
  }

  const handleOfflineToggle = (record) => {
    const isOffline = record.status === REVIEW_STATUS.OFFLINE
    Modal.confirm({
      title: isOffline ? `确认恢复「${record.name}」上线？` : `确认将「${record.name}」下线？`,
      onOk: () => {
        updateStatus(record.id, isOffline ? REVIEW_STATUS.APPROVED : REVIEW_STATUS.OFFLINE)
        message.success(isOffline ? '已恢复上线' : '已下线酒店')
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
      title: '商户',
      dataIndex: 'merchant',
      key: 'merchant',
    },
    {
      title: '状态',
      dataIndex: 'status',
      key: 'status',
      render: (value) => statusTag(value),
    },
    {
      title: '提交时间',
      dataIndex: 'submittedAt',
      key: 'submittedAt',
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            size="small"
            disabled={record.status === REVIEW_STATUS.APPROVED}
            onClick={() => handleApprove(record)}
          >
            通过
          </Button>
          <Button
            type="link"
            size="small"
            danger
            disabled={record.status === REVIEW_STATUS.REJECTED}
            onClick={() => handleReject(record)}
          >
            不通过
          </Button>
          <Button
            type="link"
            size="small"
            onClick={() => handleOfflineToggle(record)}
          >
            {record.status === REVIEW_STATUS.OFFLINE ? '恢复上线' : '下线'}
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

        {/* 筛选区 */}
        <Form
          form={form}
          layout="inline"
          initialValues={{ status: 'pending', keyword: '' }}
          onValuesChange={handleFilterChange}
          style={{ marginBottom: 16 }}
        >
          <Form.Item label="关键字" name="keyword">
            <Input placeholder="按酒店名 / 商户搜索" allowClear />
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

        {/* 列表 */}
        <Table rowKey="id" columns={columns} dataSource={filteredData} pagination={false} />
      </Card>

      {/* 不通过原因弹窗 */}
      <Modal
        title="填写不通过原因"
        open={rejectModal.open}
        onOk={() => {
          if (!rejectReason) {
            message.warning('请填写不通过原因')
            return
          }
          updateStatus(rejectModal.hotelId, REVIEW_STATUS.REJECTED, { rejectReason })
          setRejectModal({ open: false, hotelId: null })
          setRejectReason('')
          message.success('已标记为不通过')
        }}
        onCancel={() => {
          setRejectModal({ open: false, hotelId: null })
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

