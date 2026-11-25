import { cleanTitle, pick, titleFromLink } from '../../../supabase/functions/link-preview/preview';

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
