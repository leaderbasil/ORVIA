import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'

import Breadcrumbs from '../../components/common/Breadcrumbs.jsx'
import Card from '../../components/common/Card.jsx'
import PageHeader from '../../components/common/PageHeader.jsx'
import ProductForm from '../../components/products/ProductForm.jsx'
import { messages } from '../../constants/messages.js'
import { useCreateProduct } from '../../hooks/useProducts.js'
import { getApiErrorMessage } from '../../services/api.js'

export default function CreateProduct() {
  const navigate = useNavigate()
  const createProduct = useCreateProduct()
  const [serverError, setServerError] = useState('')

  const handleSubmit = async (payload) => {
    setServerError('')
    try {
      await createProduct.mutateAsync(payload)
      toast.success(messages.products.created)
      navigate('/products')
    } catch (error) {
      setServerError(getApiErrorMessage(error))
    }
  }

  return (
    <div>
      <Breadcrumbs
        items={[
          { label: messages.nav.products, to: '/products' },
          { label: messages.pages.productNew.title },
        ]}
      />
      <PageHeader
        title={messages.pages.productNew.title}
        description={messages.pages.productNew.description}
      />
      <Card className="p-4 md:p-6">
        <ProductForm
          onSubmit={handleSubmit}
          onCancel={() => navigate('/products')}
          submitLabel={messages.products.form.save}
          serverError={serverError}
        />
      </Card>
    </div>
  )
}
