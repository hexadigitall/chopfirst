import { Pool } from 'pg';
import { logger } from './logger';

let idCounter = 0;
function id(): string {
  return `id_${++idCounter}`;
}

export async function seed(db: Pool): Promise<void> {
  await db.query('DELETE FROM transactions');
  await db.query('DELETE FROM order_items');
  await db.query('DELETE FROM orders');
  await db.query('DELETE FROM tasks');
  await db.query('DELETE FROM menu_items');
  await db.query('DELETE FROM merchants');
  await db.query('DELETE FROM users');
  await db.query('DELETE FROM tier_limits');

  const tiers = [
    { tier: 'UNVERIFIED', max_subsidy: 2500, window_days: 7, min_cycles: 0, credit_cap: 5000 },
    { tier: 'VERIFIED', max_subsidy: 10000, window_days: 14, min_cycles: 20, credit_cap: 30000 },
    { tier: 'TRUSTED', max_subsidy: 15000, window_days: 14, min_cycles: 30, credit_cap: 50000 },
    { tier: 'ADVANCED', max_subsidy: 20000, window_days: 14, min_cycles: 40, credit_cap: 100000 },
    { tier: 'COMMUNITY', max_subsidy: 25000, window_days: 14, min_cycles: 50, credit_cap: 150000 },
  ];
  for (const t of tiers) {
    await db.query('INSERT INTO tier_limits VALUES ($1,$2,$3,$4,$5)', [t.tier, t.max_subsidy, t.window_days, t.min_cycles, t.credit_cap]);
  }

  const users = [
    { phone: '+2348010000001', name: 'Chidi Okonkwo', tier: 'UNVERIFIED', status: 'ACTIVE', cycles: 12, outstanding: 0, total: 1500, wallet: '0x0000000000000000000000000000000000000001', kind: 10 },
    { phone: '+2348010000002', name: 'Amina Bello', tier: 'VERIFIED', status: 'ACTIVE', cycles: 25, outstanding: 1050, total: 8500, wallet: '0x0000000000000000000000000000000000000002', kind: 45 },
    { phone: '+2348010000003', name: 'Femi Adeyemi', tier: 'ADVANCED', status: 'ACTIVE', cycles: 45, outstanding: 0, total: 22000, wallet: '0x0000000000000000000000000000000000000003', kind: 120 },
    { phone: '+2348010000004', name: 'Nkechi Eze', tier: 'UNVERIFIED', status: 'ACTIVE', cycles: 15, outstanding: 4800, total: 7200, wallet: '0x0000000000000000000000000000000000000004', kind: 10 },
    { phone: '+2348010000005', name: 'Tunde Bakare', tier: 'VERIFIED', status: 'ACTIVE', cycles: 22, outstanding: 500, total: 6200, wallet: '0x0000000000000000000000000000000000000005', kind: 30 },
  ].map(u => ({ ...u, id: id() }));
  for (const u of users) {
    await db.query(
      'INSERT INTO users (id,phone,name,tier,status,clean_cycles,outstanding_balance,total_subsidized,wallet_address,kind_balance) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [u.id, u.phone, u.name, u.tier, u.status, u.cycles, u.outstanding, u.total, u.wallet, u.kind]
    );
  }

  const merchants = [
    { name: 'Mama Put Kitchen', location: 'Yaba, Lagos', items: [
      { name: 'Jollof Rice & Chicken', desc: 'Smoky party jollof with grilled chicken', price: 2500, cat: 'Meal' },
      { name: 'Egusi Soup & Pounded Yam', desc: 'Rich melon seed soup with fluffy pounded yam', price: 2800, cat: 'Meal' },
      { name: 'Fried Rice & Plantain', desc: 'Fried rice with sweet plantain & coleslaw', price: 2200, cat: 'Meal' },
      { name: 'Pepper Soup & Bread', desc: 'Spiced fish pepper soup with agege bread', price: 1800, cat: 'Soup' },
      { name: 'Extra Grilled Chicken', desc: 'Single grilled chicken thigh', price: 1200, cat: 'Protein' },
      { name: 'Extra Fried Plantain (Dodo)', desc: 'Crispy fried plantain slices', price: 500, cat: 'Snack' },
      { name: 'Small Chops Mix', desc: 'Spring rolls, samosas & puff-puff', price: 800, cat: 'Snack' },
      { name: 'Chilled Zobo', desc: 'Hibiscus zobo drink with ginger & cloves', price: 400, cat: 'Drink' },
      { name: 'Fruit Juice', desc: 'Chilled mixed fruit juice', price: 600, cat: 'Drink' },
      { name: 'Malt Drink', desc: 'Non-alcoholic malt beverage', price: 350, cat: 'Drink' },
    ]},
    { name: 'Buka Bistro', location: 'Surulere, Lagos', items: [
      { name: 'Eba & Vegetable Soup', desc: 'Garri with assorted meat & green veg', price: 2700, cat: 'Meal' },
      { name: 'Yam Porridge (Asaro)', desc: 'Boiled yam in pepper-tomato sauce', price: 2000, cat: 'Meal' },
      { name: 'Grilled Fish & Chips', desc: 'Tilapia with crispy fries & tartar', price: 3200, cat: 'Meal' },
      { name: 'Moi Moi & Pap', desc: 'Bean pudding with fermented corn custard', price: 1500, cat: 'Breakfast' },
      { name: 'Beef Stew Side', desc: 'Rich tomato & beef stew', price: 700, cat: 'Protein' },
      { name: 'Boiled Egg (2)', desc: 'Two boiled eggs with pepper sauce', price: 400, cat: 'Protein' },
      { name: 'Akara (Bean Cake)', desc: 'Deep-fried bean cakes — 5 pieces', price: 500, cat: 'Snack' },
      { name: 'Puff-Puff (6)', desc: 'Fluffy deep-fried dough balls', price: 600, cat: 'Snack' },
      { name: 'Kunun Aya', desc: 'Chilled tiger nut milk drink', price: 400, cat: 'Drink' },
      { name: 'Smoothie', desc: 'Banana & peanut tiger nut smoothie', price: 800, cat: 'Drink' },
    ]},
    { name: 'Suya Spot', location: 'Ikeja, Lagos', items: [
      { name: 'Beef Suya & Onions', desc: 'Spiced grilled beef with fresh onions & spice', price: 2000, cat: 'Meal' },
      { name: 'Chicken Suya & Chips', desc: 'Spicy grilled chicken with chips', price: 2500, cat: 'Meal' },
      { name: 'Goat Meat Suya', desc: 'Spiced grilled goat meat — stick of 10', price: 3000, cat: 'Meal' },
      { name: 'Extra Suya Stick', desc: 'Single stick of beef suya', price: 500, cat: 'Protein' },
      { name: 'Yam Chips', desc: 'Deep-fried yam chips with pepper', price: 600, cat: 'Snack' },
      { name: 'Groundnut Cake', desc: 'Kuli-kuli — spicy peanut snack', price: 300, cat: 'Snack' },
      { name: 'Zobo Drink', desc: 'Chilled hibiscus drink with ginger', price: 500, cat: 'Drink' },
      { name: 'Chapman Mocktail', desc: 'Classic Nigerian mocktail', price: 1000, cat: 'Drink' },
      { name: 'Fura da Nono', desc: 'Millet fermented milk drink', price: 700, cat: 'Drink' },
    ]},
  ].map(m => ({ ...m, id: id() }));
  for (const m of merchants) {
    await db.query(
      'INSERT INTO merchants (id,name,location,is_active,total_prepaid,total_revenue) VALUES ($1,$2,$3,1,$4,$5)',
      [m.id, m.name, m.location, Math.floor(Math.random() * 120) + 30, m.items.reduce((s, i) => s + i.price * (Math.floor(Math.random() * 50) + 10), 0)]
    );
    for (const item of m.items) {
      await db.query(
        'INSERT INTO menu_items (id,merchant_id,name,description,price,category) VALUES ($1,$2,$3,$4,$5,$6)',
        [id(), m.id, item.name, item.desc, item.price, item.cat]
      );
    }
  }

  const taskDefs = [
    { title: 'Flyer Distribution', desc: 'Distribute 100 Chop First flyers around your local market area', cat: 'PLATFORM', credit: 1500, merchantIdx: null as number | null },
    { title: 'Storefront Cleanup', desc: 'Sweep and organize the storefront of a partner restaurant', cat: 'MERCHANT', credit: 2000, merchantIdx: 0 },
    { title: 'Community Meal Delivery', desc: 'Deliver pre-paid meals to elderly community members', cat: 'COMMUNITY', credit: 2500, merchantIdx: 1 },
    { title: 'Social Media Promotion', desc: 'Post about Chop First on your WhatsApp status and Twitter', cat: 'PLATFORM', credit: 1000, merchantIdx: null },
    { title: 'Market Survey', desc: 'Survey 20 people about their food spending habits', cat: 'PLATFORM', credit: 1800, merchantIdx: null },
    { title: 'Kitchen Assistant', desc: 'Help with vegetable washing and prep at a partner kitchen', cat: 'MERCHANT', credit: 2200, merchantIdx: 0 },
    { title: 'Shelf Stocking', desc: 'Help stock dry goods at a partner grocery store', cat: 'MERCHANT', credit: 2000, merchantIdx: 2 },
  ];
  for (const t of taskDefs) {
    await db.query(
      "INSERT INTO tasks (id,title,description,category,credit_value,merchant_id,status) VALUES ($1,$2,$3,$4,$5,$6,'OPEN')",
      [id(), t.title, t.desc, t.cat, t.credit, t.merchantIdx !== null ? merchants[t.merchantIdx].id : null]
    );
  }

  const orderDefs = [
    { userId: 1, merchantIdx: 0, items: [{ name: 'Jollof Rice & Chicken', qty: 1, price: 2500 }], down: 1500, status: 'COMPLETED', daysAgo: 30 },
    { userId: 2, merchantIdx: 1, items: [{ name: 'Grilled Fish & Chips', qty: 1, price: 3200 }], down: 2000, status: 'COMPLETED', daysAgo: 20 },
    { userId: 2, merchantIdx: 0, items: [{ name: 'Egusi Soup & Pounded Yam', qty: 1, price: 2800 }], down: 2000, status: 'COMPLETED', daysAgo: 15 },
    { userId: 2, merchantIdx: 2, items: [{ name: 'Chicken Suya & Chips', qty: 1, price: 2500 }], down: 1500, status: 'COMPLETED', daysAgo: 10 },
    { userId: 2, merchantIdx: 1, items: [{ name: 'Yam Porridge (Asaro)', qty: 1, price: 2000 }], down: 2000, status: 'COMPLETED', daysAgo: 5 },
    { userId: 2, merchantIdx: 0, items: [{ name: 'Jollof Rice & Chicken', qty: 1, price: 2500 }], down: 1500, status: 'PREPAID', daysAgo: 2 },
    { userId: 4, merchantIdx: 2, items: [{ name: 'Beef Suya & Onions', qty: 2, price: 2000 }], down: 1000, status: 'PREPAID', daysAgo: 20 },
    { userId: 5, merchantIdx: 1, items: [{ name: 'Yam Porridge (Asaro)', qty: 1, price: 2000 }], down: 1500, status: 'PREPAID', daysAgo: 1 },
  ];

  const allMenuResult = await db.query('SELECT * FROM menu_items');
  const allMenuItems = allMenuResult.rows as any[];

  function datetime(daysOffset: number): string {
    const d = new Date();
    d.setDate(d.getDate() + daysOffset);
    return d.toISOString().replace('T', ' ').slice(0, 19);
  }

  for (const o of orderDefs) {
    const orderId = id();
    const merchant = merchants[o.merchantIdx];
    const total = o.items.reduce((s, i) => s + i.price * i.qty, 0);
    const fee = Math.round((total - o.down) * 0.10 * 100) / 100;
    const outstanding = total - o.down + fee;
    const createdAt = datetime(-o.daysAgo);
    const dueAt = datetime(-o.daysAgo + 14);
    const userId = users[o.userId - 1].id;

    await db.query(
      'INSERT INTO orders (id,user_id,merchant_id,total_cost,down_payment,outstanding,fee,status,created_at,due_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)',
      [orderId, userId, merchant.id, total, o.down, outstanding, fee, o.status, createdAt, dueAt]
    );

    for (const item of o.items) {
      const menuItem = allMenuItems.find((m: any) => m.name === item.name && m.merchant_id === merchant.id);
      if (menuItem) {
        await db.query(
          'INSERT INTO order_items (id,order_id,menu_item_id,quantity,unit_price) VALUES ($1,$2,$3,$4,$5)',
          [id(), orderId, menuItem.id, item.qty, item.price]
        );
      }
    }

    await db.query(
      'INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [id(), orderId, userId, merchant.id, o.down, 'DOWN_PAYMENT', 'COMPLETED', createdAt]
    );
    await db.query(
      'INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
      [id(), orderId, userId, merchant.id, outstanding - fee, 'SUBSIDY', 'COMPLETED', createdAt]
    );
    if (outstanding > 0) {
      await db.query(
        'INSERT INTO transactions (id,order_id,user_id,merchant_id,amount,type,status,created_at) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)',
        [id(), orderId, userId, merchant.id, fee, 'FEE', 'COMPLETED', createdAt]
      );
    }
  }

  logger.info({ users: users.length, merchants: merchants.length, menuItems: allMenuItems.length, tasks: taskDefs.length, orders: orderDefs.length }, 'Seed complete');
}
