import type { ArtKind } from '@/components/FoodArt';

export type Product = {
  id: string;
  name: string;
  category: Category;
  price: number;
  unit: string;
  kind: ArtKind;
  blurb: string;
  badge?: string;
  tags: string[];
  image: string;
};

export type Category = 'Cookies' | 'Pies' | 'Tarts' | 'Brownies';

export const CATEGORIES: Category[] = ['Cookies', 'Pies', 'Tarts', 'Brownies'];

export const PRODUCTS: Product[] = [
  {
    id: 'choc-chip',
    name: 'Chocolate Chip Cookies',
    category: 'Cookies',
    price: 180,
    unit: 'dozen',
    kind: 'chocchip',
    blurb: 'Crisp edges, molten middle, a heavy hand with the chocolate.',
    badge: 'Best seller',
    tags: ['Fresh daily', 'Vegetarian'],
    image: '/Products/Choc chip 2.jpg',
  },
  {
    id: 'oat-raisin',
    name: 'Oat & Raisin Cookies',
    category: 'Cookies',
    price: 180,
    unit: 'dozen',
    kind: 'oatraisin',
    blurb: 'Rolled oats, plump raisins and a whisper of cinnamon.',
    tags: ['Fresh daily'],
    image: '/Products/outmeal 1.JPG',
  },
  {
    id: 'dark-choc-chip',
    name: 'Dark Chocolate Chip Cookies',
    category: 'Cookies',
    price: 180,
    unit: 'dozen',
    kind: 'chocchip',
    blurb: 'Rich dark chocolate chips in a perfectly crisp cookie.',
    badge: 'New',
    tags: ['Fresh daily', 'Vegetarian'],
    image: '/Products/Double ChocChipcookies.jpg',
  },
  {
    id: 'oatmeal-pie',
    name: 'Oatmeal Pies',
    category: 'Pies',
    price: 250,
    unit: 'dozen',
    kind: 'oatmeal',
    blurb: 'Two soft oat cookies hugging a marshmallow centre.',
    badge: 'Family favourite',
    tags: ['Kid friendly'],
    image: '/Products/Pies 1.jpg',
  },
  {
    id: 'strawberry-tart',
    name: 'Strawberry Jam Tarts',
    category: 'Tarts',
    price: 200,
    unit: 'dozen',
    kind: 'berrytart',
    blurb: 'Buttery shell filled with sweet strawberry jam and topped with icing.',
    badge: 'Best seller',
    tags: ['Fresh daily'],
    image: '/extramedia/Baking 8.JPG',
  },
  {
    id: 'chocolate-brownies',
    name: 'Chocolate Brownies',
    category: 'Brownies',
    price: 270,
    unit: 'dozen',
    kind: 'chocchip',
    blurb: 'Fudgy, rich chocolate brownies with a crackly top.',
    badge: 'New',
    tags: ['Fresh daily', 'Vegetarian'],
    image: '/Products/Brownies 2.JPG',
  },
];

export type Promotion = {
  id: string;
  eyebrow: string;
  title: string;
  copy: string;
  code: string;
  tone: 'berry' | 'pistachio' | 'peach';
  kind: ArtKind;
};

export const PROMOTIONS: Promotion[] = [
  {
    id: 'afternoon',
    eyebrow: 'Weekdays 2–5pm',
    title: 'Afternoon Bliss Box',
    copy: 'Any six cookies plus a cinnamon roll, boxed and ready for the school run.',
    code: 'BLISS30',
    tone: 'berry',
    kind: 'chocchip',
  },
  {
    id: 'party',
    eyebrow: 'Order 48 hours ahead',
    title: 'Party Tray Deal',
    copy: 'Twenty-four assorted treats, arranged on our wooden party tray. Feeds twelve happily.',
    code: 'PARTY15',
    tone: 'pistachio',
    kind: 'cupcake',
  },
  {
    id: 'first',
    eyebrow: 'New here?',
    title: '10% Off Your First Order',
    copy: 'Try the bakery before you commit. Use the code at checkout on any order over E20.',
    code: 'HELLOBLISS',
    tone: 'peach',
    kind: 'berrytart',
  },
];

export type GalleryItem = {
  id: string;
  kind: ArtKind;
  caption: string;
  image: string;
};

export const GALLERY: GalleryItem[] = [
  { id: 'g1', kind: 'croissant', caption: 'Fresh from the oven', image: '/extramedia/Baking 3.JPG' },
  { id: 'g2', kind: 'berrytart', caption: 'Morning bake session', image: '/extramedia/Baking 4.JPG' },
  { id: 'g3', kind: 'cake', caption: 'Baking in progress', image: '/extramedia/Baking 8.JPG' },
  { id: 'g4', kind: 'loaf', caption: 'Fresh out of the oven', image: '/extramedia/Baking6.JPG' },
];

export const STORY_STATS = [
  { value: '2016', label: 'Baking since' },
  { value: '38', label: 'Recipes on the board' },
  { value: '4.9', label: 'Average rating' },
  { value: '6am', label: 'Ovens on daily' },
];

export const HOURS = [
  { day: 'Monday – Friday', time: '6:30am – 5:00pm' },
  { day: 'Saturday', time: '7:00am – 4:00pm' },
  { day: 'Sunday', time: '8:00am – 1:00pm' },
];

export const CONTACT = {
  phone: '+268 7812 4400',
  email: 'hello@littleblissbakery.com',
  address: ['14 Mill Lane', 'Malkerns', 'Eswatini'],
  social: ['Instagram', 'Facebook', 'WhatsApp'],
  whatsapp: '+268 7812 4400',
};

export type Testimonial = {
  id: string;
  name: string;
  location: string;
  rating: number;
  text: string;
  date: string;
};

export const TESTIMONIALS: Testimonial[] = [
  {
    id: 't1',
    name: 'Sarah M.',
    location: 'Malkerns',
    rating: 5,
    text: 'The chocolate chip cookies are absolutely legendary. My kids beg for them every weekend. The whole shop smells like happiness.',
    date: 'September 2026',
  },
  {
    id: 't2',
    name: 'James K.',
    location: 'Manzini',
    rating: 5,
    text: 'Ordered a celebration cake for my wife\'s birthday. It was stunning and tasted even better than it looked. Will definitely order again.',
    date: 'August 2026',
  },
  {
    id: 't3',
    name: 'Lindiwe D.',
    location: 'Mbabane',
    rating: 5,
    text: 'Their sourdough is the best I\'ve had in Eswatini. You can tell they put real care into every loaf. Worth the drive from Mbabane!',
    date: 'September 2026',
  },
  {
    id: 't4',
    name: 'Michael T.',
    location: 'Malkerns',
    rating: 5,
    text: 'The cinnamon rolls are dangerous — I can\'t stop at one. The cream cheese icing is perfection. My morning coffee routine is forever changed.',
    date: 'July 2026',
  },
  {
    id: 't5',
    name: 'Amanda P.',
    location: 'Ezulwini',
    rating: 5,
    text: 'Ordered 50 cupcakes for a corporate event. They were beautifully decorated and everyone loved them. Professional and delicious!',
    date: 'August 2026',
  },
  {
    id: 't6',
    name: 'David R.',
    location: 'Malkerns',
    rating: 5,
    text: 'Fresh croissants that actually taste like they came from a French bakery. Flaky, buttery, perfect. A little gem in Malkerns.',
    date: 'September 2026',
  },
];

export type FAQ = {
  id: string;
  question: string;
  answer: string;
  category: string;
};

export const FAQS: FAQ[] = [
  {
    id: 'f1',
    question: 'How do I place an order?',
    answer: 'You can order online through our website, message us on WhatsApp, or visit the bakery in person. Online orders can be placed anytime, and we\'ll have everything ready for pickup or delivery.',
    category: 'Ordering',
  },
  {
    id: 'f2',
    question: 'What are your delivery options?',
    answer: 'We offer free pickup at our bakery in Malkerns. For delivery within 20km, there\'s a E3.50 fee on orders under E40. Orders over E40 get free delivery. Delivery is available Monday-Saturday.',
    category: 'Delivery',
  },
  {
    id: 'f3',
    question: 'How far in advance should I order?',
    answer: 'For everyday treats like cookies and pastries, same-day orders are welcome if placed by 4pm. Custom cakes and party trays need at least 48 hours notice. Weekend-only items like apple pie should be pre-ordered.',
    category: 'Ordering',
  },
  {
    id: 'f4',
    question: 'Do you accommodate dietary restrictions?',
    answer: 'Yes! We have vegetarian options clearly marked. Our sourdough is vegan. For custom dietary needs (gluten-free, nut-free, etc.), please contact us directly — we\'ll do our best to accommodate.',
    category: 'Dietary',
  },
  {
    id: 'f5',
    question: 'Can I order a custom cake?',
    answer: 'Absolutely! We make celebration cakes for birthdays, weddings, and special occasions. Contact us with your requirements (size, design, dietary needs) and we\'ll provide a quote the same day.',
    category: 'Custom Orders',
  },
  {
    id: 'f6',
    question: 'How long do your treats stay fresh?',
    answer: 'Everything is baked the morning you receive it. Cookies and pastries are best within 2-3 days. Cakes stay fresh for 3-4 days refrigerated. Sourdough keeps well for 2-3 days at room temperature or longer in the freezer.',
    category: 'Storage',
  },
  {
    id: 'f7',
    question: 'What payment methods do you accept?',
    answer: 'We accept cash, EFTs, and mobile money payments. For large custom orders, a 50% deposit is required to confirm your order.',
    category: 'Payment',
  },
  {
    id: 'f8',
    question: 'Do you offer party trays or catering?',
    answer: 'Yes! Our party tray comes with 24 assorted treats and feeds 12 people happily. We also offer custom catering for events — contact us with your guest count and preferences.',
    category: 'Custom Orders',
  },
];
