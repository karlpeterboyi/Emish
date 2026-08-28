// Niffer Cosmetics - Product Catalog (sample data for Tanzania market)
const products = [
  {
    id: 1,
    name: { en: "Glow Serum with Vitamin C", sw: "Serum ya Kung'aa na Vitamini C" },
    slug: "glow-serum-vitamin-c",
    category: "skincare",
    price: 45000,
    originalPrice: 55000,
    image: "🧴",
    badge: "Bestseller",
    stock: 25,
    rating: 4.9,
    reviews: 312,
    description: {
      en: "Brightening serum formulated with 15% Vitamin C and niacinamide. Perfect for African skin tones – reduces dark spots, boosts radiance and protects against environmental stress.",
      sw: "Serum ya kung'aa iliyoundwa na 15% Vitamini C na niacinamide. Bora kwa rangi za ngozi za Kiafrika – hupunguza madoa meusi, huongeza mng'aro na hulinda dhidi ya msongo wa mazingira."
    },
    howToUse: {
      en: "Apply 3-4 drops morning and evening after cleansing. Follow with moisturizer and sunscreen during day.",
      sw: "Tumia matone 3-4 asubuhi na jioni baada ya kusafisha. Fuata na moisturizer na sunscreen wakati wa mchana."
    },
    ingredients: "Vitamin C (15%), Niacinamide, Hyaluronic Acid, Ferulic Acid, Aloe Vera"
  },
  {
    id: 2,
    name: { en: "Shea Butter Hair Mask", sw: "Maski ya Nywele ya Shea Butter" },
    slug: "shea-butter-hair-mask",
    category: "haircare",
    price: 28000,
    originalPrice: null,
    image: "🥥",
    badge: null,
    stock: 40,
    rating: 4.8,
    reviews: 189,
    description: {
      en: "Deep conditioning mask rich in pure African shea butter and coconut oil. Restores moisture to dry, damaged or natural hair. Ideal for 4C hair textures.",
      sw: "Maski ya kina yenye shea butter safi ya Kiafrika na mafuta ya nazi. Inarejesha unyevu kwa nywele kavu, zilizoharibiwa au asili. Bora kwa aina ya nywele 4C."
    },
    howToUse: {
      en: "Apply generously to clean damp hair. Leave for 20-30 minutes (or overnight). Rinse thoroughly.",
      sw: "Paka kwa wingi kwenye nywele safi zenye unyevu. Acha dakika 20-30 (au usiku kucha). Osha vizuri."
    },
    ingredients: "Shea Butter, Coconut Oil, Argan Oil, Honey, Vitamin E"
  },
  {
    id: 3,
    name: { en: "Turmeric Brightening Cream", sw: "Cream ya Kung'aa ya Manjano" },
    slug: "turmeric-brightening-cream",
    category: "skincare",
    price: 32000,
    originalPrice: 38000,
    image: "✨",
    badge: "New",
    stock: 18,
    rating: 4.7,
    reviews: 97,
    description: {
      en: "Lightweight day cream with turmeric extract and licorice root. Evens skin tone, reduces hyperpigmentation and gives a natural glow without bleaching.",
      sw: "Cream nyepesi ya mchana yenye dondoo la manjano na mzizi wa licorice. Inasawazisha rangi ya ngozi, hupunguza hyperpigmentation na kutoa mng'aro wa asili bila kuweka rangi."
    },
    howToUse: {
      en: "Apply morning after serum. Use SPF during the day. Suitable for all skin types.",
      sw: "Paka asubuhi baada ya serum. Tumia SPF wakati wa mchana. Inafaa kwa aina zote za ngozi."
    },
    ingredients: "Turmeric Extract, Licorice Root, Niacinamide, Squalane, Green Tea"
  },
  {
    id: 4,
    name: { en: "Castor Oil Growth Treatment", sw: "Matibabu ya Kukua Nywele ya Castor Oil" },
    slug: "castor-oil-growth-treatment",
    category: "haircare",
    price: 22000,
    originalPrice: null,
    image: "🌱",
    badge: null,
    stock: 55,
    rating: 4.6,
    reviews: 241,
    description: {
      en: "Cold-pressed Jamaican Black Castor Oil blended with rosemary and peppermint. Stimulates scalp, strengthens roots and promotes healthy hair growth.",
      sw: "Mafuta ya Castor meusi ya Jamaican yaliyobanwa baridi yaliyochanganywa na rosemary na peppermint. Huchochea ngozi ya kichwa, huimarisha mizizi na kukuza ukuaji wa nywele zenye afya."
    },
    howToUse: {
      en: "Massage 5-10 drops into scalp 2-3 times a week. Leave overnight or for at least 2 hours before washing.",
      sw: "Paka matone 5-10 kwenye ngozi ya kichwa mara 2-3 kwa wiki. Acha usiku kucha au angalau saa 2 kabla ya kuosha."
    },
    ingredients: "Jamaican Black Castor Oil, Rosemary Essential Oil, Peppermint, Vitamin E"
  },
  {
    id: 5,
    name: { en: "African Black Soap Cleanser", sw: "Sabuni Nyeusi ya Kiafrika ya Kusafisha" },
    slug: "african-black-soap-cleanser",
    category: "skincare",
    price: 18000,
    originalPrice: null,
    image: "🧼",
    badge: null,
    stock: 60,
    rating: 4.8,
    reviews: 156,
    description: {
      en: "Traditional African black soap with plantain ash, cocoa pod and shea. Gently cleanses, controls oil and is perfect for acne-prone or sensitive skin.",
      sw: "Sabuni nyeusi ya jadi ya Kiafrika yenye majivu ya ndizi, ganda la kakao na shea. Inasafisha kwa upole, hudhibiti mafuta na ni bora kwa ngozi yenye chunusi au nyeti."
    },
    howToUse: {
      en: "Wet face, lather a small amount, massage gently for 30 seconds, rinse. Use morning and evening.",
      sw: "Lowesha uso, fanya povu kidogo, paka kwa upole kwa sekunde 30, osha. Tumia asubuhi na jioni."
    },
    ingredients: "Plantain Ash, Cocoa Pod Ash, Shea Butter, Palm Kernel Oil, Coconut Oil"
  },
  {
    id: 6,
    name: { en: "Argan Oil Leave-In Conditioner", sw: "Conditioner ya Argan Oil Isiyooshwa" },
    slug: "argan-oil-leave-in",
    category: "haircare",
    price: 35000,
    originalPrice: 42000,
    image: "💧",
    badge: "Popular",
    stock: 30,
    rating: 4.9,
    reviews: 278,
    description: {
      en: "Lightweight leave-in with pure Moroccan argan oil. Detangles, adds shine and protects against heat and humidity – perfect for Tanzanian climate.",
      sw: "Leave-in nyepesi yenye mafuta safi ya argan ya Morocco. Inatatua, huongeza mng'aro na hulinda dhidi ya joto na unyevu – bora kwa hali ya hewa ya Tanzania."
    },
    howToUse: {
      en: "Apply to damp or dry hair focusing on mid-lengths and ends. Style as usual. No rinse needed.",
      sw: "Paka kwenye nywele zenye unyevu au kavu ukizingatia sehemu za kati na ncha. Panga kama kawaida. Hakuna haja ya kuosha."
    },
    ingredients: "Argan Oil, Aloe Vera, Glycerin, Panthenol, Silk Amino Acids"
  },
  {
    id: 7,
    name: { en: "Shea & Cocoa Body Butter", sw: "Body Butter ya Shea & Kakao" },
    slug: "shea-cocoa-body-butter",
    category: "body",
    price: 25000,
    originalPrice: null,
    image: "🍫",
    badge: null,
    stock: 45,
    rating: 4.7,
    reviews: 134,
    description: {
      en: "Rich whipped body butter with raw shea and cocoa butter. Deeply moisturizes dry skin and leaves a subtle natural scent. Great for elbows, knees and feet.",
      sw: "Body butter tajiri iliyochochewa yenye shea mbichi na cocoa butter. Hunyunyiza ngozi kavu kwa kina na huacha harufu asili. Nzuri kwa viwiko, magoti na miguu."
    },
    howToUse: {
      en: "Apply to clean skin after shower while still slightly damp. Massage until absorbed.",
      sw: "Paka kwenye ngozi safi baada ya kuoga wakati bado ina unyevu kidogo. Paka hadi iingie."
    },
    ingredients: "Shea Butter, Cocoa Butter, Coconut Oil, Jojoba Oil, Vitamin E, Essential Oils"
  },
  {
    id: 8,
    name: { en: "Glow Complete Bundle", sw: "Kifurushi Kamili cha Kung'aa" },
    slug: "glow-complete-bundle",
    category: "bundles",
    price: 95000,
    originalPrice: 125000,
    image: "🎁",
    badge: "Save 24%",
    stock: 12,
    rating: 5.0,
    reviews: 67,
    description: {
      en: "Complete skincare set: Black Soap Cleanser + Vitamin C Serum + Turmeric Cream. Everything you need for a radiant, even-toned complexion.",
      sw: "Seti kamili ya huduma ya ngozi: Sabuni Nyeusi + Serum ya Vitamini C + Cream ya Manjano. Kila kitu unachohitaji kwa uso unaong'aa na rangi sawa."
    },
    howToUse: {
      en: "Follow the routine: Cleanse → Serum → Cream. Use consistently for best results.",
      sw: "Fuata utaratibu: Safisha → Serum → Cream. Tumia kwa uthabiti kwa matokeo bora."
    },
    ingredients: "See individual products"
  },
  {
    id: 9,
    name: { en: "Hair Growth Duo", sw: "Jozi ya Kukua Nywele" },
    slug: "hair-growth-duo",
    category: "bundles",
    price: 48000,
    originalPrice: 57000,
    image: "👑",
    badge: "Save 16%",
    stock: 20,
    rating: 4.8,
    reviews: 89,
    description: {
      en: "Castor Oil Growth Treatment + Shea Butter Hair Mask. Nourish scalp and restore moisture for stronger, longer hair.",
      sw: "Matibabu ya Castor Oil + Maski ya Shea Butter. Lisha ngozi ya kichwa na rejesha unyevu kwa nywele imara na ndefu."
    },
    howToUse: {
      en: "Use castor oil 2-3x weekly on scalp. Apply mask weekly after shampooing.",
      sw: "Tumia mafuta ya castor mara 2-3 kwa wiki kwenye ngozi ya kichwa. Paka maski kila wiki baada ya shampoo."
    },
    ingredients: "See individual products"
  },
  {
    id: 10,
    name: { en: "Rosehip Oil Facial Oil", sw: "Mafuta ya Uso ya Rosehip" },
    slug: "rosehip-facial-oil",
    category: "skincare",
    price: 38000,
    originalPrice: null,
    image: "🌹",
    badge: null,
    stock: 22,
    rating: 4.9,
    reviews: 112,
    description: {
      en: "Pure cold-pressed rosehip seed oil rich in vitamins A & C. Helps with scars, fine lines and overall skin repair. Non-comedogenic.",
      sw: "Mafuta safi ya mbegu za rosehip yaliyobanwa baridi yenye vitamini A & C. Husaidia na makovu, mikunjo midogo na ukarabati wa ngozi kwa ujumla. Haitoi vichomi."
    },
    howToUse: {
      en: "Apply 2-3 drops to face at night after serum or alone. Can mix with moisturizer.",
      sw: "Paka matone 2-3 usoni usiku baada ya serum au pekee. Unaweza kuchanganya na moisturizer."
    },
    ingredients: "100% Pure Rosa Canina (Rosehip) Seed Oil"
  },
  {
    id: 11,
    name: { en: "Tea Tree Spot Treatment", sw: "Matibabu ya Chunusi ya Tea Tree" },
    slug: "tea-tree-spot-treatment",
    category: "skincare",
    price: 15000,
    originalPrice: null,
    image: "🌿",
    badge: null,
    stock: 70,
    rating: 4.5,
    reviews: 203,
    description: {
      en: "Targeted gel with tea tree oil and salicylic acid. Quickly reduces redness and size of breakouts without over-drying.",
      sw: "Jeli iliyolengwa yenye mafuta ya tea tree na asidi ya salicylic. Hupunguza haraka wekundu na ukubwa wa chunusi bila kukausha kupita kiasi."
    },
    howToUse: {
      en: "Dab a small amount directly on blemishes morning and night. Avoid eye area.",
      sw: "Paka kiasi kidogo moja kwa moja kwenye chunusi asubuhi na usiku. Epuka eneo la macho."
    },
    ingredients: "Tea Tree Oil, Salicylic Acid 1%, Aloe Vera, Witch Hazel"
  },
  {
    id: 12,
    name: { en: "Coconut Milk Shampoo", sw: "Shampoo ya Maziwa ya Nazi" },
    slug: "coconut-milk-shampoo",
    category: "haircare",
    price: 20000,
    originalPrice: null,
    image: "🥥",
    badge: null,
    stock: 38,
    rating: 4.6,
    reviews: 145,
    description: {
      en: "Sulfate-free shampoo enriched with coconut milk and keratin. Gently cleanses while maintaining natural oils. Suitable for natural, relaxed and braided hair.",
      sw: "Shampoo isiyo na sulfate iliyoimarishwa na maziwa ya nazi na keratin. Inasafisha kwa upole huku ikidumisha mafuta asili. Inafaa kwa nywele asili, zilizotuliwa na zilizosukwa."
    },
    howToUse: {
      en: "Apply to wet hair, massage into scalp, rinse thoroughly. Follow with conditioner or mask.",
      sw: "Paka kwenye nywele maji, paka kwenye ngozi ya kichwa, osha vizuri. Fuata na conditioner au maski."
    },
    ingredients: "Coconut Milk, Keratin, Aloe Vera, Glycerin, Natural Surfactants"
  }
];

function formatPrice(price) {
  return new Intl.NumberFormat('en-TZ', { style: 'decimal', maximumFractionDigits: 0 }).format(price) + ' TZS';
}

function getProductById(id) {
  return products.find(p => p.id === parseInt(id));
}

function getProductsByCategory(cat) {
  if (!cat || cat === 'all') return products;
  return products.filter(p => p.category === cat);
}

function renderProductCard(product) {
  const lang = currentLang || 'en';
  const name = product.name[lang] || product.name.en;
  const discount = product.originalPrice ? Math.round((1 - product.price / product.originalPrice) * 100) : 0;

  return `
    <div class="group bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition border border-primary-50">
      <a href="product.html?id=${product.id}" class="block">
        <div class="aspect-square bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-6xl relative">
          ${product.image}
          ${product.badge ? `<span class="absolute top-3 left-3 px-2 py-1 bg-primary-600 text-white text-xs font-medium rounded-full">${product.badge}</span>` : ''}
          ${discount > 0 ? `<span class="absolute top-3 right-3 px-2 py-1 bg-gold-500 text-white text-xs font-medium rounded-full">-${discount}%</span>` : ''}
        </div>
      </a>
      <div class="p-4">
        <p class="text-xs text-primary-500 uppercase tracking-wide mb-1">${product.category}</p>
        <a href="product.html?id=${product.id}">
          <h3 class="font-medium text-gray-900 group-hover:text-primary-600 transition line-clamp-2 min-h-[2.5rem]">${name}</h3>
        </a>
        <div class="flex items-center gap-1 mt-1 text-sm text-amber-500">
          ${'★'.repeat(Math.floor(product.rating))}${'☆'.repeat(5 - Math.floor(product.rating))}
          <span class="text-gray-400 text-xs ml-1">(${product.reviews})</span>
        </div>
        <div class="mt-3 flex items-center justify-between">
          <div>
            <span class="font-semibold text-primary-700">${formatPrice(product.price)}</span>
            ${product.originalPrice ? `<span class="text-sm text-gray-400 line-through ml-1">${formatPrice(product.originalPrice)}</span>` : ''}
          </div>
          <button onclick="addToCart(${product.id})" class="p-2 rounded-full bg-primary-100 hover:bg-primary-600 hover:text-white text-primary-600 transition" title="${t('add_to_cart')}">
            <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path></svg>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderFeaturedProducts() {
  const container = document.getElementById('featuredProducts');
  if (!container) return;
  const featured = products.slice(0, 4);
  container.innerHTML = featured.map(renderProductCard).join('');
}
