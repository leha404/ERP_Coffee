export const initialIngredients = [
  {
    id: 'coffee_beans',
    name: 'Кофейные зерна',
    unit: 'г',
    stock: 1200,
    lowThreshold: 250,
    image: '/images/ingredient-stock.svg',
  },
  {
    id: 'milk',
    name: 'Молоко',
    unit: 'мл',
    stock: 5000,
    lowThreshold: 1200,
    image: '/images/ingredient-stock.svg',
  },
  {
    id: 'water',
    name: 'Вода',
    unit: 'мл',
    stock: 12000,
    lowThreshold: 2500,
    image: '/images/ingredient-stock.svg',
  },
  {
    id: 'cups',
    name: 'Стаканы 300мл',
    unit: 'шт',
    stock: 120,
    lowThreshold: 20,
    image: '/images/ingredient-stock.svg',
  },
  {
    id: 'sugar',
    name: 'Сахар',
    unit: 'г',
    stock: 2500,
    lowThreshold: 400,
    image: '/images/ingredient-stock.svg',
  },
]

export const menuItems = [
  {
    id: 'latte',
    name: 'Латте',
    price: 220,
    image: '/images/drink-coffee.svg',
    recipe: [
      { ingredientId: 'coffee_beans', amount: 18 },
      { ingredientId: 'milk', amount: 180 },
      { ingredientId: 'water', amount: 30 },
      { ingredientId: 'cups', amount: 1 },
    ],
  },
  {
    id: 'cappuccino',
    name: 'Капучино',
    price: 210,
    image: '/images/drink-coffee.svg',
    recipe: [
      { ingredientId: 'coffee_beans', amount: 18 },
      { ingredientId: 'milk', amount: 140 },
      { ingredientId: 'water', amount: 30 },
      { ingredientId: 'cups', amount: 1 },
    ],
  },
  {
    id: 'americano',
    name: 'Американо',
    price: 170,
    image: '/images/drink-coffee.svg',
    recipe: [
      { ingredientId: 'coffee_beans', amount: 16 },
      { ingredientId: 'water', amount: 220 },
      { ingredientId: 'cups', amount: 1 },
    ],
  },
  {
    id: 'flat_white',
    name: 'Флэт Уайт',
    price: 230,
    image: '/images/drink-coffee.svg',
    recipe: [
      { ingredientId: 'coffee_beans', amount: 20 },
      { ingredientId: 'milk', amount: 120 },
      { ingredientId: 'water', amount: 30 },
      { ingredientId: 'cups', amount: 1 },
    ],
  },
]
