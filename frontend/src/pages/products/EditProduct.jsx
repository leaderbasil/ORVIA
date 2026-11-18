import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'

import Alert from '../../components/common/Alert.jsx'
import Breadcrumbs from '../../components/common/Breadcrumbs.jsx'
import Button from '../../components/common/Button.jsx'
import Card from '../../components/common/Card.jsx'
import Spinner from '../../components/common/Spinner.jsx'
import ProductForm from '../../components/products/ProductForm.jsx'
import { messages } from '../../constants/messages.js'
import { useProduct, useUpdateProduct } from '../../hooks/useProducts.js'
import { getApiErrorMessage } from '../../services/api.js'

export default function EditProduct() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: product, isLoading, isError, error, refetch } = useProduct(id)
  const updateProduct = useUpdateProduct()
  const [serverError, setServerError] = useState('')

  const handleSubmit = async (payload) => {
    setServerError('')
    try {
      await updateProduct.mutateAsync({ id, payload })
      toast.success(messages.products.updated)
      navigate('/products')
    } catch (updateError) {
      setServerError(getApiErrorMessage(updateError))
    }
  }

  const breadcrumbs = (
    <Breadcrumbs
      items={[
        { label: messages.nav.products, to: '/products' },
        { label: messages.pages.productEdit.title },
      ]}
    />
  )

  if (isLoading) {
    return (
      <div>
        {breadcrumbs}
        <Spinner />
      </div>
    )
  }

  if (isError) {
    return (
      <div>
        {breadcrumbs}
        <Alert
          tone="danger"
          title={messages.errors.UNKNOWN}
          action={
            <Button variant="secondary" size="sm" onClick={() => refetch()}>
              {messages.common.retry}
            </Button>
          }
        >
          {getApiErrorMessage(error)}
        </Alert>
      </div>
    )
  }

  return (
    <div>
      {breadcrumbs}
      <Card className="p-4 md:p-6">
        <ProductForm
          initialValues={product}
          onSubmit={handleSubmit}
          onCancel={() => navigate('/products')}
          submitLabel={messages.products.form.save}
          serverError={serverError}
        />
      </Card>
    </div>
  )
}
