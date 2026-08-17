export const products = [
  { id:'p1', image:'/images/coffee-light.webp', name:'چری', origin:'هند', roast:'متوسط', desc:'آجیلی، شکلاتی و متعادل', price:373000, tag:'متوسط', profile:{body:4, acidity:2, sweetness:3} },
  { id:'p2', image:'/images/coffee-colombia.webp', name:'اوگاندا', origin:'اوگاندا', roast:'متوسط', desc:'قوی، خاکی و با ته‌مزه کاکائو', price:380000, tag:'متوسط', profile:{body:5, acidity:2, sweetness:3} },
  { id:'p3', image:'/images/coffee-colombia.webp', name:'پلن', origin:'بلند ویژه', roast:'متوسط', desc:'متعادل، خوش‌عطر و مناسب اسپرسو', price:450000, tag:'متوسط', profile:{body:4, acidity:2, sweetness:4} },
  { id:'p4', image:'/images/coffee-colombia.webp', name:'کلمبیا', origin:'کلمبیا', roast:'متوسط', desc:'شیرین، میوه‌ای و با اسیدیته دلنشین', price:557000, tag:'متوسط', profile:{body:3, acidity:4, sweetness:4} },
  { id:'p5', image:'/images/coffee-light.webp', name:'ریو', origin:'برزیل', roast:'متوسط', desc:'ملایم، آجیلی و شکلاتی', price:390000, tag:'متوسط', profile:{body:4, acidity:2, sweetness:3} },
  { id:'p6', image:'/images/coffee-dark.jpg', name:'PB', origin:'پرزریسک', roast:'متوسط', desc:'بدنه قوی، عطر کلاسیک و پایان شیرین', price:400000, tag:'متوسط', profile:{body:5, acidity:2, sweetness:3} },
  { id:'p7', image:'/images/coffee-light.webp', name:'ایتوپی', origin:'اتیوپی', roast:'روشن', desc:'گل‌دار، مرکباتی و روشن', price:610000, tag:'روشن', profile:{body:2, acidity:5, sweetness:4} },
  { id:'p8', image:'/images/coffee-colombia.webp', name:'اندونزی', origin:'اندونزی', roast:'متوسط', desc:'بدنه بالا، خاکی و شکلاتی', price:406000, tag:'متوسط', profile:{body:5, acidity:2, sweetness:3} },
  { id:'p9', image:'/images/coffee-colombia.webp', name:'گوات مالا', origin:'گواتمالا', roast:'متوسط', desc:'شکلاتی، ادویه‌ای و خوش‌عطر', price:610000, tag:'متوسط', profile:{body:4, acidity:3, sweetness:4} },
  { id:'p10', image:'/images/coffee-dark.jpg', name:'دارک', origin:'بلند دارک', roast:'تیره', desc:'شکلات تلخ، کارامل سوخته و بدنه سنگین', price:520000, tag:'تیره', profile:{body:5, acidity:1, sweetness:3} },
];
export const weights = [
  { label:'۲۵۰ گرم', mult:1 },
  { label:'۵۰۰ گرم', mult:1.85 },
  { label:'۱ کیلوگرم', mult:3.4 },
];
export const signatureBlend = [{productId:'p7', pct:60}, {productId:'p5', pct:40}];
export const tasteLabels = [
  {key:'body', label:'بدنه'},
  {key:'acidity', label:'اسیدیته'},
  {key:'sweetness', label:'شیرینی'},
];
export function findProduct(id){ return products.find(p => p.id === id); }
export function roundPrice(n){ return Math.round(n / 1000) * 1000; }
export function priceForWeight(basePrice, weightIdx=0){ return roundPrice(basePrice * (weights[weightIdx] ?? weights[0]).mult); }
export function priceForGrams(basePrice, grams=250){
  const g = Math.max(250, Number(grams) || 250);
  const ratio = g / 250;
  // Keep the existing 1kg value (3.4×) as the anchor and scale larger orders smoothly.
  if (g === 250) return roundPrice(basePrice);
  if (g === 500) return roundPrice(basePrice * 1.85);
  if (g === 1000) return roundPrice(basePrice * 3.4);
  if (g > 1000) return roundPrice(basePrice * (3.4 + (ratio - 4) * 3.2));
  return roundPrice(basePrice * ratio);
}
export function formatGrams(grams){
  const g = Number(grams);
  return g >= 1000 && g % 1000 === 0 ? `${(g/1000).toLocaleString('fa-IR')} کیلوگرم` : `${g.toLocaleString('fa-IR')} گرم`;
}
export function formatToman(amount){ return `${Math.round(amount).toLocaleString('fa-IR')} تومان`; }
export function computeMixProfile(mix){
  return mix.reduce((acc, item) => {
    const p = findProduct(item.productId); if (!p) return acc;
    tasteLabels.forEach(({key}) => acc[key] += p.profile[key] * (item.pct/100));
    return acc;
  }, {body:0, acidity:0, sweetness:0});
}
export function computeMixPrice(mix, weightIdx=0){
  const base = mix.reduce((sum, item) => sum + (findProduct(item.productId)?.price ?? 0) * item.pct/100, 0);
  return priceForWeight(base, weightIdx);
}
