import { useMemo, useState } from 'react'
import { initialIngredients, menuItems } from './data'

const STORAGE_KEY = 'erp-coffee-v1'

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) {
      return {
        ingredients: initialIngredients,
        orders: [],
      }
    }

    const parsed = JSON.parse(raw)
    return {
      ingredients: Array.isArray(parsed.ingredients) ? parsed.ingredients : initialIngredients,
      orders: Array.isArray(parsed.orders) ? parsed.orders : [],
    }
  } catch (error) {
    return {
      ingredients: initialIngredients,
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
    return menuItems.map((item) => {
      const canMake = getCanMakeCount(item, ingredientMap)
      return { ...item, canMake }
    })
  }, [ingredientMap])

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
      orders: [nextOrder, ...state.orders].slice(0, 20),
    }

    setState(nextState)
    saveState(nextState)
    setNotice(`Заказ сохранен: ${item.name}. Ингредиенты списаны.`)
  }

  return (
    <main className="app">
      <section className="left-panel">
        <header className="page-header">
          <h1>ERP Coffee V1</h1>
          <p>Выберите напиток: заказ сохранится, ингредиенты спишутся автоматически.</p>
        </header>

        {notice && <div className="notice">{notice}</div>}

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
                <button
                  type="button"
                  disabled={item.canMake <= 0}
                  onClick={() => createOrder(item)}
                >
                  {item.canMake > 0 ? 'Приготовить' : 'Недостаточно ингредиентов'}
                </button>
              </div>
            </article>
          ))}
        </div>
      </section>

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
    </main>
  )
}

export default App
