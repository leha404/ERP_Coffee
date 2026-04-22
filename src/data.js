export const initialIngredients = [
  {
    id: 'coffee_beans',
    name: 'Кофейные зерна',
    unit: 'г',
    stock: 1200,
    lowThreshold: 250,
    image:
      'https://images.unsplash.com/photo-1447933601403-0c6688de566e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'milk',
    name: 'Молоко',
    unit: 'мл',
    stock: 5000,
    lowThreshold: 1200,
    image:
      'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'water',
    name: 'Вода',
    unit: 'мл',
    stock: 12000,
    lowThreshold: 2500,
    image:
      'https://images.unsplash.com/photo-1564417947365-8dbc9d0e718e?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'cups',
    name: 'Стаканы 300мл',
    unit: 'шт',
    stock: 120,
    lowThreshold: 20,
    image:
      'https://images.unsplash.com/photo-1470337458703-46ad1756a187?auto=format&fit=crop&w=800&q=80',
  },
  {
    id: 'sugar',
    name: 'Сахар',
    unit: 'г',
    stock: 2500,
    lowThreshold: 400,
    image:
      'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?auto=format&fit=crop&w=800&q=80',
  },
]

export const menuItems = [
  {
    id: 'latte',
    name: 'Латте',
    price: 220,
    image:
      'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=800&q=80',
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
    image:
      'https://images.unsplash.com/photo-1534778101976-62847782c213?auto=format&fit=crop&w=800&q=80',
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
    image:
      'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=800&q=80',
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
    image:
      'https://images.unsplash.com/photo-1511920170033-f8396924c348?auto=format&fit=crop&w=800&q=80',
    recipe: [
      { ingredientId: 'coffee_beans', amount: 20 },
      { ingredientId: 'milk', amount: 120 },
      { ingredientId: 'water', amount: 30 },
      { ingredientId: 'cups', amount: 1 },
    ],
  },
]
