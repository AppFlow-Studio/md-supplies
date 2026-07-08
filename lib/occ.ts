import type { OCCHub } from '@/types/occ'

export const OCC_HUB: OCCHub = {
  title: 'OCC Shoebox Supplies',
  intro: 'Bulk supplies, hygiene items, school essentials, backpacks, and gifts for shoebox gift drives — churches, nonprofits, charities, and mission groups.',
  programExplanation: 'Shoebox gift drives collect small, practical gifts — hygiene items, school supplies, toys, and more — and deliver them to children in need around the world. MDSupplies supplies churches, mission teams, nonprofits, and community groups with the bulk hygiene kits, school supplies, backpacks, crayons, coloring books, and gift items that fill those boxes. Whether you pack ten shoeboxes or ten thousand, we stock the quantities and variety you need to make every gift count.',
  freeShippingMessage: '',
  eligibleCategories: [
    { handle: 'hygiene-kits',    title: 'Hygiene Kits' },
    { handle: 'school-supplies', title: 'School Supplies' },
    { handle: 'backpacks',       title: 'Backpacks' },
    { handle: 'gifts-toys',      title: 'Gifts & Toys' },
  ],
  eligibleProducts: [
    { handle: 'occ-hygiene-kit',       title: 'Hygiene Kit',        image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Hygiene+Kit',    price: 599  },
    { handle: 'occ-school-supply-kit', title: 'School Supply Kit',  image: 'https://placehold.co/400x400/fef9c3/854d0e?text=School+Kit',     price: 799  },
    { handle: 'occ-backpack',          title: 'Backpack',           image: 'https://placehold.co/400x400/e5eff7/0086b1?text=Backpack',       price: 1299 },
    { handle: 'occ-coloring-book',     title: 'Coloring Book Set',  image: 'https://placehold.co/400x400/dbeafe/1d4ed8?text=Coloring+Books', price: 299  },
    { handle: 'occ-crayons',           title: 'Crayons (12-Pack)',  image: 'https://placehold.co/400x400/fef9c3/854d0e?text=Crayons',        price: 149  },
    { handle: 'occ-plush-toy',         title: 'Plush Toy',          image: 'https://placehold.co/400x400/f0fdf4/166534?text=Plush+Toy',      price: 899  },
  ],
  faq: [
    {
      question: 'What is Operation Christmas Child?',
      answer: 'Operation Christmas Child is a global project that collects gift-filled shoeboxes and delivers them to children in need in more than 100 countries. Churches, schools, nonprofits, and individuals pack shoeboxes with small toys, hygiene items, school supplies, and other practical gifts.',
    },
    {
      question: 'Can our church or nonprofit order in bulk?',
      answer: 'Yes. We supply churches, mission teams, nonprofits, and community groups of any size. Whether you are packing a few dozen shoeboxes or organizing a large community drive, we carry the quantities you need. Contact our B2B team to discuss volume pricing.',
    },
    {
      question: 'What types of items are good for shoeboxes?',
      answer: 'Popular shoebox items include hygiene kits (toothbrushes, soap, washcloths), school supplies (crayons, coloring books, pencils, rulers), small toys, backpacks, and soft stuffed animals. We stock all of these categories in bulk.',
    },
    {
      question: 'Do you offer volume pricing for OCC drives?',
      answer: 'Yes. Approved accounts can access volume pricing tiers for large OCC orders. Contact us via the form below and mention your OCC drive — our team will set up your account and confirm applicable pricing.',
    },
    {
      question: 'How do I place a bulk OCC order?',
      answer: 'Browse the OCC collection above and add items to your cart for standard checkout, or contact our B2B team to set up an account for volume orders, purchase orders, or net terms.',
    },
  ],
  seoTitle: 'OCC Shoebox Supplies — Bulk Kits, Hygiene & Gifts | MDSupplies',
  seoDescription: 'Shop bulk Operation Christmas Child (OCC) shoebox supplies — hygiene kits, school supply kits, backpacks, crayons, coloring books, and gifts for churches, nonprofits, and mission groups.',
}
