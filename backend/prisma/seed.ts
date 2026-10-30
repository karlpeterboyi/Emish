import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';
import { EMISH_SERVICES, EMISH_SERVICE_CATEGORIES, EMISH_PRODUCTS } from './emish-catalog';

const prisma = new PrismaClient();

// High-quality free images (Unsplash) suitable for beauty catalog demos
const IMG = {
  serum: 'https://images.unsplash.com/photo-1611930022073-b7a4ba5fcccd?w=600&q=80',
  // fallbacks that load reliably:
  bottle: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=600&q=80',
  cream: 'https://images.unsplash.com/photo-1570194065650-d99fb4b38b17?w=600&q=80',
  oil: 'https://images.unsplash.com/photo-1608248543808-bfcc94cba46e?w=600&q=80',
  soap: 'https://images.unsplash.com/photo-1608571423902-eed4a5ad8108?w=600&q=80',
  hair: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=600&q=80',
  body: 'https://images.unsplash.com/photo-1608248597279-f99d160bfcbc?w=600&q=80',
  bundle: 'https://images.unsplash.com/photo-1596462502278-27bfdc403348?w=600&q=80',
  rose: 'https://images.unsplash.com/photo-1617897903246-719242758050?w=600&q=80',
  shampoo: 'https://images.unsplash.com/photo-1535585209827-a15fcdbc4c2d?w=600&q=80',
};

async function main() {
  console.log('🌱 Seeding Emish Beauty Spa (production-ready catalog)...');

  const skincare = await prisma.category.upsert({
    where: { slug: 'skincare' },
    update: { nameEn: 'Skincare', nameSw: 'Huduma ya Ngozi', description: 'Serums, creams & cleansers for African skin' },
    create: { slug: 'skincare', nameEn: 'Skincare', nameSw: 'Huduma ya Ngozi', description: 'Serums, creams & cleansers for African skin', sortOrder: 1 },
  });
  const haircare = await prisma.category.upsert({
    where: { slug: 'haircare' },
    update: {},
    create: { slug: 'haircare', nameEn: 'Hair Care', nameSw: 'Huduma ya Nywele', description: 'Oils, masks & treatments', sortOrder: 2 },
  });
  const body = await prisma.category.upsert({
    where: { slug: 'body' },
    update: {},
    create: { slug: 'body', nameEn: 'Body Care', nameSw: 'Huduma ya Mwili', sortOrder: 3 },
  });
  const bundles = await prisma.category.upsert({
    where: { slug: 'bundles' },
    update: {},
    create: { slug: 'bundles', nameEn: 'Bundles', nameSw: 'Vifurushi', sortOrder: 4 },
  });

  const products = [
    {
      slug: 'glow-serum-vitamin-c',
      nameEn: 'Glow Serum with Vitamin C',
      nameSw: "Serum ya Kung'aa na Vitamini C",
      descriptionEn:
        'Brightening serum with 15% Vitamin C and niacinamide. Formulated for African skin tones — reduces dark spots, boosts radiance, and protects against environmental stress. Lightweight, non-greasy, suitable for daily use in Tanzania’s climate.',
      descriptionSw:
        "Serum ya kung'aa iliyoundwa na 15% Vitamini C na niacinamide. Bora kwa rangi za ngozi za Kiafrika — hupunguza madoa meusi, huongeza mng'aro. Nyepesi, haifanyi shinikizo, inafaa kwa matumizi ya kila siku.",
      howToUseEn: 'Apply 3–4 drops morning and evening after cleansing. Follow with moisturizer. Use SPF during the day.',
      howToUseSw: 'Tumia matone 3–4 asubuhi na jioni baada ya kusafisha. Fuata na moisturizer. Tumia SPF mchana.',
      ingredients: 'Vitamin C (15%), Niacinamide, Hyaluronic Acid, Ferulic Acid, Aloe Vera',
      price: 45000,
      compareAtPrice: 55000,
      sku: 'NC-SER-VC15',
      stock: 40,
      categoryId: skincare.id,
      images: JSON.stringify([IMG.bottle, IMG.cream]),
      badge: 'Bestseller',
      rating: 4.9,
      reviewCount: 312,
      isFeatured: true,
    },
    {
      slug: 'shea-butter-hair-mask',
      nameEn: 'Shea Butter Hair Mask',
      nameSw: 'Maski ya Nywele ya Shea Butter',
      descriptionEn:
        'Deep conditioning mask rich in pure African shea butter and coconut oil. Restores moisture to dry, damaged, or natural hair. Ideal for 4C textures common across East Africa.',
      descriptionSw:
        'Maski ya kina yenye shea butter safi ya Kiafrika na mafuta ya nazi. Inarejesha unyevu kwa nywele kavu, zilizoharibiwa au asili. Bora kwa aina ya nywele 4C.',
      howToUseEn: 'Apply to clean damp hair. Leave 20–30 minutes (or overnight). Rinse thoroughly.',
      howToUseSw: 'Paka kwenye nywele safi zenye unyevu. Acha dakika 20–30. Osha vizuri.',
      ingredients: 'Shea Butter, Coconut Oil, Argan Oil, Honey, Vitamin E',
      price: 28000,
      sku: 'NC-HR-SHEA',
      stock: 55,
      categoryId: haircare.id,
      images: JSON.stringify([IMG.hair, IMG.oil]),
      rating: 4.8,
      reviewCount: 189,
      isFeatured: true,
    },
    {
      slug: 'turmeric-brightening-cream',
      nameEn: 'Turmeric Brightening Cream',
      nameSw: "Cream ya Kung'aa ya Manjano",
      descriptionEn:
        'Lightweight day cream with turmeric extract and licorice root. Evens skin tone and reduces hyperpigmentation without bleaching. Safe for everyday glow.',
      descriptionSw:
        'Cream nyepesi ya mchana yenye dondoo la manjano na mzizi wa licorice. Inasawazisha rangi ya ngozi bila kuweka rangi.',
      price: 32000,
      compareAtPrice: 38000,
      sku: 'NC-CRM-TUR',
      stock: 30,
      categoryId: skincare.id,
      images: JSON.stringify([IMG.cream]),
      badge: 'New',
      rating: 4.7,
      reviewCount: 97,
      isFeatured: true,
      howToUseEn: 'Apply morning after serum. Use SPF during the day.',
      howToUseSw: 'Paka asubuhi baada ya serum. Tumia SPF mchana.',
      ingredients: 'Turmeric Extract, Licorice Root, Niacinamide, Squalane, Green Tea',
    },
    {
      slug: 'castor-oil-growth-treatment',
      nameEn: 'Castor Oil Growth Treatment',
      nameSw: 'Matibabu ya Kukua Nywele ya Castor Oil',
      descriptionEn: 'Cold-pressed Jamaican Black Castor Oil with rosemary and peppermint. Stimulates scalp and strengthens roots for healthier growth.',
      descriptionSw: 'Mafuta ya Castor meusi ya Jamaican na rosemary. Huchochea ngozi ya kichwa na kuimarisha mizizi.',
      price: 22000,
      sku: 'NC-HR-CAS',
      stock: 60,
      categoryId: haircare.id,
      images: JSON.stringify([IMG.oil]),
      rating: 4.6,
      reviewCount: 241,
      howToUseEn: 'Massage 5–10 drops into scalp 2–3× weekly. Leave at least 2 hours before washing.',
      ingredients: 'Jamaican Black Castor Oil, Rosemary, Peppermint, Vitamin E',
    },
    {
      slug: 'african-black-soap-cleanser',
      nameEn: 'African Black Soap Cleanser',
      nameSw: 'Sabuni Nyeusi ya Kiafrika',
      descriptionEn: 'Traditional African black soap with plantain ash, cocoa pod and shea. Gently cleanses and controls oil — great for acne-prone skin.',
      descriptionSw: 'Sabuni nyeusi ya jadi ya Kiafrika. Inasafisha kwa upole na kudhibiti mafuta.',
      price: 18000,
      sku: 'NC-SOAP-BK',
      stock: 80,
      categoryId: skincare.id,
      images: JSON.stringify([IMG.soap]),
      rating: 4.8,
      reviewCount: 156,
      ingredients: 'Plantain Ash, Cocoa Pod Ash, Shea Butter, Palm Kernel Oil, Coconut Oil',
    },
    {
      slug: 'argan-oil-leave-in',
      nameEn: 'Argan Oil Leave-In Conditioner',
      nameSw: 'Conditioner ya Argan Oil Isiyooshwa',
      descriptionEn: 'Lightweight leave-in with Moroccan argan oil. Detangles, adds shine, protects against heat and humidity — ideal for Tanzanian weather.',
      descriptionSw: 'Leave-in nyepesi yenye mafuta ya argan. Inatatua, huongeza mng\'aro, hulinda dhidi ya joto na unyevu.',
      price: 35000,
      compareAtPrice: 42000,
      sku: 'NC-HR-ARG',
      stock: 35,
      categoryId: haircare.id,
      images: JSON.stringify([IMG.hair]),
      badge: 'Popular',
      rating: 4.9,
      reviewCount: 278,
      isFeatured: true,
      ingredients: 'Argan Oil, Aloe Vera, Glycerin, Panthenol, Silk Amino Acids',
    },
    {
      slug: 'shea-cocoa-body-butter',
      nameEn: 'Shea & Cocoa Body Butter',
      nameSw: 'Body Butter ya Shea & Kakao',
      descriptionEn: 'Rich whipped body butter with raw shea and cocoa butter. Deep moisture for dry skin — elbows, knees, feet.',
      descriptionSw: 'Body butter tajiri yenye shea na cocoa. Hunyunyiza ngozi kavu kwa kina.',
      price: 25000,
      sku: 'NC-BDY-SHC',
      stock: 50,
      categoryId: body.id,
      images: JSON.stringify([IMG.body]),
      rating: 4.7,
      reviewCount: 134,
      ingredients: 'Shea Butter, Cocoa Butter, Coconut Oil, Jojoba Oil, Vitamin E',
    },
    {
      slug: 'glow-complete-bundle',
      nameEn: 'Glow Complete Bundle',
      nameSw: "Kifurushi Kamili cha Kung'aa",
      descriptionEn: 'Complete set: Black Soap Cleanser + Vitamin C Serum + Turmeric Cream. Everything for an even, radiant complexion — save vs buying separately.',
      descriptionSw: 'Seti kamili: Sabuni Nyeusi + Serum ya Vitamini C + Cream ya Manjano. Okoa bei.',
      price: 95000,
      compareAtPrice: 125000,
      sku: 'NC-BND-GLOW',
      stock: 20,
      categoryId: bundles.id,
      images: JSON.stringify([IMG.bundle, IMG.bottle]),
      badge: 'Save 24%',
      rating: 5.0,
      reviewCount: 67,
      isFeatured: true,
    },
    {
      slug: 'rosehip-facial-oil',
      nameEn: 'Rosehip Oil Facial Oil',
      nameSw: 'Mafuta ya Uso ya Rosehip',
      descriptionEn: 'Pure cold-pressed rosehip seed oil rich in vitamins A & C. Helps scars, fine lines, and skin repair. Non-comedogenic.',
      descriptionSw: 'Mafuta safi ya rosehip yenye vitamini A & C. Husaidia makovu na ukarabati wa ngozi.',
      price: 38000,
      sku: 'NC-OIL-RHP',
      stock: 28,
      categoryId: skincare.id,
      images: JSON.stringify([IMG.rose]),
      rating: 4.9,
      reviewCount: 112,
      ingredients: '100% Pure Rosa Canina (Rosehip) Seed Oil',
    },
    {
      slug: 'coconut-milk-shampoo',
      nameEn: 'Coconut Milk Shampoo',
      nameSw: 'Shampoo ya Maziwa ya Nazi',
      descriptionEn: 'Sulfate-free shampoo with coconut milk and keratin. Gentle cleanse while keeping natural oils — natural, relaxed, or braided hair.',
      descriptionSw: 'Shampoo isiyo na sulfate yenye maziwa ya nazi. Inasafisha kwa upole.',
      price: 20000,
      sku: 'NC-SHP-COC',
      stock: 45,
      categoryId: haircare.id,
      images: JSON.stringify([IMG.shampoo]),
      rating: 4.6,
      reviewCount: 145,
      ingredients: 'Coconut Milk, Keratin, Aloe Vera, Glycerin, Natural Surfactants',
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }


  // —— Spa services (full Emish menu) ——
  const serviceCatMap: Record<string, string> = {};
  for (const c of EMISH_SERVICE_CATEGORIES) {
    const row = await prisma.serviceCategory.upsert({
      where: { slug: c.slug },
      update: { nameEn: c.nameEn, nameSw: c.nameSw, sortOrder: c.sortOrder },
      create: { slug: c.slug, nameEn: c.nameEn, nameSw: c.nameSw, sortOrder: c.sortOrder },
    });
    serviceCatMap[c.slug] = row.id;
  }

  for (const s of EMISH_SERVICES) {
    const categoryId = serviceCatMap[s.categorySlug];
    if (!categoryId) continue;
    const { categorySlug, ...rest } = s as any;
    await prisma.service.upsert({
      where: { slug: s.slug },
      update: {
        nameEn: s.nameEn,
        nameSw: s.nameSw,
        descriptionEn: s.descriptionEn,
        descriptionSw: s.descriptionSw,
        durationMinutes: s.durationMinutes,
        price: s.price,
        categoryId,
        isFeatured: s.isFeatured,
        sortOrder: s.sortOrder,
        isActive: true,
      },
      create: {
        slug: s.slug,
        nameEn: s.nameEn,
        nameSw: s.nameSw,
        descriptionEn: s.descriptionEn,
        descriptionSw: s.descriptionSw,
        durationMinutes: s.durationMinutes,
        price: s.price,
        categoryId,
        isFeatured: s.isFeatured,
        sortOrder: s.sortOrder,
        isActive: true,
      },
    });
  }
  console.log('   Services:', EMISH_SERVICES.length);

  // Extra retail products from Emish list (upsert by slug)
  for (const p of EMISH_PRODUCTS) {
    const cat =
      p.categorySlug === 'haircare' ? haircare :
      p.categorySlug === 'body' ? body :
      p.categorySlug === 'bundles' ? bundles :
      skincare;
    const imagesJson = JSON.stringify((p as any).images || []);
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: {
        nameEn: p.nameEn,
        nameSw: p.nameSw,
        descriptionEn: p.descriptionEn,
        descriptionSw: p.descriptionSw,
        price: p.price,
        stock: p.stock,
        categoryId: cat.id,
        images: imagesJson,
        isFeatured: !!(p as any).isFeatured,
        isActive: true,
      },
      create: {
        slug: p.slug,
        nameEn: p.nameEn,
        nameSw: p.nameSw,
        descriptionEn: p.descriptionEn,
        descriptionSw: p.descriptionSw,
        price: p.price,
        stock: p.stock,
        categoryId: cat.id,
        images: imagesJson,
        isFeatured: !!(p as any).isFeatured,
        isActive: true,
      },
    });
  }

  // Retire old product slugs renamed in catalog update
  const retiredSlugs = [
    'forever-multi-macce',
    'dettol-skin-care',
    'cos-skin-collagen-night',
    'nivea-miracle-water',
    'skin-therapy',
    'rosehip-oil-facial-oil',
    'cos-skin-kojic-acid-mask',
  ];
  await prisma.product.updateMany({
    where: { slug: { in: retiredSlugs } },
    data: { isActive: false },
  });

  console.log('   Catalog products upserted:', EMISH_PRODUCTS.length);

  const adminPass = await bcrypt.hash('admin123', 12);
  await prisma.user.upsert({
    where: { phone: '255700000001' },
    update: {},
    create: {
      phone: '255700000001',
      name: 'Emish Admin',
      email: 'admin@emishbeautyspa.co.tz',
      passwordHash: adminPass,
      role: 'ADMIN',
      referralCode: 'ADMIN001',
    },
  });

  const custPass = await bcrypt.hash('demo123', 12);
  await prisma.user.upsert({
    where: { phone: '255712345678' },
    update: {},
    create: {
      phone: '255712345678',
      name: 'Demo Customer',
      passwordHash: custPass,
      role: 'CUSTOMER',
      referralCode: 'DEMO2026',
    },
  });


  const staffPass = await bcrypt.hash('staff123', 12);
  await prisma.user.upsert({
    where: { phone: '255700000002' },
    update: { role: 'BRANCH_MANAGER', branch: 'Dar es Salaam' },
    create: {
      name: 'Dar Branch Manager',
      phone: '255700000002',
      passwordHash: staffPass,
      role: 'BRANCH_MANAGER',
      branch: 'Dar es Salaam',
      referralCode: 'MGRDAR01',
    },
  });
  await prisma.user.upsert({
    where: { phone: '255700000003' },
    update: { role: 'CASHIER', branch: 'Dar es Salaam' },
    create: {
      name: 'Spa Cashier',
      phone: '255700000003',
      passwordHash: staffPass,
      role: 'CASHIER',
      branch: 'Dar es Salaam',
      referralCode: 'CASH01',
    },
  });
  await prisma.user.updateMany({
    where: { phone: '255700000001' },
    data: { role: 'SUPER_ADMIN' },
  });

  console.log('✅ Seed complete');
  console.log('   Super admin: 255700000001 / admin123');
  console.log('   Manager:     255700000002 / staff123');
  console.log('   Cashier:     255700000003 / staff123');
  console.log('   Customer: 255712345678 / demo123');
  console.log('   Products: ' + products.length + ' with image URLs');

  await prisma.setting.upsert({
    where: { key: 'commission_rate_products' },
    update: {},
    create: { key: 'commission_rate_products', value: '0.05' },
  });
  await prisma.setting.upsert({
    where: { key: 'commission_rate_services' },
    update: {},
    create: { key: 'commission_rate_services', value: '0.05' },
  });
  console.log('   Settings: commission 5% products + services');

}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

