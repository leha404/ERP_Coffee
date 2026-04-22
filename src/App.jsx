import { useMemo, useState } from 'react'
import { initialIngredients, menuItems } from './data'

const STORAGE_KEY = 'erp-coffee-v2'
const DEFAULT_IMAGE =
  'https://images.unsplash.com/photo-1512568400610-62da28bc8a13?auto=format&fit=crop&w=800&q=80'

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
    return {
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : initialIngredients,
      menu: Array.isArray(parsed.menu) ? parsed.menu : menuItems,
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
  const [newIngredient, setNewIngredient] = useState({
    name: '',
    unit: 'г',
    stock: '',
    lowThreshold: '',
    image: '',
  })
  const [stockTopUp, setStockTopUp] = useState({ ingredientId: '', amount: '' })
  const [newProduct, setNewProduct] = useState({
    name: '',
    price: '',
    image: '',
    recipeRows: [{ ingredientId: '', amount: '' }],
  })

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
    if (!newIngredient.name.trim() || !newIngredient.unit.trim()) return

    const stock = Number(newIngredient.stock)
    const threshold = Number(newIngredient.lowThreshold)
    if (Number.isNaN(stock) || Number.isNaN(threshold)) return

    const ingredient = {
      id: `${newIngredient.name.trim().toLowerCase().replaceAll(' ', '_')}_${Date.now()}`,
      name: newIngredient.name.trim(),
      unit: newIngredient.unit.trim(),
      stock,
      lowThreshold: threshold,
      image: newIngredient.image.trim() || DEFAULT_IMAGE,
    }

    const nextState = {
      ...state,
      ingredients: [...state.ingredients, ingredient],
    }
    setState(nextState)
    saveState(nextState)
    setNotice(`Ингредиент "${ingredient.name}" добавлен.`)
    setNewIngredient({ name: '', unit: 'г', stock: '', lowThreshold: '', image: '' })
  }

  function handleTopUp(event) {
    event.preventDefault()
    const amount = Number(stockTopUp.amount)
    if (!stockTopUp.ingredientId || Number.isNaN(amount) || amount <= 0) return

    const updatedIngredients = state.ingredients.map((ingredient) => {
      if (ingredient.id !== stockTopUp.ingredientId) return ingredient
      return { ...ingredient, stock: ingredient.stock + amount }
    })

    const nextState = { ...state, ingredients: updatedIngredients }
    setState(nextState)
    saveState(nextState)
    const ingredientName = ingredientMap[stockTopUp.ingredientId]?.name ?? 'ингредиент'
    setNotice(`Закупка выполнена: +${amount} к "${ingredientName}".`)
    setStockTopUp({ ingredientId: '', amount: '' })
  }

  function updateRecipeRow(index, field, value) {
    setNewProduct((prev) => ({
      ...prev,
      recipeRows: prev.recipeRows.map((row, rowIndex) => {
        if (rowIndex !== index) return row
        return { ...row, [field]: value }
      }),
    }))
  }

  function addRecipeRow() {
    setNewProduct((prev) => ({
      ...prev,
      recipeRows: [...prev.recipeRows, { ingredientId: '', amount: '' }],
    }))
  }

  function handleAddProduct(event) {
    event.preventDefault()
    if (!newProduct.name.trim()) return
    const price = Number(newProduct.price)
    if (Number.isNaN(price)) return

    const recipe = newProduct.recipeRows
      .map((row) => ({
        ingredientId: row.ingredientId,
        amount: Number(row.amount),
      }))
      .filter((row) => row.ingredientId && !Number.isNaN(row.amount) && row.amount > 0)

    if (recipe.length === 0) return

    const product = {
      id: `${newProduct.name.trim().toLowerCase().replaceAll(' ', '_')}_${Date.now()}`,
      name: newProduct.name.trim(),
      price,
      image: newProduct.image.trim() || DEFAULT_IMAGE,
      recipe,
    }

    const nextState = {
      ...state,
      menu: [...state.menu, product],
    }
    setState(nextState)
    saveState(nextState)
    setNotice(`Товар "${product.name}" добавлен в меню.`)
    setNewProduct({
      name: '',
      price: '',
      image: '',
      recipeRows: [{ ingredientId: '', amount: '' }],
    })
  }

  return (
    <main className="app">
      <section className="left-panel full-width">
        <header className="page-header">
          <h1>ERP Coffee V2</h1>
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

            <section className="panel-block">
              <h3>Добавить новый товар</h3>
              <form className="form-grid" onSubmit={handleAddProduct}>
                <input
                  placeholder="Название товара"
                  value={newProduct.name}
                  onChange={(event) => setNewProduct((prev) => ({ ...prev, name: event.target.value }))}
                />
                <input
                  type="number"
                  placeholder="Цена"
                  value={newProduct.price}
                  onChange={(event) => setNewProduct((prev) => ({ ...prev, price: event.target.value }))}
                />
                <input
                  placeholder="Ссылка на картинку (URL)"
                  value={newProduct.image}
                  onChange={(event) => setNewProduct((prev) => ({ ...prev, image: event.target.value }))}
                />

                <div className="recipe-editor">
                  <p>Рецепт товара:</p>
                  {newProduct.recipeRows.map((row, index) => (
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

                <button type="submit">Добавить товар</button>
              </form>
            </section>
          </>
        ) : (
          <>
            <div className="menu-grid">
              {state.ingredients.map((ingredient) => (
                <article key={ingredient.id} className="menu-card">
                  <img src={ingredient.image || DEFAULT_IMAGE} alt={ingredient.name} className="menu-image" />
                  <div className="menu-card-body">
                    <h2>{ingredient.name}</h2>
                    <p>
                      Остаток: {ingredient.stock} {ingredient.unit}
                    </p>
                    <p className={ingredient.stock <= ingredient.lowThreshold ? 'warning-text' : 'ok-status'}>
                      Порог: {ingredient.lowThreshold} {ingredient.unit}
                    </p>
                  </div>
                </article>
              ))}
            </div>

            <section className="panel-block two-cols">
              <div>
                <h3>Добавить ингредиент</h3>
                <form className="form-grid" onSubmit={handleAddIngredient}>
                  <input
                    placeholder="Название"
                    value={newIngredient.name}
                    onChange={(event) => setNewIngredient((prev) => ({ ...prev, name: event.target.value }))}
                  />
                  <input
                    placeholder="Единица (г, мл, шт...)"
                    value={newIngredient.unit}
                    onChange={(event) => setNewIngredient((prev) => ({ ...prev, unit: event.target.value }))}
                  />
                  <input
                    type="number"
                    placeholder="Начальный остаток"
                    value={newIngredient.stock}
                    onChange={(event) => setNewIngredient((prev) => ({ ...prev, stock: event.target.value }))}
                  />
                  <input
                    type="number"
                    placeholder="Порог предупреждения"
                    value={newIngredient.lowThreshold}
                    onChange={(event) =>
                      setNewIngredient((prev) => ({ ...prev, lowThreshold: event.target.value }))
                    }
                  />
                  <input
                    placeholder="Ссылка на картинку (URL)"
                    value={newIngredient.image}
                    onChange={(event) => setNewIngredient((prev) => ({ ...prev, image: event.target.value }))}
                  />
                  <button type="submit">Добавить ингредиент</button>
                </form>
              </div>

              <div>
                <h3>Докупка ингредиента</h3>
                <form className="form-grid" onSubmit={handleTopUp}>
                  <select
                    value={stockTopUp.ingredientId}
                    onChange={(event) => setStockTopUp((prev) => ({ ...prev, ingredientId: event.target.value }))}
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
                    value={stockTopUp.amount}
                    onChange={(event) => setStockTopUp((prev) => ({ ...prev, amount: event.target.value }))}
                  />
                  <button type="submit">Сохранить закупку</button>
                </form>
              </div>
            </section>
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
    </main>
  )
}

export default App
