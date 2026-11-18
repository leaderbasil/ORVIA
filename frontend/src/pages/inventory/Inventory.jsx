import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Pencil } from 'lucide-react'

import Alert from '../../components/common/Alert.jsx'
import Badge from '../../components/common/Badge.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import DataTable from '../../components/common/DataTable.jsx'
import Input from '../../components/common/Input.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import { messages } from '../../constants/messages.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import { useLowStockProducts } from '../../hooks/useProducts.js'
import { getApiErrorMessage } from '../../services/api.js'

const PAGE_SIZE = 20

export default function Inventory() {
  const navigate = useNavigate()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const debouncedSearch = useDebouncedValue(search, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch])

  const params = useMemo(() => {
    const query = { page, page_size: PAGE_SIZE }
    if (debouncedSearch.trim()) query.search = debouncedSearch.trim()
    return query
  }, [page, debouncedSearch])

  const lowStockQuery = useLowStockProducts(params)
  const pageData = lowStockQuery.data

  const columns = [
    {
      key: 'product',
      header: messages.inventory.columns.product,
      render: (product) => (
        <div className="min-w-44">
          <p className="font-medium text-text">{product.name}</p>
          <p className="numeric text-xs text-text-muted">{product.sku}</p>
        </div>
      ),
    },
    {
      key: 'stock_quantity',
      header: messages.inventory.columns.stock,
      render: (product) => (
        <span
          className={
            product.stock_quantity === 0
              ? 'numeric font-semibold text-danger-strong'
              : 'numeric font-medium text-text'
          }
        >
          {product.stock_quantity}
        </span>
      ),
    },
    {
      key: 'minimum_stock',
      header: messages.inventory.columns.minimum,
      render: (product) => <span className="numeric">{product.minimum_stock}</span>,
    },
    {
      key: 'status',
      header: messages.inventory.columns.status,
      render: (product) => (
        <Badge tone={product.stock_quantity === 0 ? 'danger' : 'warning'}>
          {product.stock_quantity === 0 ? messages.inventory.out : messages.inventory.low}
        </Badge>
      ),
    },
    {
      key: 'actions',
      header: messages.inventory.columns.actions,
      align: 'end',
      render: (product) => (
        <button
          type="button"
          onClick={() => navigate(`/products/${product.id}/edit`)}
          aria-label={`${messages.inventory.editStock}: ${product.name}`}
          title={messages.inventory.editStock}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-soft hover:text-primary-strong"
        >
          <Pencil className="h-4 w-4" aria-hidden="true" />
        </button>
      ),
    },
  ]

  return (
    <div>
      <PageHeader
        actions={
          pageData ? (
            <Badge tone={pageData.total > 0 ? 'warning' : 'success'}>
              {messages.inventory.summary}
              <span className="numeric px-1">{pageData.total}</span>
            </Badge>
          ) : null
        }
      />

      <Card>
        <div className="border-b border-border p-4">
          <Input
            label={messages.actions.search}
            placeholder={messages.inventory.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>

        {lowStockQuery.isError ? (
          <div className="p-4">
            <Alert
              tone="danger"
              title={messages.errors.UNKNOWN}
              action={
                <Button variant="secondary" size="sm" onClick={() => lowStockQuery.refetch()}>
                  {messages.common.retry}
                </Button>
              }
            >
              {getApiErrorMessage(lowStockQuery.error)}
            </Alert>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={pageData?.items ?? []}
            isLoading={lowStockQuery.isLoading}
            emptyTitle={messages.inventory.emptyTitle}
            emptyDescription={messages.inventory.emptyDescription}
          />
        )}

        {pageData && pageData.total > 0 ? (
          <Pagination
            page={pageData.page}
            pageSize={pageData.page_size}
            total={pageData.total}
            onPageChange={setPage}
            disabled={lowStockQuery.isFetching}
          />
        ) : null}
      </Card>
    </div>
  )
}
