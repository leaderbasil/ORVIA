import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Ban, Pencil, Plus } from 'lucide-react'
import { toast } from 'sonner'

import Alert from '../../components/common/Alert.jsx'
import Badge from '../../components/common/Badge.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import ConfirmDialog from '../../components/common/ConfirmDialog.jsx'
import DataTable from '../../components/common/DataTable.jsx'
import Input from '../../components/common/Input.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import Pagination from '../../components/common/Pagination.jsx'
import Select from '../../components/common/Select.jsx'
import { messages } from '../../constants/messages.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import { useAuth } from '../../hooks/useAuth.js'
import { useDisableProduct, useProducts } from '../../hooks/useProducts.js'
import { getApiErrorMessage } from '../../services/api.js'
import { cn } from '../../utils/cn.js'
import { formatMoneyValue } from '../../utils/currency.js'

const PAGE_SIZE = 20

const STATUS_OPTIONS = [
  { value: 'all', label: messages.common.all },
  { value: 'active', label: messages.products.active },
  { value: 'inactive', label: messages.products.inactive },
]

const SORT_OPTIONS = Object.entries(messages.products.sortOptions).map(([value, label]) => ({
  value,
  label,
}))

function StockCell({ product }) {
  const isOut = product.stock_quantity === 0
  const isLow = !isOut && product.stock_quantity <= product.minimum_stock

  return (
    <div className="flex items-center gap-2">
      <span className={cn('numeric font-medium', isOut ? 'text-danger-strong' : 'text-text')}>
        {product.stock_quantity}
      </span>
      {isOut ? (
        <Badge tone="danger">{messages.products.stock.out}</Badge>
      ) : isLow ? (
        <Badge tone="warning">{messages.products.stock.low}</Badge>
      ) : null}
    </div>
  )
}

export default function Products() {
  const navigate = useNavigate()
  const { user } = useAuth()
  const isAdmin = user?.role === 'ADMIN'

  const [search, setSearch] = useState('')
  const [category, setCategory] = useState('')
  const [status, setStatus] = useState('all')
  const [sort, setSort] = useState('name')
  const [page, setPage] = useState(1)
  const [productToDisable, setProductToDisable] = useState(null)

  const debouncedSearch = useDebouncedValue(search, 300)
  const debouncedCategory = useDebouncedValue(category, 300)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, debouncedCategory, status, sort])

  const params = useMemo(() => {
    const query = { page, page_size: PAGE_SIZE, sort }
    if (debouncedSearch.trim()) query.search = debouncedSearch.trim()
    if (debouncedCategory.trim()) query.category = debouncedCategory.trim()
    if (status !== 'all') query.is_active = status === 'active'
    return query
  }, [page, sort, debouncedSearch, debouncedCategory, status])

  const productsQuery = useProducts(params)
  const disableProduct = useDisableProduct()

  const renderActions = (product) => (
    <div className="flex items-center justify-end gap-1">
      <button
        type="button"
        onClick={() => navigate(`/products/${product.id}/edit`)}
        aria-label={`${messages.products.edit}: ${product.name}`}
        title={messages.products.edit}
        className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-primary-soft hover:text-primary-strong"
      >
        <Pencil className="h-4 w-4" aria-hidden="true" />
      </button>
      {product.is_active ? (
        <button
          type="button"
          onClick={() => setProductToDisable(product)}
          aria-label={`${messages.products.disable}: ${product.name}`}
          title={messages.products.disable}
          className="flex h-8 w-8 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-danger-soft hover:text-danger-strong"
        >
          <Ban className="h-4 w-4" aria-hidden="true" />
        </button>
      ) : null}
    </div>
  )

  const columns = [
    {
      key: 'name',
      header: messages.products.columns.name,
      render: (product) => (
        <div className="min-w-44">
          <p className="font-medium text-text">{product.name}</p>
          <p className="numeric text-xs text-text-muted">{product.sku}</p>
        </div>
      ),
    },
    {
      key: 'category',
      header: messages.products.columns.category,
      render: (product) => product.category || messages.common.notAvailable,
    },
    ...(isAdmin
      ? [
          {
            key: 'cost_price',
            header: messages.products.columns.costPrice,
            align: 'end',
            className: 'numeric',
            render: (product) => formatMoneyValue(product.cost_price),
          },
        ]
      : []),
    {
      key: 'selling_price',
      header: messages.products.columns.sellingPrice,
      align: 'end',
      className: 'numeric font-medium',
      render: (product) => formatMoneyValue(product.selling_price),
    },
    {
      key: 'stock_quantity',
      header: messages.products.columns.stock,
      render: (product) => <StockCell product={product} />,
    },
    {
      key: 'is_active',
      header: messages.products.columns.status,
      render: (product) => (
        <Badge tone={product.is_active ? 'success' : 'neutral'}>
          {product.is_active ? messages.products.active : messages.products.inactive}
        </Badge>
      ),
    },
    ...(isAdmin
      ? [
          {
            key: 'actions',
            header: messages.products.columns.actions,
            align: 'end',
            render: renderActions,
          },
        ]
      : []),
  ]

  const mobileRow = (product) => (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="font-medium text-text">{product.name}</p>
          <p className="numeric text-xs text-text-muted">{product.sku}</p>
          <p className="mt-1 text-xs text-text-muted">
            {product.category || messages.common.notAvailable}
          </p>
        </div>
        <Badge tone={product.is_active ? 'success' : 'neutral'}>
          {product.is_active ? messages.products.active : messages.products.inactive}
        </Badge>
      </div>

      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-xs text-text-muted">{messages.products.columns.sellingPrice}</dt>
          <dd className="numeric font-semibold text-text">
            {formatMoneyValue(product.selling_price)}
          </dd>
        </div>
        {isAdmin ? (
          <div>
            <dt className="text-xs text-text-muted">{messages.products.columns.costPrice}</dt>
            <dd className="numeric text-text">{formatMoneyValue(product.cost_price)}</dd>
          </div>
        ) : null}
        <div>
          <dt className="text-xs text-text-muted">{messages.products.columns.stock}</dt>
          <dd>
            <StockCell product={product} />
          </dd>
        </div>
      </dl>

      {isAdmin ? (
        <div className="flex justify-end border-t border-border pt-2">
          {renderActions(product)}
        </div>
      ) : null}
    </div>
  )

  const handleConfirmDisable = async () => {
    if (!productToDisable) return
    try {
      await disableProduct.mutateAsync(productToDisable.id)
      toast.success(messages.products.disabled)
      setProductToDisable(null)
    } catch (error) {
      toast.error(getApiErrorMessage(error))
    }
  }

  const hasActiveFilters =
    Boolean(debouncedSearch.trim()) || Boolean(debouncedCategory.trim()) || status !== 'all'
  const pageData = productsQuery.data

  return (
    <div>
      <PageHeader
        actions={
          isAdmin ? (
            <Button onClick={() => navigate('/products/new')}>
              <Plus className="h-4 w-4" aria-hidden="true" />
              {messages.products.add}
            </Button>
          ) : null
        }
      />

      <Card>
        <div className="grid grid-cols-1 gap-3 border-b border-border p-4 sm:grid-cols-2 lg:grid-cols-4">
          <Input
            label={messages.actions.search}
            placeholder={messages.products.search}
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <Input
            label={messages.products.columns.category}
            placeholder={messages.products.categoryPlaceholder}
            value={category}
            onChange={(event) => setCategory(event.target.value)}
          />
          <Select
            label={messages.products.statusFilter}
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            options={STATUS_OPTIONS}
          />
          <Select
            label={messages.products.sort}
            value={sort}
            onChange={(event) => setSort(event.target.value)}
            options={SORT_OPTIONS}
          />
        </div>

        {productsQuery.isError ? (
          <div className="p-4">
            <Alert
              tone="danger"
              title={messages.errors.UNKNOWN}
              action={
                <Button variant="secondary" size="sm" onClick={() => productsQuery.refetch()}>
                  {messages.common.retry}
                </Button>
              }
            >
              {getApiErrorMessage(productsQuery.error)}
            </Alert>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={pageData?.items ?? []}
            mobileRow={mobileRow}
            isLoading={productsQuery.isLoading}
            emptyTitle={
              hasActiveFilters ? messages.products.emptyFilteredTitle : messages.products.emptyTitle
            }
            emptyDescription={
              hasActiveFilters
                ? messages.products.emptyFilteredDescription
                : messages.products.emptyDescription
            }
            emptyAction={
              !hasActiveFilters && isAdmin ? (
                <Button size="sm" onClick={() => navigate('/products/new')}>
                  {messages.products.add}
                </Button>
              ) : null
            }
          />
        )}

        {pageData && pageData.total > 0 ? (
          <Pagination
            page={pageData.page}
            pageSize={pageData.page_size}
            total={pageData.total}
            onPageChange={setPage}
            disabled={productsQuery.isFetching}
          />
        ) : null}
      </Card>

      <ConfirmDialog
        open={Boolean(productToDisable)}
        title={messages.products.confirmDisableTitle}
        description={messages.products.confirmDisableDescription}
        confirmLabel={messages.products.confirmDisableCta}
        loading={disableProduct.isPending}
        onConfirm={handleConfirmDisable}
        onClose={() => setProductToDisable(null)}
      />
    </div>
  )
}
