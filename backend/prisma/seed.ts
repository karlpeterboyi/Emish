import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding Niffer Cosmetics database...');

  // Categories
  const skincare = await prisma.category.upsert({
    where: { slug: 'skincare' },
    update: {},
    create: {
      slug: 'skincare',
      nameEn: 'Skincare',
      nameSw: 'Huduma ya Ngozi',
      sortOrder: 1,
    },
  });
  const haircare = await prisma.category.upsert({
    where: { slug: 'haircare' },
    update: {},
    create: {
      slug: 'haircare',
      nameEn: 'Hair Care',
      nameSw: 'Huduma ya Nywele',
      sortOrder: 2,
    },
  });
  const body = await prisma.category.upsert({
    where: { slug: 'body' },
    update: {},
    create: {
      slug: 'body',
      nameEn: 'Body Care',
      nameSw: 'Huduma ya Mwili',
      sortOrder: 3,
    },
  });
  const bundles = await prisma.category.upsert({
    where: { slug: 'bundles' },
    update: {},
    create: {
      slug: 'bundles',
      nameEn: 'Bundles',
      nameSw: 'Vifurushi',
      sortOrder: 4,
    },
  });

  // Products (from frontend prototype)
  const products = [
    {
      slug: 'glow-serum-vitamin-c',
      nameEn: 'Glow Serum with Vitamin C',
      nameSw: 'Serum ya Kung\'aa na Vitamini C',
      descriptionEn: 'Brightening serum formulated with 15% Vitamin C and niacinamide. Perfect for African skin tones – reduces dark spots, boosts radiance and protects against environmental stress.',
      descriptionSw: 'Serum ya kung\'aa iliyoundwa na 15% Vitamini C na niacinamide. Bora kwa rangi za ngozi za Kiafrika.',
      howToUseEn: 'Apply 3-4 drops morning and evening after cleansing. Follow with moisturizer and sunscreen during day.',
      howToUseSw: 'Tumia matone 3-4 asubuhi na jioni baada ya kusafisha.',
      ingredients: 'Vitamin C (15%), Niacinamide, Hyaluronic Acid, Ferulic Acid, Aloe Vera',
      price: 45000,
      compareAtPrice: 55000,
      stock: 25,
      categoryId: skincare.id,
      images: JSON.stringify(['🧴']),
      badge: 'Bestseller',
      rating: 4.9,
      reviewCount: 312,
      isFeatured: true,
    },
    {
      slug: 'shea-butter-hair-mask',
      nameEn: 'Shea Butter Hair Mask',
      nameSw: 'Maski ya Nywele ya Shea Butter',
      descriptionEn: 'Deep conditioning mask rich in pure African shea butter and coconut oil. Restores moisture to dry, damaged or natural hair.',
      descriptionSw: 'Maski ya kina yenye shea butter safi ya Kiafrika na mafuta ya nazi.',
      price: 28000,
      stock: 40,
      categoryId: haircare.id,
      images: JSON.stringify(['🥥']),
      rating: 4.8,
      reviewCount: 189,
      isFeatured: true,
    },
    {
      slug: 'turmeric-brightening-cream',
      nameEn: 'Turmeric Brightening Cream',
      nameSw: 'Cream ya Kung\'aa ya Manjano',
      descriptionEn: 'Lightweight day cream with turmeric extract and licorice root. Evens skin tone without bleaching.',
      descriptionSw: 'Cream nyepesi ya mchana yenye dondoo la manjano.',
      price: 32000,
      compareAtPrice: 38000,
      stock: 18,
      categoryId: skincare.id,
      images: JSON.stringify(['✨']),
      badge: 'New',
      rating: 4.7,
      reviewCount: 97,
      isFeatured: true,
    },
    {
      slug: 'castor-oil-growth-treatment',
      nameEn: 'Castor Oil Growth Treatment',
      nameSw: 'Matibabu ya Kukua Nywele ya Castor Oil',
      descriptionEn: 'Cold-pressed Jamaican Black Castor Oil blended with rosemary and peppermint.',
      descriptionSw: 'Mafuta ya Castor meusi ya Jamaican yaliyochanganywa na rosemary.',
      price: 22000,
      stock: 55,
      categoryId: haircare.id,
      images: JSON.stringify(['🌱']),
      rating: 4.6,
      reviewCount: 241,
    },
    {
      slug: 'african-black-soap-cleanser',
      nameEn: 'African Black Soap Cleanser',
      nameSw: 'Sabuni Nyeusi ya Kiafrika ya Kusafisha',
      descriptionEn: 'Traditional African black soap with plantain ash, cocoa pod and shea.',
      descriptionSw: 'Sabuni nyeusi ya jadi ya Kiafrika.',
      price: 18000,
      stock: 60,
      categoryId: skincare.id,
      images: JSON.stringify(['🧼']),
      rating: 4.8,
      reviewCount: 156,
    },
    {
      slug: 'argan-oil-leave-in',
      nameEn: 'Argan Oil Leave-In Conditioner',
      nameSw: 'Conditioner ya Argan Oil Isiyooshwa',
      descriptionEn: 'Lightweight leave-in with pure Moroccan argan oil. Perfect for Tanzanian climate.',
      descriptionSw: 'Leave-in nyepesi yenye mafuta safi ya argan ya Morocco.',
      price: 35000,
      compareAtPrice: 42000,
      stock: 30,
      categoryId: haircare.id,
      images: JSON.stringify(['💧']),
      badge: 'Popular',
      rating: 4.9,
      reviewCount: 278,
      isFeatured: true,
    },
    {
      slug: 'shea-cocoa-body-butter',
      nameEn: 'Shea & Cocoa Body Butter',
      nameSw: 'Body Butter ya Shea & Kakao',
      descriptionEn: 'Rich whipped body butter with raw shea and cocoa butter.',
      descriptionSw: 'Body butter tajiri yenye shea na cocoa butter.',
      price: 25000,
      stock: 45,
      categoryId: body.id,
      images: JSON.stringify(['🍫']),
      rating: 4.7,
      reviewCount: 134,
    },
    {
      slug: 'glow-complete-bundle',
      nameEn: 'Glow Complete Bundle',
      nameSw: 'Kifurushi Kamili cha Kung\'aa',
      descriptionEn: 'Complete skincare set: Black Soap + Vitamin C Serum + Turmeric Cream.',
      descriptionSw: 'Seti kamili ya huduma ya ngozi.',
      price: 95000,
      compareAtPrice: 125000,
      stock: 12,
      categoryId: bundles.id,
      images: JSON.stringify(['🎁']),
      badge: 'Save 24%',
      rating: 5.0,
      reviewCount: 67,
      isFeatured: true,
    },
  ];

  for (const p of products) {
    await prisma.product.upsert({
      where: { slug: p.slug },
      update: p,
      create: p,
    });
  }

  // Admin user
  const adminPass = await bcrypt.hash('admin123', 10);
  await prisma.user.upsert({
    where: { phone: '255700000001' },
    update: {},
    create: {
      phone: '255700000001',
      name: 'Niffer Admin',
      email: 'admin@niffercosmetics.co.tz',
      passwordHash: adminPass,
      role: 'ADMIN',
      referralCode: 'ADMIN001',
    },
  });

  // Demo customer
  const custPass = await bcrypt.hash('demo123', 10);
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

  console.log('✅ Seed completed!');
  console.log('   Admin: 255700000001 / admin123');
  console.log('   Customer: 255712345678 / demo123');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
