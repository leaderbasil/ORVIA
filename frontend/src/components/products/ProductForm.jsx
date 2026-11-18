import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

import Alert from '../../components/common/Alert.jsx'
import Button from '../../components/common/Button.jsx'
import Input from '../../components/common/Input.jsx'
import Select from '../../components/common/Select.jsx'
import Switch from '../../components/common/Switch.jsx'
import { messages } from '../../constants/messages.js'

const moneyField = z
  .string()
  .trim()
  .regex(/^\d+(\.\d{1,2})?$/, messages.validation.money)

const productSchema = z.object({
  name: z
    .string()
    .trim()
    .min(1, messages.validation.required)
    .max(200, messages.validation.maxLength),
  sku: z
    .string()
    .trim()
    .min(1, messages.validation.required)
    .max(64, messages.validation.maxLength),
  barcode: z.string().trim().max(64, messages.validation.maxLength).optional(),
  category: z.string().trim().max(100, messages.validation.maxLength).optional(),
  unit: z.enum(['piece', 'kg', 'liter']),
  cost_price: moneyField,
  selling_price: moneyField,
  stock_quantity: z.coerce
    .number()
    .int(messages.validation.nonNegativeInteger)
    .min(0, messages.validation.nonNegativeInteger),
  minimum_stock: z.coerce
    .number()
    .int(messages.validation.nonNegativeInteger)
    .min(0, messages.validation.nonNegativeInteger),
  is_active: z.boolean(),
})

const EMPTY_VALUES = {
  name: '',
  sku: '',
  barcode: '',
  category: '',
  unit: 'piece',
  cost_price: '',
  selling_price: '',
  stock_quantity: 0,
  minimum_stock: 0,
  is_active: true,
}

function toFormValues(product) {
  if (!product) return EMPTY_VALUES
  return {
    name: product.name,
    sku: product.sku,
    barcode: product.barcode ?? '',
    category: product.category ?? '',
    unit: product.unit,
    cost_price: product.cost_price,
    selling_price: product.selling_price,
    stock_quantity: product.stock_quantity,
    minimum_stock: product.minimum_stock,
    is_active: product.is_active,
  }
}

function toProductPayload(values) {
  return {
    name: values.name.trim(),
    sku: values.sku.trim(),
    barcode: values.barcode?.trim() || '',
    category: values.category?.trim() || null,
    unit: values.unit,
    cost_price: values.cost_price,
    selling_price: values.selling_price,
    stock_quantity: Number(values.stock_quantity),
    minimum_stock: Number(values.minimum_stock),
    is_active: values.is_active,
  }
}

export default function ProductForm({
  initialValues = null,
  onSubmit,
  onCancel,
  submitLabel = messages.products.form.save,
  serverError = '',
}) {
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(productSchema),
    defaultValues: toFormValues(initialValues),
    mode: 'onBlur',
  })

  return (
    <form
      className="space-y-6"
      onSubmit={handleSubmit((values) => onSubmit(toProductPayload(values)))}
      noValidate
    >
      {serverError ? <Alert tone="danger">{serverError}</Alert> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <div className="md:col-span-2">
          <Input
            label={messages.products.form.name}
            required
            error={errors.name?.message}
            {...register('name')}
          />
        </div>

        <Input
          label={messages.products.form.sku}
          required
          dir="ltr"
          className="text-start"
          error={errors.sku?.message}
          {...register('sku')}
        />
        <Input
          label={messages.products.form.barcode}
          dir="ltr"
          className="text-start"
          error={errors.barcode?.message}
          {...register('barcode')}
        />

        <Input
          label={messages.products.form.category}
          error={errors.category?.message}
          {...register('category')}
        />
        <Select
          label={messages.products.form.unit}
          error={errors.unit?.message}
          options={[
            { value: 'piece', label: messages.products.form.units.piece },
            { value: 'kg', label: messages.products.form.units.kg },
            { value: 'liter', label: messages.products.form.units.liter },
          ]}
          {...register('unit')}
        />

        <Input
          label={messages.products.form.costPrice}
          inputMode="decimal"
          dir="ltr"
          className="text-start numeric"
          error={errors.cost_price?.message}
          {...register('cost_price')}
        />
        <Input
          label={messages.products.form.sellingPrice}
          inputMode="decimal"
          dir="ltr"
          className="text-start numeric"
          error={errors.selling_price?.message}
          {...register('selling_price')}
        />

        <Input
          label={messages.products.form.stockQuantity}
          type="number"
          min="0"
          step="1"
          dir="ltr"
          className="text-start numeric"
          error={errors.stock_quantity?.message}
          {...register('stock_quantity')}
        />
        <Input
          label={messages.products.form.minimumStock}
          type="number"
          min="0"
          step="1"
          dir="ltr"
          className="text-start numeric"
          error={errors.minimum_stock?.message}
          {...register('minimum_stock')}
        />
      </div>

      <Controller
        control={control}
        name="is_active"
        render={({ field }) => (
          <Switch
            checked={field.value}
            onChange={field.onChange}
            label={messages.products.form.isActive}
          />
        )}
      />

      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">
        <Button type="submit" loading={isSubmitting}>
          {isSubmitting ? messages.products.form.saving : submitLabel}
        </Button>
        <Button type="button" variant="secondary" onClick={onCancel} disabled={isSubmitting}>
          {messages.actions.cancel}
        </Button>
      </div>
    </form>
  )
}
