import type {Metadata} from 'next';
import './globals.css'; // Global styles

export const metadata: Metadata = {
  title: 'Shahbaz Furniture | شہباز فرنیچر — The Pakistani Collection',
  description: 'Shahbaz Furniture — Beds, sofas, doors, wardrobes, fitted kitchens and custom woodwork from the photo collection. شہباز فرنیچر — اپنے گھر کے لیے اپنی پسند کا فرنیچر۔',
  openGraph: {
    title: 'Shahbaz Furniture | شہباز فرنیچر',
    description: 'Explore real design photographs: beds, sofas, doors, wardrobes and kitchens. اپنی پسند منتخب کریں۔',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Shahbaz Furniture | شہباز فرنیچر',
    description: 'Explore real design photographs: beds, sofas, doors, wardrobes and kitchens. اپنی پسند منتخب کریں۔',
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" dir="ltr">
      <head>
        <link rel="icon" href="/assets/favicon.svg" type="image/svg+xml" />
        <link rel="stylesheet" href="/styles.css" />
      </head>
      <body suppressHydrationWarning>{children}</body>
    </html>
  );
}
