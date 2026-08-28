// Ported from the frontend's src/data/products.js, plus a `stockGrams` field
// (the backend's source of truth for inventory — the frontend has none).
// Adjust these numbers to your real warehouse counts before going live.
module.exports = [
  { id: 'p1', image: '/images/coffee-light.webp', name: 'چری', origin: 'هند', roast: 'متوسط', desc: 'آجیلی، شکلاتی و متعادل', price: 373000, tag: 'متوسط', body: 4, acidity: 2, sweetness: 3, stockGrams: 15000 },
  { id: 'p2', image: '/images/coffee-colombia.webp', name: 'اوگاندا', origin: 'اوگاندا', roast: 'متوسط', desc: 'قوی، خاکی و با ته‌مزه کاکائو', price: 380000, tag: 'متوسط', body: 5, acidity: 2, sweetness: 3, stockGrams: 12000 },
  { id: 'p3', image: '/images/coffee-colombia.webp', name: 'پلن', origin: 'بلند ویژه', roast: 'متوسط', desc: 'متعادل، خوش‌عطر و مناسب اسپرسو', price: 450000, tag: 'متوسط', body: 4, acidity: 2, sweetness: 4, stockGrams: 10000 },
  { id: 'p4', image: '/images/coffee-colombia.webp', name: 'کلمبیا', origin: 'کلمبیا', roast: 'متوسط', desc: 'شیرین، میوه‌ای و با اسیدیته دلنشین', price: 557000, tag: 'متوسط', body: 3, acidity: 4, sweetness: 4, stockGrams: 9000 },
  { id: 'p5', image: '/images/coffee-light.webp', name: 'ریو', origin: 'برزیل', roast: 'متوسط', desc: 'ملایم، آجیلی و شکلاتی', price: 390000, tag: 'متوسط', body: 4, acidity: 2, sweetness: 3, stockGrams: 14000 },
  { id: 'p6', image: '/images/coffee-dark.jpg', name: 'PB', origin: 'پرزریسک', roast: 'متوسط', desc: 'بدنه قوی، عطر کلاسیک و پایان شیرین', price: 400000, tag: 'متوسط', body: 5, acidity: 2, sweetness: 3, stockGrams: 8000 },
  { id: 'p7', image: '/images/coffee-light.webp', name: 'ایتوپی', origin: 'اتیوپی', roast: 'روشن', desc: 'گل‌دار، مرکباتی و روشن', price: 610000, tag: 'روشن', body: 2, acidity: 5, sweetness: 4, stockGrams: 11000 },
  { id: 'p8', image: '/images/coffee-colombia.webp', name: 'اندونزی', origin: 'اندونزی', roast: 'متوسط', desc: 'بدنه بالا، خاکی و شکلاتی', price: 406000, tag: 'متوسط', body: 5, acidity: 2, sweetness: 3, stockGrams: 9500 },
  { id: 'p9', image: '/images/coffee-colombia.webp', name: 'گوات مالا', origin: 'گواتمالا', roast: 'متوسط', desc: 'شکلاتی، ادویه‌ای و خوش‌عطر', price: 610000, tag: 'متوسط', body: 4, acidity: 3, sweetness: 4, stockGrams: 7000 },
  { id: 'p10', image: '/images/coffee-dark.jpg', name: 'دارک', origin: 'بلند دارک', roast: 'تیره', desc: 'شکلات تلخ، کارامل سوخته و بدنه سنگین', price: 520000, tag: 'تیره', body: 5, acidity: 1, sweetness: 3, stockGrams: 13000 },
];
