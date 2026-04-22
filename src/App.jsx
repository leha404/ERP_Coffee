import { useMemo, useState } from 'react'
import { initialIngredients, menuItems } from './data'

const STORAGE_KEY = 'erp-coffee-v2'
const DEFAULT_PRODUCT_IMAGE = '/images/drink-coffee.svg'
const DEFAULT_INGREDIENT_IMAGE = '/images/ingredient-stock.svg'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        ingredients: initialIngredients,
        menu: menuItems,
        orders: [],
      }
    }

    const parsed = JSON.parse(raw)
    const rawIngredients = Array.isArray(parsed.ingredients) ? parsed.ingredients : initialIngredients
    const rawMenu = Array.isArray(parsed.menu) ? parsed.menu : menuItems
    return {
      ingredients: rawIngredients.map((ingredient) => ({
        ...ingredient,
        image:
          typeof ingredient.image === 'string' && ingredient.image.startsWith('http')
            ? DEFAULT_INGREDIENT_IMAGE
            : ingredient.image || DEFAULT_INGREDIENT_IMAGE,
      })),
      menu: rawMenu.map((item) => ({
        ...item,
        image:
          typeof item.image === 'string' && item.image.startsWith('http')
            ? DEFAULT_PRODUCT_IMAGE
            : item.image || DEFAULT_PRODUCT_IMAGE,
      })),
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    }
  } catch (error) {
    return {
      ingredients: initialIngredients,
      menu: menuItems,
      orders: [],
    }
  }
}

function saveState(nextState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(nextState))
}

function formatDate(isoDate) {
  return new Date(isoDate).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function App() {
  const [state, setState] = useState(loadState)
  const [notice, setNotice] = useState('')
  const [page, setPage] = useState('menu')
  const [selectedItem, setSelectedItem] = useState(null)
  const [modalType, setModalType] = useState(null)
  const [modalError, setModalError] = useState('')
  const [thresholdIngredientId, setThresholdIngredientId] = useState('')
  const [thresholdValue, setThresholdValue] = useState('')
  const [productForm, setProductForm] = useState({
    name: '',
    price: '',
    image: '',
    recipeRows: [{ ingredientId: '', amount: '' }],
  })
  const [ingredientForm, setIngredientForm] = useState({
    name: '',
    unit: 'г',
    stock: '',
    lowThreshold: '',
    image: '',
  })
  const [topUpForm, setTopUpForm] = useState({ ingredientId: '', amount: '' })

  const ingredientMap = useMemo(() => {
    return state.ingredients.reduce((acc, ingredient) => {
      acc[ingredient.id] = ingredient
      return acc
    }, {})
  }, [state.ingredients])

  // We calculate by the limiting ingredient: minimum possible portions from recipe.
  function getCanMakeCount(item, ingredientsById) {
    const counts = item.recipe.map((recipePart) => {
      const ingredient = ingredientsById[recipePart.ingredientId]
      if (!ingredient) return 0
      return Math.floor(ingredient.stock / recipePart.amount)
    })
    return Math.min(...counts)
  }

  const menuWithAvailability = useMemo(() => {
    return state.menu.map((item) => {
      const canMake = getCanMakeCount(item, ingredientMap)
      return { ...item, canMake }
    })
  }, [state.menu, ingredientMap])

  const lowStockWarnings = useMemo(() => {
    return state.ingredients.filter((ingredient) => ingredient.stock <= ingredient.lowThreshold)
  }, [state.ingredients])

  function openModal(type) {
    setModalType(type)
    setModalError('')
  }

  function closeModal() {
    setModalType(null)
    setModalError('')
  }

  function createOrder(item) {
    const missing = item.recipe
      .map((part) => {
        const ingredient = ingredientMap[part.ingredientId]
        if (!ingredient || ingredient.stock < part.amount) {
          const deficit = ingredient ? part.amount - ingredient.stock : part.amount
          return `${ingredient?.name ?? part.ingredientId} (не хватает ${deficit})`
        }
        return null
      })
      .filter(Boolean)

    if (missing.length > 0) {
      setNotice(`Нельзя приготовить "${item.name}". Не хватает: ${missing.join(', ')}`)
      return
    }

    const updatedIngredients = state.ingredients.map((ingredient) => {
      const recipePart = item.recipe.find((part) => part.ingredientId === ingredient.id)
      if (!recipePart) return ingredient
      return { ...ingredient, stock: ingredient.stock - recipePart.amount }
    })

    const nextOrder = {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      itemId: item.id,
      itemName: item.name,
      createdAt: new Date().toISOString(),
    }

    const nextState = {
      ingredients: updatedIngredients,
      menu: state.menu,
      orders: [nextOrder, ...state.orders].slice(0, 20),
    }

    setState(nextState)
    saveState(nextState)
    setNotice(`Заказ сохранен: ${item.name}. Ингредиенты списаны.`)
  }

  function handleAddIngredient(event) {
    event.preventDefault()
    if (
      !ingredientForm.name.trim() ||
      !ingredientForm.unit.trim() ||
      ingredientForm.stock === '' ||
      ingredientForm.lowThreshold === ''
    ) {
      setModalError('Заполните название, единицу, остаток и порог.')
      return
    }

    const stock = Number(ingredientForm.stock)
    const threshold = Number(ingredientForm.lowThreshold)
    if (Number.isNaN(stock) || Number.isNaN(threshold)) {
      setModalError('Остаток и порог должны быть числами.')
      return
    }

    const ingredient = {
      id: `${ingredientForm.name.trim().toLowerCase().replaceAll(' ', '_')}_${Date.now()}`,
      name: ingredientForm.name.trim(),
      unit: ingredientForm.unit.trim(),
      stock,
      lowThreshold: threshold,
      image: ingredientForm.image.trim() || DEFAULT_INGREDIENT_IMAGE,
    }

    const nextState = {
      ...state,
      ingredients: [...state.ingredients, ingredient],
    }
    setState(nextState)
    saveState(nextState)
    setNotice(`Ингредиент "${ingredient.name}" добавлен.`)
    setIngredientForm({ name: '', unit: 'г', stock: '', lowThreshold: '', image: '' })
    closeModal()
  }

  function handleTopUp(event) {
    event.preventDefault()
    const amount = Number(topUpForm.amount)
    if (!topUpForm.ingredientId || topUpForm.amount === '') {
      setModalError('Выберите ингредиент и укажите количество.')
      return
    }
    if (Number.isNaN(amount) || amount <= 0) {
      setModalError('Количество для закупки должно быть больше нуля.')
      return
    }

    const updatedIngredients = state.ingredients.map((ingredient) => {
      if (ingredient.id !== topUpForm.ingredientId) return ingredient
      return { ...ingredient, stock: ingredient.stock + amount }
    })

    const nextState = { ...state, ingredients: updatedIngredients }
    setState(nextState)
    saveState(nextState)
    const ingredientName = ingredientMap[topUpForm.ingredientId]?.name ?? 'ингредиент'
    setNotice(`Закупка выполнена: +${amount} к "${ingredientName}".`)
    setTopUpForm({ ingredientId: '', amount: '' })
    closeModal()
  }

  function updateRecipeRow(index, field, value) {
    setProductForm((prev) => ({
      ...prev,
      recipeRows: prev.recipeRows.map((row, rowIndex) => {
        if (rowIndex !== index) return row
        return { ...row, [field]: value }
      }),
    }))
  }

  function addRecipeRow() {
    setProductForm((prev) => ({
      ...prev,
      recipeRows: [...prev.recipeRows, { ingredientId: '', amount: '' }],
    }))
  }

  function handleAddProduct(event) {
    event.preventDefault()
    if (!productForm.name.trim() || productForm.price === '') {
      setModalError('Заполните название и цену товара.')
      return
    }
    const price = Number(productForm.price)
    if (Number.isNaN(price) || price < 0) {
      setModalError('Цена должна быть положительным числом.')
      return
    }

    const recipe = productForm.recipeRows
      .map((row) => ({
        ingredientId: row.ingredientId,
        amount: Number(row.amount),
      }))
      .filter((row) => row.ingredientId && !Number.isNaN(row.amount) && row.amount > 0)

    if (recipe.length === 0) {
      setModalError('Добавьте хотя бы один ингредиент в рецепт.')
      return
    }

    const product = {
      id: `${productForm.name.trim().toLowerCase().replaceAll(' ', '_')}_${Date.now()}`,
      name: productForm.name.trim(),
      price,
      image: productForm.image.trim() || DEFAULT_PRODUCT_IMAGE,
      recipe,
    }

    const nextState = {
      ...state,
      menu: [...state.menu, product],
    }
    setState(nextState)
    saveState(nextState)
    setNotice(`Товар "${product.name}" добавлен в меню.`)
    setProductForm({
      name: '',
      price: '',
      image: '',
      recipeRows: [{ ingredientId: '', amount: '' }],
    })
    closeModal()
  }

  function openThresholdModal(ingredient) {
    setThresholdIngredientId(ingredient.id)
    setThresholdValue(String(ingredient.lowThreshold))
    openModal('threshold')
  }

  function handleUpdateThreshold(event) {
    event.preventDefault()
    if (!thresholdIngredientId || thresholdValue === '') {
      setModalError('Укажите новый порог.')
      return
    }
    const nextThreshold = Number(thresholdValue)
    if (Number.isNaN(nextThreshold) || nextThreshold < 0) {
      setModalError('Порог должен быть неотрицательным числом.')
      return
    }

    const updatedIngredients = state.ingredients.map((ingredient) => {
      if (ingredient.id !== thresholdIngredientId) return ingredient
      return { ...ingredient, lowThreshold: nextThreshold }
    })

    const nextState = { ...state, ingredients: updatedIngredients }
    setState(nextState)
    saveState(nextState)
    setNotice('Порог предупреждения обновлен.')
    closeModal()
  }

  return (
    <main className="app">
      <section className={page === 'ingredients' ? 'left-panel full-width' : 'left-panel'}>
        <header className="page-header">
          <h1>ERP Coffee V3</h1>
          <p>Товары и ингредиенты на отдельных страницах. Все изменения сохраняются локально.</p>
          <div className="nav-row">
            <button type="button" className={page === 'menu' ? 'tab-btn active' : 'tab-btn'} onClick={() => setPage('menu')}>
              Страница товаров
            </button>
            <button
              type="button"
              className={page === 'ingredients' ? 'tab-btn active' : 'tab-btn'}
              onClick={() => setPage('ingredients')}
            >
              Страница ингредиентов
            </button>
          </div>
        </header>

        {notice && <div className="notice">{notice}</div>}

        {page === 'menu' ? (
          <>
            <section className="panel-block">
              <h3>Управление товарами</h3>
              <button type="button" onClick={() => openModal('product')}>
                Добавить товар
              </button>
            </section>

            <div className="menu-grid">
              {menuWithAvailability.map((item) => (
                <article key={item.id} className="menu-card">
                  <img src={item.image} alt={item.name} className="menu-image" />
                  <div className="menu-card-body">
                    <h2>{item.name}</h2>
                    <p>{item.price} ₽</p>
                    <p className="can-make">
                      Можно приготовить: <strong>{item.canMake}</strong>
                    </p>
                    <div className="card-actions">
                      <button type="button" disabled={item.canMake <= 0} onClick={() => createOrder(item)}>
                        {item.canMake > 0 ? 'Приготовить' : 'Недостаточно ингредиентов'}
                      </button>
                      <button type="button" className="secondary-btn" onClick={() => setSelectedItem(item)}>
                        Рецепт
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </>
        ) : (
          <>
            <div className="ingredients-layout">
              <div className="menu-grid">
                {state.ingredients.map((ingredient) => (
                  <article key={ingredient.id} className="menu-card">
                    <img
                      src={ingredient.image || DEFAULT_INGREDIENT_IMAGE}
                      alt={ingredient.name}
                      className="menu-image"
                    />
                    <div className="menu-card-body">
                      <h2>{ingredient.name}</h2>
                      <p>
                        Остаток: {ingredient.stock} {ingredient.unit}
                      </p>
                      <p className={ingredient.stock <= ingredient.lowThreshold ? 'warning-text' : 'ok-status'}>
                        Порог: {ingredient.lowThreshold} {ingredient.unit}
                      </p>
                      <button
                        type="button"
                        className="secondary-btn threshold-btn"
                        onClick={() => openThresholdModal(ingredient)}
                      >
                        Изменить порог
                      </button>
                    </div>
                  </article>
                ))}
              </div>

              <aside className="right-panel">
                <section className="panel-block">
                  <h3>Управление ингредиентами</h3>
                  <div className="ingredients-actions">
                    <button type="button" onClick={() => openModal('ingredient')}>
                      Добавить ингредиент
                    </button>
                    <button type="button" onClick={() => openModal('topup')}>
                      Открыть закупку
                    </button>
                  </div>
                </section>
              </aside>
            </div>
          </>
        )}
      </section>

      {page === 'menu' && (
        <aside className="right-panel">
          <section className="panel-block">
            <h3>Остатки ингредиентов</h3>
            <ul className="plain-list">
              {state.ingredients.map((ingredient) => (
                <li key={ingredient.id}>
                  <span>{ingredient.name}</span>
                  <strong>
                    {ingredient.stock} {ingredient.unit}
                  </strong>
                </li>
              ))}
            </ul>
          </section>

          <section className="panel-block">
            <h3>Предупреждения</h3>
            {lowStockWarnings.length === 0 ? (
              <p className="ok-status">Все ингредиенты в норме.</p>
            ) : (
              <ul className="plain-list warning-list">
                {lowStockWarnings.map((ingredient) => (
                  <li key={ingredient.id}>
                    <span>{ingredient.name}</span>
                    <strong>
                      осталось {ingredient.stock} {ingredient.unit}
                    </strong>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className="panel-block">
            <h3>Последние заказы</h3>
            {state.orders.length === 0 ? (
              <p>Пока заказов нет.</p>
            ) : (
              <ul className="plain-list order-list">
                {state.orders.slice(0, 8).map((order) => (
                  <li key={order.id}>
                    <span>{order.itemName}</span>
                    <small>{formatDate(order.createdAt)}</small>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </aside>
      )}

      {selectedItem && (
        <div className="modal-backdrop" onClick={() => setSelectedItem(null)}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            <h3>Рецепт: {selectedItem.name}</h3>
            <ul className="plain-list">
              {selectedItem.recipe.map((part) => (
                <li key={`${selectedItem.id}-${part.ingredientId}`}>
                  <span>{ingredientMap[part.ingredientId]?.name ?? part.ingredientId}</span>
                  <strong>
                    {part.amount} {ingredientMap[part.ingredientId]?.unit ?? ''}
                  </strong>
                </li>
              ))}
            </ul>
            <button type="button" onClick={() => setSelectedItem(null)}>
              Закрыть
            </button>
          </div>
        </div>
      )}

      {modalType && (
        <div className="modal-backdrop" onClick={closeModal}>
          <div className="modal" onClick={(event) => event.stopPropagation()}>
            {modalType === 'product' && (
              <>
                <h3>Добавить товар</h3>
                <form className="form-grid" onSubmit={handleAddProduct}>
                  <input
                    placeholder="Название товара"
                    value={productForm.name}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <input
                    type="number"
                    placeholder="Цена"
                    value={productForm.price}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, price: event.target.value }))}
                  />
                  <input
                    placeholder="Путь к картинке (по умолчанию локальная)"
                    value={productForm.image}
                    onChange={(event) => setProductForm((prev) => ({ ...prev, image: event.target.value }))}
                  />

                  <div className="recipe-editor">
                    <p>Рецепт товара:</p>
                    {productForm.recipeRows.map((row, index) => (
                      <div key={`recipe-${index}`} className="recipe-row">
                        <select
                          value={row.ingredientId}
                          onChange={(event) => updateRecipeRow(index, 'ingredientId', event.target.value)}
                        >
                          <option value="">Выберите ингредиент</option>
                          {state.ingredients.map((ingredient) => (
                            <option key={ingredient.id} value={ingredient.id}>
                              {ingredient.name}
                            </option>
                          ))}
                        </select>
                        <input
                          type="number"
                          placeholder="Количество"
                          value={row.amount}
                          onChange={(event) => updateRecipeRow(index, 'amount', event.target.value)}
                        />
                      </div>
                    ))}
                    <button type="button" className="secondary-btn" onClick={addRecipeRow}>
                      Добавить строку рецепта
                    </button>
                  </div>
                  {modalError && <p className="warning-text">{modalError}</p>}
                  <button type="submit">Сохранить товар</button>
                </form>
              </>
            )}

            {modalType === 'ingredient' && (
              <>
                <h3>Добавить ингредиент</h3>
                <form className="form-grid" onSubmit={handleAddIngredient}>
                  <input
                    placeholder="Название"
                    value={ingredientForm.name}
                    onChange={(event) => setIngredientForm((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <input
                    placeholder="Единица (г, мл, шт...)"
                    value={ingredientForm.unit}
                    onChange={(event) => setIngredientForm((prev) => ({ ...prev, unit: event.target.value }))}
                  />
                  <input
                    type="number"
                    placeholder="Начальный остаток"
                    value={ingredientForm.stock}
                    onChange={(event) => setIngredientForm((prev) => ({ ...prev, stock: event.target.value }))}
                  />
                  <input
                    type="number"
                    placeholder="Порог предупреждения"
                    value={ingredientForm.lowThreshold}
                    onChange={(event) =>
                      setIngredientForm((prev) => ({ ...prev, lowThreshold: event.target.value }))
                    }
                  />
                  <input
                    placeholder="Путь к картинке (по умолчанию локальная)"
                    value={ingredientForm.image}
                    onChange={(event) => setIngredientForm((prev) => ({ ...prev, image: event.target.value }))}
                  />
                  {modalError && <p className="warning-text">{modalError}</p>}
                  <button type="submit">Сохранить ингредиент</button>
                </form>
              </>
            )}

            {modalType === 'topup' && (
              <>
                <h3>Докупка ингредиента</h3>
                <form className="form-grid" onSubmit={handleTopUp}>
                  <select
                    value={topUpForm.ingredientId}
                    onChange={(event) => setTopUpForm((prev) => ({ ...prev, ingredientId: event.target.value }))}
                  >
                    <option value="">Выберите ингредиент</option>
                    {state.ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="number"
                    placeholder="Сколько докупили"
                    value={topUpForm.amount}
                    onChange={(event) => setTopUpForm((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                  {modalError && <p className="warning-text">{modalError}</p>}
                  <button type="submit">Сохранить закупку</button>
                </form>
              </>
            )}

            {modalType === 'threshold' && (
              <>
                <h3>Изменить порог предупреждения</h3>
                <form className="form-grid" onSubmit={handleUpdateThreshold}>
                  <input
                    type="number"
                    placeholder="Новый порог"
                    value={thresholdValue}
                    onChange={(event) => setThresholdValue(event.target.value)}
                  />
                  {modalError && <p className="warning-text">{modalError}</p>}
                  <button type="submit">Сохранить порог</button>
                </form>
              </>
            )}

            <button type="button" className="secondary-btn" onClick={closeModal}>
              Закрыть
            </button>
          </div>
        </div>
      )}
    </main>
  )
}

export default App
