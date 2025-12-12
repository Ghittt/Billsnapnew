-- Import legacy reviews from frontend hardcoded data
-- Matches 'feedback' table constraints (category, rating, message NOT NULL)
INSERT INTO feedback (
  review_name,
  review_location,
  review_text,
  review_stars,
  profile_photo_url,
  is_approved,
  show_in_carousel,
  email_verified,
  created_at,
  -- Required legacy fields
  category,
  rating,
  message
) VALUES
(
  'Giuseppe',
  'Palermo',
  'Finalmente ho capito quanto spendo! Grazie a BillSnap ho chiarezza sulle mie bollette.',
  5,
  '/reviews/motorcycle.png',
  true,
  true,
  true,
  NOW() - INTERVAL '10 days',
  'review', 5, 'Legacy import'
),
(
  'Giorgio A.',
  'Milano',
  'Ottimo servizio, veloce e preciso. L''analisi è arrivata in pochi istanti.',
  5,
  '/reviews/giorgio_real.png',
  true,
  true,
  true,
  NOW() - INTERVAL '9 days',
  'review', 5, 'Legacy import'
),
(
  'Marco',
  'Milano',
  'Consigliatissimo per risparmiare. Ho trovato un''offerta molto più conveniente.',
  5,
  '/reviews/sea.png',
  true,
  true,
  true,
  NOW() - INTERVAL '8 days',
  'review', 5, 'Legacy import'
),
(
  'Laura',
  'Milano',
  'Facile da usare, interfaccia pulita. Mi piace molto come vengono presentati i dati.',
  5,
  '/reviews/laura.png',
  true,
  true,
  true,
  NOW() - INTERVAL '7 days',
  'review', 5, 'Legacy import'
),
(
  'Elena',
  'Milano',
  'Grazie a BillSnap ho cambiato fornitore in un attimo. Procedura semplicissima.',
  5,
  '/reviews/mountain.png',
  true,
  true,
  true,
  NOW() - INTERVAL '6 days',
  'review', 5, 'Legacy import'
),
(
  'Francesco',
  'Firenze',
  'Utile e intuitivo. La lettura della bolletta funziona benissimo anche con foto non perfette.',
  5,
  '/reviews/poetry.png',
  true,
  true,
  true,
  NOW() - INTERVAL '5 days',
  'review', 5, 'Legacy import'
),
(
  'Alessandro',
  'Lacchiarella (MI)',
  'Analisi bolletta super dettagliata. Mai visto un servizio così completo.',
  5,
  '/reviews/couple.png',
  true,
  true,
  true,
  NOW() - INTERVAL '4 days',
  'review', 5, 'Legacy import'
),
(
  'Roberto',
  'Spiazzi di Gromo',
  'Pensavo fosse complicato invece è semplicissimo. Anche per chi non è esperto.',
  5,
  '/reviews/city.png',
  true,
  true,
  true,
  NOW() - INTERVAL '3 days',
  'review', 5, 'Legacy import'
),
(
  'Sofia',
  'Cassina de'' Pecchi',
  'Risparmiati 150€ l''anno! Non ci credevo finché non ho visto la prima bolletta.',
  5,
  '/reviews/sunset.png',
  true,
  true,
  true,
  NOW() - INTERVAL '2 days',
  'review', 5, 'Legacy import'
),
(
  'Matteo',
  'Roma',
  'Servizio eccellente. Il supporto risponde subito e l''app è fatta bene.',
  5,
  '/reviews/matteo.png',
  true,
  true,
  true,
  NOW() - INTERVAL '1 days',
  'review', 5, 'Legacy import'
);
