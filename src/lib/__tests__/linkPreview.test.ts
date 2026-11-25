import { cleanTitle, photoKind, pick, smallerPhoto, titleFromLink } from '../../../supabase/functions/link-preview/preview';
import { photoUrl } from '../photo';

describe('link preview: reading a shop page', () => {
  it('shortens Amazon titles to an item name', () => {
    expect(cleanTitle('The Sleep Company Orthopedic GRID Mattress | Doctor-Recommended Support for a Healthy Back | Patented')).toBe(
      'The Sleep Company Orthopedic GRID Mattress',
    );
    expect(cleanTitle('Apple 2026 MacBook Pro Laptop with M5 Pro chip with 15-core CPU and 16-core GPU: Built for AI, 35.97 cm')).toBe(
      'Apple 2026 MacBook Pro Laptop with M5 Pro chip with 15-core CPU and 16-core GPU',
    );
    expect(cleanTitle('Amazon.in: Buy Sony WH-1000XM5 Online at Low Prices in India | Sony Reviews')).toBe('Sony WH-1000XM5');
  });

  it('takes the product name from a Flipkart link when the page refuses us', () => {
    const u = new URL('https://www.flipkart.com/optimum-nutrition-gold-standard-100-whey-protein-powder-2-lbs-micronised-creatine/p/itm99a7adea73fa0');
    expect(titleFromLink(u)).toBe('Optimum Nutrition Gold Standard 100 Whey Protein Powder 2 Lbs Micronised'); // cut to fit 80
    expect(titleFromLink(new URL('https://www.amazon.in/dp/B0G35K7ZZC'))).toBeNull();
  });

  it("finds Amazon's product photo and the usual og tags", () => {
    const amazon = '<title>Amazon.in: Buy Kettle</title><script>{"hiRes":"https://m.media-amazon.com/images/I/71abc.jpg","thumb":"x"}</script>';
    expect(pick(amazon, new URL('https://www.amazon.in/dp/X'))).toEqual({ title: 'Kettle', image: 'https://m.media-amazon.com/images/I/71abc.jpg' });
    const ikea = '<meta property="og:title" content="KNAPPER standing mirror &amp; stand"><meta content="/in/en/images/a.jpg" property="og:image">';
    expect(pick(ikea, new URL('https://www.ikea.com/in/en/p/x/'))).toEqual({ title: 'KNAPPER standing mirror & stand', image: 'https://www.ikea.com/in/en/images/a.jpg' });
  });

  it('a robot-check page is no preview', () => {
    expect(pick('<title>Robot Check</title>', new URL('https://www.amazon.in/dp/X'))).toEqual({ title: null, image: null });
  });
});

describe('product photos kept on our server', () => {
  it('asks Amazon and Flipkart for a ~400 px copy', () => {
    expect(smallerPhoto('https://m.media-amazon.com/images/I/71Ab+cD-9L._SL1500_.jpg')).toBe('https://m.media-amazon.com/images/I/71Ab+cD-9L._SL400_.jpg');
    expect(smallerPhoto('https://m.media-amazon.com/images/I/61xyzABC.jpg')).toBe('https://m.media-amazon.com/images/I/61xyzABC._SL400_.jpg');
    expect(smallerPhoto('https://rukminim2.flixcart.com/image/832/832/xif0q/mattress/abc.jpeg?q=70')).toBe(
      'https://rukminim2.flixcart.com/image/416/416/xif0q/mattress/abc.jpeg?q=70',
    );
    expect(smallerPhoto('https://www.ikea.com/in/en/images/products/x.jpg')).toBe('https://www.ikea.com/in/en/images/products/x.jpg');
    expect(smallerPhoto('not a url')).toBe('not a url');
  });

  it('keeps only real JPG, PNG and WebP pictures', () => {
    expect(photoKind(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0]))?.ext).toBe('jpg');
    expect(photoKind(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0]))?.ext).toBe('png');
    expect(photoKind(new TextEncoder().encode('RIFF1234WEBPVP8 '))?.ext).toBe('webp');
    expect(photoKind(new TextEncoder().encode('<svg xmlns="http://www.w3.org/2000/svg"></svg>'))).toBeNull();
    expect(photoKind(new TextEncoder().encode('<html>nope</html>'))).toBeNull();
  });

  it('builds the photo address from the file name only', () => {
    const id = '0e1f2a3b-4c5d-4e6f-8a9b-0c1d2e3f4a5b';
    expect(photoUrl(`${id}.jpg`, 'https://x.supabase.co')).toBe(`https://x.supabase.co/storage/v1/object/public/photos/${id}.jpg`);
    expect(photoUrl('https://evil.example.com/x.jpg', 'https://x.supabase.co')).toBeNull();
    expect(photoUrl('../secret.jpg', 'https://x.supabase.co')).toBeNull();
    expect(photoUrl(null, 'https://x.supabase.co')).toBeNull();
    expect(photoUrl('data:image/png;base64,AAAA', undefined)).toBe('data:image/png;base64,AAAA');
  });
});
