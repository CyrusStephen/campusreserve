import { prisma } from '../config/prisma.js'

const demoItems = [
  { name: 'Tea', description: 'Fresh campus canteen tea.', category: 'Hot drinks', pricePaise: 1200, options: ['With sugar', 'Without sugar'], sortOrder: 10 },
  { name: 'Coffee', description: 'Freshly prepared hot coffee.', category: 'Hot drinks', pricePaise: 1500, options: ['With sugar', 'Without sugar'], sortOrder: 20 },
  { name: 'Banana Fry', description: 'Kerala-style pazham pori.', category: 'Snacks', pricePaise: 1500, options: [], sortOrder: 30 },
  { name: 'Veg Puff', description: 'Flaky pastry with a vegetable filling.', category: 'Snacks', pricePaise: 2000, options: [], sortOrder: 40 },
  { name: 'Egg Puff', description: 'Flaky pastry with a seasoned egg filling.', category: 'Snacks', pricePaise: 2500, options: [], sortOrder: 50 },
  { name: 'Veg Cutlet', description: 'Crisp vegetable cutlet.', category: 'Snacks', pricePaise: 2000, options: [], sortOrder: 60 },
  { name: 'Lime Soda', description: 'Fresh lime with chilled soda.', category: 'Cold drinks', pricePaise: 3000, options: ['Sweet', 'Salt', 'Sweet and salt'], sortOrder: 70 },
  { name: 'Veg Meal', description: 'Rice with vegetarian curries and sides.', category: 'Meals', pricePaise: 7000, options: [], sortOrder: 80 },
  { name: 'Non-Veg Chicken Meal', description: 'Rice, chicken curry and seasonal sides.', category: 'Meals', pricePaise: 11000, options: [], sortOrder: 90 },
]

async function main() {
  for (const item of demoItems) {
    const existing = await prisma.canteenItem.findFirst({ where: { name: item.name } })
    if (existing) await prisma.canteenItem.update({ where: { id: existing.id }, data: item })
    else await prisma.canteenItem.create({ data: item })
  }
  console.log(`Canteen demo catalogue ready: ${demoItems.length} items.`)
}

main().catch((error: unknown) => {
  console.error(error)
  process.exitCode = 1
}).finally(() => prisma.$disconnect())
