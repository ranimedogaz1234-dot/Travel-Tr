/**
 * Catalogue de démonstration — données entièrement fictives.
 * Photos : Unsplash (licence Unsplash, https://unsplash.com/license).
 */

import { transaction } from './database.js';

const photo = (id) => `https://images.unsplash.com/photo-${id}?auto=format&fit=crop&w=1200&q=75`;

export const DESTINATIONS = [
  {
    slug: 'paris',
    name: 'Paris',
    country: 'France',
    travelType: 'Ville',
    shortDescription: 'La Ville Lumière, ses musées, ses bistrots et ses quais de Seine.',
    description:
      "Flânez le long de la Seine, montez au sommet de la tour Eiffel au coucher du soleil et laissez-vous surprendre par les ruelles de Montmartre. Ce séjour combine visites incontournables et temps libre pour découvrir Paris à votre rythme : musées de renommée mondiale, cafés en terrasse et quartiers aux mille visages.",
    durationDays: 5,
    rating: 4.8,
    featured: true,
    images: [photo('1511739001486-6bfe10ce785f'), photo('1502602898657-3e91760cbb34')],
    highlights: ['Hôtel 4★ au centre', 'Croisière sur la Seine', 'Pass musées 2 jours'],
    activities: [
      ['Croisière sur la Seine', 'Une heure de navigation au fil des monuments illuminés.', '1 h', true],
      ['Visite guidée de Montmartre', 'Le Sacré-Cœur, la place du Tertre et les vignes cachées.', '3 h', true],
      ['Dîner gastronomique', 'Menu dégustation dans un bistrot réputé du Marais.', '2 h 30', false],
    ],
    trips: [
      ['Escapade parisienne', 21, 890, 20],
      ['Paris au printemps', 75, 940, 24],
      ['Paris en famille', 140, 990, 30],
    ],
  },
  {
    slug: 'santorin',
    name: 'Santorin',
    country: 'Grèce',
    travelType: 'Plage',
    shortDescription: 'Maisons blanches, dômes bleus et couchers de soleil sur la caldeira.',
    description:
      "Santorin est l'île la plus photogénique des Cyclades. Entre les villages perchés d'Oia et de Fira, les plages de sable volcanique et les domaines viticoles, ce voyage vous offre un équilibre parfait entre détente, gastronomie et paysages spectaculaires.",
    durationDays: 7,
    rating: 4.9,
    featured: true,
    images: [photo('1613395877344-13d4a8e0d49e'), photo('1580502304784-8985b7eb7260')],
    highlights: ['Hôtel avec vue sur la caldeira', 'Petits-déjeuners inclus', 'Transferts aéroport'],
    activities: [
      ['Croisière dans la caldeira', 'Baignade dans les sources chaudes et escale sur le volcan.', '5 h', true],
      ['Dégustation de vins', 'Visite d’un domaine et découverte des cépages locaux.', '2 h', false],
      ['Coucher de soleil à Oia', 'Le spectacle le plus célèbre de l’île depuis les remparts.', '2 h', true],
    ],
    trips: [
      ['Santorin, l’île bleue', 30, 1390, 18],
      ['Santorin en été', 95, 1590, 22],
      ['Santorin hors saison', 170, 1240, 16],
    ],
  },
  {
    slug: 'marrakech',
    name: 'Marrakech',
    country: 'Maroc',
    travelType: 'Culture',
    shortDescription: 'Souks colorés, riads paisibles et vue sur l’Atlas.',
    description:
      "Plongez dans l'effervescence de la place Jemaa el-Fna, perdez-vous dans les souks de la médina puis retrouvez le calme d'un riad traditionnel. Une excursion dans les montagnes de l'Atlas complète ce voyage riche en couleurs et en saveurs.",
    durationDays: 6,
    rating: 4.7,
    featured: true,
    images: [photo('1597212618440-806262de4f6b'), photo('1653323792487-6ecc6217040b')],
    highlights: ['Séjour en riad', 'Excursion dans l’Atlas', 'Cours de cuisine marocaine'],
    activities: [
      ['Visite de la médina', 'Souks, palais de la Bahia et médersa Ben Youssef.', '4 h', true],
      ['Excursion dans l’Atlas', 'Villages berbères et déjeuner avec vue sur les sommets.', '1 jour', true],
      ['Hammam traditionnel', 'Un moment de détente dans un hammam authentique.', '1 h 30', false],
    ],
    trips: [
      ['Marrakech authentique', 18, 690, 25],
      ['Marrakech et l’Atlas', 60, 760, 20],
      ['Marrakech en hiver', 125, 640, 25],
    ],
  },
  {
    slug: 'djerba',
    name: 'Djerba',
    country: 'Tunisie',
    travelType: 'Plage',
    shortDescription: 'Plages de sable fin, eaux turquoise et patrimoine méditerranéen.',
    description:
      "L'île de Djerba allie farniente et découvertes. Profitez de ses longues plages, visitez Houmt Souk et ses artisans, découvrez la synagogue de la Ghriba et les fresques de Djerbahood. Un séjour lumineux, idéal en famille comme entre amis.",
    durationDays: 7,
    rating: 4.6,
    featured: false,
    images: [photo('1598554361597-0858e58aee6f'), photo('1695922428403-e92d21d8d465')],
    highlights: ['Hôtel en bord de mer', 'Demi-pension', 'Visite de Djerbahood'],
    activities: [
      ['Balade à Houmt Souk', 'Marché, artisans potiers et ruelles blanches.', '3 h', true],
      ['Djerbahood', 'Le village-musée d’art urbain d’Erriadh.', '2 h', true],
      ['Sortie en mer', 'Excursion en bateau vers l’île aux flamants roses.', '1 jour', false],
    ],
    trips: [
      ['Djerba, douceur méditerranéenne', 25, 590, 30],
      ['Djerba en famille', 80, 650, 35],
      ['Djerba au soleil d’automne', 150, 560, 30],
    ],
  },
  {
    slug: 'kyoto',
    name: 'Kyoto',
    country: 'Japon',
    travelType: 'Culture',
    shortDescription: 'Temples millénaires, jardins zen et traditions japonaises.',
    description:
      "Ancienne capitale impériale, Kyoto concentre plus de mille temples et sanctuaires. Ce voyage vous emmène des torii vermillon de Fushimi Inari à la forêt de bambous d'Arashiyama, en passant par le quartier de Gion et ses maisons de thé.",
    durationDays: 10,
    rating: 4.9,
    featured: true,
    images: [photo('1545569341-9eb8b30979d9')],
    highlights: ['Nuit en ryokan', 'Cérémonie du thé', 'Japan Rail Pass 7 jours'],
    activities: [
      ['Fushimi Inari', 'Randonnée sous des milliers de torii.', '3 h', true],
      ['Cérémonie du thé', 'Initiation au rituel du thé matcha.', '1 h 30', true],
      ['Excursion à Nara', 'Le grand Bouddha et les daims du parc.', '1 jour', false],
    ],
    trips: [
      ['Kyoto essentiel', 45, 2390, 14],
      ['Kyoto, saison des érables', 110, 2590, 14],
      ['Kyoto, cerisiers en fleurs', 190, 2790, 12],
    ],
  },
  {
    slug: 'bali',
    name: 'Bali',
    country: 'Indonésie',
    travelType: 'Nature',
    shortDescription: 'Rizières en terrasses, temples sur l’eau et plages tropicales.',
    description:
      "Entre rizières d'Ubud, temples hindous et plages de la péninsule de Bukit, Bali est une invitation à la sérénité. Ce circuit associe nature, culture et détente, avec une journée d'excursion vers l'île voisine de Nusa Penida.",
    durationDays: 12,
    rating: 4.8,
    featured: true,
    images: [photo('1604999333679-b86d54738315'), photo('1577717903315-1691ae25ab3f')],
    highlights: ['Villa avec piscine à Ubud', 'Guide francophone', 'Excursion à Nusa Penida'],
    activities: [
      ['Rizières de Tegallalang', 'Balade au lever du soleil dans les terrasses.', '3 h', true],
      ['Temple d’Ulun Danu Bratan', 'Le temple flottant au bord du lac Bratan.', '4 h', true],
      ['Snorkeling à Nusa Penida', 'Rencontre avec les raies manta.', '1 jour', false],
    ],
    trips: [
      ['Bali, île des dieux', 40, 1890, 16],
      ['Bali nature et détente', 100, 1990, 16],
      ['Bali en famille', 180, 2090, 20],
    ],
  },
  {
    slug: 'rome',
    name: 'Rome',
    country: 'Italie',
    travelType: 'Culture',
    shortDescription: 'Le Colisée, le Vatican et la dolce vita.',
    description:
      "Rome est un musée à ciel ouvert. Découvrez le Colisée et le Forum romain, émerveillez-vous devant la chapelle Sixtine, puis savourez une glace sur la piazza Navona. Un séjour culturel et gourmand au cœur de la Ville éternelle.",
    durationDays: 5,
    rating: 4.7,
    featured: false,
    images: [photo('1552832230-c0197dd311b5'), photo('1555992828-ca4dbe41d294')],
    highlights: ['Accès coupe-file au Colisée', 'Visite des musées du Vatican', 'Hôtel près de Termini'],
    activities: [
      ['Colisée et Forum romain', 'Visite guidée avec accès coupe-file.', '3 h', true],
      ['Musées du Vatican', 'La chapelle Sixtine et les chambres de Raphaël.', '3 h', true],
      ['Atelier pâtes fraîches', 'Cours de cuisine avec un chef romain.', '2 h', false],
    ],
    trips: [
      ['Rome éternelle', 28, 820, 22],
      ['Rome et le Vatican', 70, 880, 22],
      ['Rome, week-end prolongé', 135, 760, 20],
    ],
  },
  {
    slug: 'islande',
    name: 'Reykjavik et le Sud',
    country: 'Islande',
    travelType: 'Aventure',
    shortDescription: 'Glaciers, cascades, plages noires et aurores boréales.',
    description:
      "Partez à la découverte des paysages les plus spectaculaires d'Islande : le Cercle d'or, les cascades de Seljalandsfoss et Skógafoss, la plage de sable noir de Vík et la lagune glaciaire de Jökulsárlón. En saison, la chasse aux aurores boréales complète l'aventure.",
    durationDays: 8,
    rating: 4.9,
    featured: true,
    images: [photo('1500043357865-c6b8827edf10'), photo('1529963183134-61a90db47eaf')],
    highlights: ['Voiture 4x4 incluse', 'Randonnée sur glacier', 'Sortie aurores boréales'],
    activities: [
      ['Le Cercle d’or', 'Þingvellir, Geysir et la cascade de Gullfoss.', '1 jour', true],
      ['Randonnée sur glacier', 'Marche encadrée sur le glacier Sólheimajökull.', '3 h', true],
      ['Lagon bleu', 'Baignade dans les eaux géothermales.', '2 h', false],
    ],
    trips: [
      ['Islande, terre de feu et de glace', 50, 2190, 12],
      ['Islande, aurores boréales', 115, 2390, 12],
      ['Islande, soleil de minuit', 200, 2490, 12],
    ],
  },
  {
    slug: 'new-york',
    name: 'New York',
    country: 'États-Unis',
    travelType: 'Ville',
    shortDescription: 'Gratte-ciel, Broadway et le pont de Brooklyn.',
    description:
      "De Times Square à Central Park, de Brooklyn à la statue de la Liberté, New York est une ville qui ne dort jamais. Ce séjour vous laisse le temps d'explorer ses quartiers emblématiques, ses musées et sa scène culinaire unique.",
    durationDays: 7,
    rating: 4.7,
    featured: false,
    images: [photo('1496588152823-86ff7695e68f'), photo('1485871981521-5b1fd3805eee')],
    highlights: ['Hôtel à Manhattan', 'CityPASS inclus', 'Croisière vers la statue de la Liberté'],
    activities: [
      ['Traversée du pont de Brooklyn', 'Balade guidée jusqu’à DUMBO.', '2 h', true],
      ['Top of the Rock', 'Vue panoramique sur Manhattan.', '1 h', true],
      ['Comédie musicale à Broadway', 'Billet pour un spectacle au choix.', '3 h', false],
    ],
    trips: [
      ['New York, la Grosse Pomme', 35, 1690, 20],
      ['New York, fêtes de fin d’année', 90, 1990, 20],
      ['New York au printemps', 160, 1790, 20],
    ],
  },
  {
    slug: 'barcelone',
    name: 'Barcelone',
    country: 'Espagne',
    travelType: 'Ville',
    shortDescription: 'Gaudí, tapas et plages au cœur de la ville.',
    description:
      "Barcelone conjugue architecture, mer et art de vivre. Admirez la Sagrada Família et le parc Güell, flânez sur les Ramblas et dans le quartier gothique, puis terminez la journée sur la plage de la Barceloneta autour de tapas.",
    durationDays: 4,
    rating: 4.6,
    featured: false,
    images: [photo('1583422409516-2895a77efded'), photo('1630219694734-fe47ab76b15e')],
    highlights: ['Billets Sagrada Família', 'Hôtel dans l’Eixample', 'Tour gastronomique'],
    activities: [
      ['Sagrada Família', 'Visite de la basilique avec audioguide.', '2 h', true],
      ['Parc Güell', 'Les mosaïques et la vue sur la ville.', '2 h', true],
      ['Tour des tapas', 'Dégustation dans le quartier du Born.', '3 h', false],
    ],
    trips: [
      ['Barcelone express', 15, 540, 25],
      ['Barcelone et Gaudí', 65, 590, 25],
      ['Barcelone au soleil', 130, 620, 25],
    ],
  },
];

const DAY = 24 * 60 * 60 * 1000;

function isoDate(offsetDays) {
  const d = new Date(Date.now() + offsetDays * DAY);
  return d.toISOString().slice(0, 10);
}

/** Insère le catalogue (destinations, activités, départs). Les dates sont relatives à aujourd'hui. */
export function seedCatalog(db) {
  const insertDestination = db.prepare(`
    INSERT INTO destinations (slug, name, country, travel_type, short_description, description,
      price_from, duration_days, rating, featured, image_url, gallery, highlights)
    VALUES (@slug, @name, @country, @travelType, @shortDescription, @description,
      @priceFrom, @durationDays, @rating, @featured, @imageUrl, @gallery, @highlights)`);
  const insertActivity = db.prepare(
    'INSERT INTO activities (destination_id, name, description, duration, included) VALUES (?, ?, ?, ?, ?)',
  );
  const insertTrip = db.prepare(`
    INSERT INTO trips (destination_id, title, departure_date, return_date, price, seats_total, seats_available)
    VALUES (?, ?, ?, ?, ?, ?, ?)`);

  transaction(db, () => {
    for (const d of DESTINATIONS) {
      const { lastInsertRowid: destinationId } = insertDestination.run({
        slug: d.slug,
        name: d.name,
        country: d.country,
        travelType: d.travelType,
        shortDescription: d.shortDescription,
        description: d.description,
        priceFrom: Math.min(...d.trips.map((t) => t[2])),
        durationDays: d.durationDays,
        rating: d.rating,
        featured: d.featured ? 1 : 0,
        imageUrl: d.images[0],
        gallery: JSON.stringify(d.images),
        highlights: JSON.stringify(d.highlights),
      });
      for (const [name, description, duration, included] of d.activities) {
        insertActivity.run(destinationId, name, description, duration, included ? 1 : 0);
      }
      for (const [title, offset, price, seats] of d.trips) {
        insertTrip.run(destinationId, title, isoDate(offset), isoDate(offset + d.durationDays - 1), price, seats, seats);
      }
    }
  });
}
