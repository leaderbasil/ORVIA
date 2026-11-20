import { cn } from '../../utils/cn'
import Badge from '../common/Badge.jsx'
import { formatMoneyValue } from '../../utils/currency.js'

function StockStatus({ product }) {
  if (product.stock_quantity === 0) {
    return <Badge tone="danger">نفذ المخزون</Badge>
  }
  if (product.stock_quantity <= product.minimum_stock) {
    return (
      <Badge tone="warning">
        منخفض المخزون <span className="numeric">{product.stock_quantity}</span>
      </Badge>
    )
  }
  return (
    <Badge tone="success">
      متوفر <span className="numeric">{product.stock_quantity}</span>
    </Badge>
  )
}

export default function ProductCard({ product, inCart = 0, onAdd, disabled }) {
  const atStockLimit = inCart >= product.stock_quantity
  const isDisabled = disabled || product.stock_quantity === 0 || atStockLimit

  return (
    <button
      type="button"
      onClick={() => onAdd(product)}
      disabled={isDisabled}
      aria-label={`إضافة إلى السلة: ${product.name}`}
      className={cn(
        'flex h-full w-full flex-col justify-between gap-3 rounded-xl border p-4 text-start shadow-md transition-colors',
        // خلفية البطاقة مختلفة بوضوح عن خلفية الصفحة (رمادي فاتح vs خلفية الصفحة)
        'bg-gray-50 dark:bg-gray-800',
        // حدود واضحة تفصل البطاقة عن الخلفية
        'border-gray-300 dark:border-gray-600',
        // نصوص واضحة
        'text-gray-900 dark:text-white',
        // حالات التفاعل واضحة في كلا الثيمين - ההوفر ليس أبيض في الدارك
        isDisabled
          ? 'cursor-not-allowed opacity-50 border-gray-400 dark:border-gray-700'
          : 'hover:border-primary hover:bg-gray-100 dark:hover:border-primary/50 dark:hover:bg-gray-700 focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:outline-none',
      )}
    >
      <div className="space-y-2">
        <div className="space-y-1">
          <p className="line-clamp-2 min-h-[3rem] font-medium text-lg text-gray-900 dark:text-white leading-snug">
            {product.name}
          </p>
          <p className="numeric text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-tighter">
            {product.sku}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          {product.category ? (
            <Badge tone="neutral" size="sm">
              {product.category}
            </Badge>
          ) : null}
          <StockStatus product={product} />
          {inCart > 0 ? (
            <Badge tone="primary" size="sm">
              <span className="numeric">{inCart}</span> في السلة
            </Badge>
          ) : null}
          {atStockLimit && product.stock_quantity > 0 ? (
            <Badge tone="neutral" size="sm">
              الحد الأقصى reached
            </Badge>
          ) : null}
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-border pt-3">
        <span className="numeric text-xl font-bold text-gray-900 dark:text-white">
          {formatMoneyValue(product.selling_price)}
        </span>
        {!isDisabled ? (
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary-soft text-primary-strong dark:bg-primary/10 dark:text-primary">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
          </span>
        ) : null}
      </div>
    </button>
  )
}