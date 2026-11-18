-- APPLIED 2026-11-19 as migration more_shop_domains (Arpit: allow other commerce, e-commerce and
-- quick commerce sites too, e.g. store.playstation.com for GTA VI).
-- A domain also allows its subdomains (store.playstation.com via playstation.com).
-- Left out on purpose: sites where anyone can host a page under the domain (google.com, myshopify.com,
-- blogspot.com) and link shorteners from no shop (bit.ly). Google is allowed only for Play and its store.
insert into public.allowed_link_domains (domain) values
  -- games and app stores
  ('playstation.com'), ('xbox.com'), ('microsoft.com'), ('nintendo.com'), ('steampowered.com'),
  ('epicgames.com'), ('ea.com'), ('ubisoft.com'), ('rockstargames.com'), ('gog.com'), ('meta.com'),
  ('play.google.com'), ('store.google.com'),
  -- quick commerce and general shopping
  ('dunzo.com'), ('dmart.in'), ('shopclues.com'), ('indiamart.com'), ('ebay.com'), ('etsy.com'),
  ('licious.in'), ('freshtohome.com'), ('dominos.co.in'),
  -- electronics and computers
  ('dell.com'), ('hp.com'), ('lenovo.com'), ('asus.com'), ('lg.com'), ('sony.co.in'), ('realme.com'),
  ('vivo.com'), ('oppo.com'), ('motorola.com'), ('nothing.tech'), ('gonoise.com'), ('jbl.com'),
  ('logitech.com'), ('mdcomputers.in'), ('primeabgb.com'),
  -- fashion, beauty, jewellery, watches
  ('bewakoof.com'), ('thesouledstore.com'), ('westside.com'), ('lifestylestores.com'), ('shoppersstop.com'),
  ('pantaloons.com'), ('fabindia.com'), ('marksandspencer.in'), ('mango.com'), ('levi.in'), ('uspoloassn.in'),
  ('crocs.in'), ('skechers.in'), ('purplle.com'), ('sugarcosmetics.com'), ('mamaearth.in'),
  ('plumgoodness.com'), ('tanishq.co.in'), ('caratlane.com'), ('titan.co.in'), ('fastrack.in'),
  -- home and kids
  ('wakefit.co'), ('homecentre.in'), ('hometown.in'), ('hamleys.in'),
  -- travel and tickets
  ('yatra.com'), ('easemytrip.com'), ('ixigo.com'), ('airindia.com'), ('goindigo.in'), ('booking.com'),
  ('agoda.com'), ('airbnb.com'), ('airbnb.co.in'), ('redbus.in'), ('oyorooms.com'), ('insider.in'),
  -- cars and bikes
  ('cardekho.com'), ('carwale.com'), ('bikewale.com'), ('atherenergy.com'), ('olaelectric.com'),
  ('royalenfield.com'),
  -- second-hand and refurbished (the "cheaper option")
  ('olx.in'), ('cashify.in'), ('quikr.com'),
  -- pharmacy
  ('1mg.com'), ('pharmeasy.in'), ('netmeds.com'), ('apollopharmacy.in')
on conflict (domain) do nothing;
