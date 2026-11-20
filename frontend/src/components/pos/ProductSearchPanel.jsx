import { useMemo, useState } from 'react'
import { PackageOpen, Search } from 'lucide-react'

import Alert from '../../components/common/Alert.jsx'
import Badge from '../../components/common/Badge.jsx'
import Card from '../../components/common/Card.jsx'
import EmptyState from '../../components/common/EmptyState.jsx'
import Input from '../../components/common/Input.jsx'
import ProductCard from './ProductCard.jsx'
import { messages } from '../../constants/messages.js'
import { useDebouncedValue } from '../../hooks/useDebouncedValue.js'
import { useProductSearch, useProducts } from '../../hooks/useProducts.js'
import { getApiErrorMessage } from '../../services/api.js'
import { cn } from '../../utils/cn.js'

const UNCATEGORIZED = '__uncategorized__'

function ResultSkeleton() {
  return (
    <div className="space-y-2 p-4">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="flex items-center justify-between gap-3">
          <div className="space-y-2">
            <span className="block h-4 w-40 animate-pulse rounded bg-background" />
            <span className="block h-3 w-24 animate-pulse rounded bg-background" />
          </div>
          <span className="h-8 w-20 animate-pulse rounded bg-background" />
        </div>
      ))}
    </div>
  )
}

function CategoryTab({ active, children, ...props }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      className={cn(
        'inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors',
        active
          ? 'border-primary bg-primary-soft text-primary-strong whitespace-nowrap'
          : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-600 hover:text-gray-900 dark:hover:text-white',
      )}
      {...props}
    >
      {children}
    </button>
  )
}

function matchesCategory(product, category) {
  if (category === null) return true
  if (category === UNCATEGORIZED) return !product.category?.trim()
  return product.category === category
}

export default function ProductSearchPanel({ cart, onAdd }) {
  const [query, setQuery] = useState('')
  const [selectedCategory, setSelectedCategory] = useState(null)
  const debouncedQuery = useDebouncedValue(query, 250)
  const hasQuery = debouncedQuery.trim().length > 0

  // The POS catalog loads active products by default; search only narrows it.
  const catalogQuery = useProducts({
    is_active: true,
    page: 1,
    page_size: 100,
    sort: 'name',
  })
  const searchQuery = useProductSearch(hasQuery ? debouncedQuery : '')

  const catalogProducts = useMemo(
    () => catalogQuery.data?.items ?? [],
    [catalogQuery.data?.items],
  )

  const categories = useMemo(() => {
    const names = new Set()
    for (const product of catalogProducts) {
      const name = product.category?.trim()
      if (name) names.add(name)
    }
    return [...names].sort((a, b) => a.localeCompare(b, 'ar'))
  }, [catalogProducts])

  const hasUncategorized = useMemo(
    () => catalogProducts.some((product) => !product.category?.trim()),
    [catalogProducts],
  )

  let activeCategory = null
  if (selectedCategory === UNCATEGORIZED) {
    activeCategory = hasUncategorized ? UNCATEGORIZED : null
  } else if (selectedCategory && categories.includes(selectedCategory)) {
    activeCategory = selectedCategory
  }

  const baseProducts = useMemo(
    () => (hasQuery ? (searchQuery.data ?? []) : catalogProducts),
    [catalogProducts, hasQuery, searchQuery.data],
  )
  const filteredProducts = useMemo(
    () => baseProducts.filter((product) => matchesCategory(product, activeCategory)),
    [baseProducts, activeCategory],
  )

  const categoryCounts = useMemo(() => {
    const counts = new Map()
    for (const product of baseProducts) {
      const name = product.category?.trim()
      if (name) counts.set(name, (counts.get(name) ?? 0) + 1)
    }
    return counts
  }, [baseProducts])

  const uncategorizedCount = useMemo(
    () => baseProducts.filter((product) => !product.category?.trim()).length,
    [baseProducts],
  )

  const cartQuantities = useMemo(
    () => new Map(cart.map((item) => [item.id, item.quantity])),
    [cart],
  )

  const activeQuery = hasQuery ? searchQuery : catalogQuery
  const isLoading = activeQuery.isLoading
  const isError = activeQuery.isError
  const showEmpty = !isLoading && !isError && filteredProducts.length === 0
  const showCatalogEmpty = showEmpty && !hasQuery && activeCategory === null
  const showCategoryEmpty = showEmpty && !showCatalogEmpty && !hasQuery
  const isLimited =
    !hasQuery && (catalogQuery.data?.total ?? 0) > catalogProducts.length

  return (
    <Card>
      <div className="space-y-3 border-b border-border p-4">
        <div className="relative">
          <Search
            className="pointer-events-none absolute start-3 top-9 h-4 w-4 text-text-muted"
            aria-hidden="true"
          />
          <Input
            label={messages.pos.searchLabel}
            placeholder={messages.pos.searchPlaceholder}
            className="ps-10"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />
        </div>

        <div
          role="group"
          aria-label={messages.pos.categoriesLabel}
          className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1"
        >
          <CategoryTab
            active={activeCategory === null}
            onClick={() => setSelectedCategory(null)}
          >
            {messages.pos.categoryAll}
            <span className="numeric text-xs opacity-70">{baseProducts.length}</span>
          </CategoryTab>
          {categories.map((category) => (
            <CategoryTab
              key={category}
              active={activeCategory === category}
              onClick={() => setSelectedCategory(category)}
            >
              {category}
              <span className="numeric text-xs opacity-70">
                {categoryCounts.get(category) ?? 0}
              </span>
            </CategoryTab>
          ))}
          {hasUncategorized ? (
            <CategoryTab
              active={activeCategory === UNCATEGORIZED}
              onClick={() => setSelectedCategory(UNCATEGORIZED)}
            >
              {messages.pos.uncategorized}
              <span className="numeric text-xs opacity-70">{uncategorizedCount}</span>
            </CategoryTab>
          ) : null}
        </div>
      </div>

      {isError ? (
        <div className="p-4">
          <Alert
            tone="danger"
            title={hasQuery ? messages.pos.searchErrorTitle : messages.pos.catalogErrorTitle}
            action={
              <Button variant="secondary" size="sm" onClick={() => activeQuery.refetch()}>
                {messages.common.retry}
              </Button>
            }
          >
            {getApiErrorMessage(activeQuery.error)}
          </Alert>
        </div>
      ) : isLoading ? (
        <ResultSkeleton />
      ) : showEmpty ? (
        showCatalogEmpty ? (
          <EmptyState
            icon={PackageOpen}
            title={messages.pos.catalogEmptyTitle}
            description={messages.pos.catalogEmptyDescription}
          />
        ) : (
          <EmptyState
            icon={Search}
            title={
              showCategoryEmpty
                ? messages.pos.noCategoryResultsTitle
                : messages.pos.noResultsTitle
            }
            description={
              showCategoryEmpty
                ? messages.pos.noCategoryResultsDescription
                : messages.pos.noResultsDescription
            }
          />
        )
      ) : (
        <>
          <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-text-muted">
            <span>{messages.pos.catalogTitle}</span>
            <span className="numeric">
              {filteredProducts.length} {messages.pos.productCount}
            </span>
          </div>
          <ul className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3">
            {filteredProducts.map((product) => {
              const inCart = cartQuantities.get(product.id) ?? 0
              const atStockLimit = inCart >= product.stock_quantity
              const disabled = product.stock_quantity === 0 || atStockLimit

              return (
                <li key={product.id} className="h-full">
                  <ProductCard
                    product={product}
                    inCart={inCart}
                    onAdd={onAdd}
                    disabled={disabled}
                  />
                </li>
              )
            })}
          </ul>
        </>
      )}

      {isLimited && !isError ? (
        <p className="border-t border-border p-3 text-center text-xs text-text-muted">
          {messages.pos.catalogLimited}
        </p>
      ) : null}
    </Card>
  )
}
