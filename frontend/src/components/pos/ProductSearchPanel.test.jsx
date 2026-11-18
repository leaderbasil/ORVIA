import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { messages } from '../../constants/messages.js'
import ProductSearchPanel from './ProductSearchPanel.jsx'

vi.mock('../../hooks/useProducts.js', () => {
  const products = [
    {
      id: 'product-milk',
      name: 'حليب طازج',
      sku: 'MILK-1L',
      barcode: null,
      category: 'ألبان',
      unit: 'piece',
      selling_price: '2.50',
      stock_quantity: 5,
      minimum_stock: 1,
      is_active: true,
    },
    {
      id: 'product-bread',
      name: 'خبز عربي',
      sku: 'BREAD-1',
      barcode: null,
      category: 'مخبوزات',
      unit: 'piece',
      selling_price: '1.00',
      stock_quantity: 0,
      minimum_stock: 0,
      is_active: true,
    },
    {
      id: 'product-water',
      name: 'ماء معدني',
      sku: 'WATER-1',
      barcode: null,
      category: null,
      unit: 'piece',
      selling_price: '0.50',
      stock_quantity: 10,
      minimum_stock: 2,
      is_active: true,
    },
  ]

  return {
    useProducts: () => ({
      data: {
        items: products,
        total: products.length,
        page: 1,
        page_size: 100,
      },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
    useProductSearch: () => ({
      data: [],
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    }),
  }
})

describe('ProductSearchPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows the full catalog before searching and exposes category tabs', () => {
    render(<ProductSearchPanel cart={[]} onAdd={vi.fn()} />)

    expect(screen.getByText('حليب طازج')).toBeInTheDocument()
    expect(screen.getByText('خبز عربي')).toBeInTheDocument()
    expect(screen.getByText('ماء معدني')).toBeInTheDocument()

    expect(screen.getByRole('button', { name: /^الكل/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^ألبان/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /^مخبوزات/ })).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: new RegExp(messages.pos.uncategorized) }),
    ).toBeInTheDocument()
  })

  it('filters the catalog by category and returns to all products', async () => {
    const user = userEvent.setup()
    render(<ProductSearchPanel cart={[]} onAdd={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: /^ألبان/ }))

    expect(screen.getByText('حليب طازج')).toBeInTheDocument()
    expect(screen.queryByText('خبز عربي')).not.toBeInTheDocument()
    expect(screen.queryByText('ماء معدني')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: /^الكل/ }))

    expect(screen.getByText('خبز عربي')).toBeInTheDocument()
  })

  it('adds an available product and disables out-of-stock products', async () => {
    const onAdd = vi.fn()
    const user = userEvent.setup()
    render(<ProductSearchPanel cart={[]} onAdd={onAdd} />)

    await user.click(
      screen.getByRole('button', {
        name: `${messages.pos.addToCart}: حليب طازج`,
      }),
    )

    expect(onAdd).toHaveBeenCalledWith(expect.objectContaining({ id: 'product-milk' }))
    expect(
      screen.getByRole('button', {
        name: `${messages.pos.addToCart}: خبز عربي`,
      }),
    ).toBeDisabled()
  })
})
