// Ligas importadas para o jogo. `article` = artigo da temporada atual na Wikipedia (inglês).
// `base` = força média aproximada de um clube mediano da liga (escala 1-99 do jogo).
// `alt` = títulos alternativos tentados caso o principal não exista.
export const LEAGUES = [
  // ===== AMÉRICA DO SUL =====
  { id: 'BRA1', name: 'Brasileirão Série A', country: 'Brasil', cc: 'BRA', continent: 'América do Sul', tier: 1, base: 74, size: 20, article: '2026 Campeonato Brasileiro Série A' },
  { id: 'BRA2', name: 'Brasileirão Série B', country: 'Brasil', cc: 'BRA', continent: 'América do Sul', tier: 2, base: 66, size: 20, article: '2026 Campeonato Brasileiro Série B' },
  { id: 'ARG1', name: 'Liga Profesional', country: 'Argentina', cc: 'ARG', continent: 'América do Sul', tier: 1, base: 70, size: 30, article: '2026 Argentine Primera División' },
  { id: 'URU1', name: 'Primera División', country: 'Uruguai', cc: 'URU', continent: 'América do Sul', tier: 1, base: 64, size: 16, article: '2026 Uruguayan Primera División season', alt: ['2026 Liga AUF Uruguaya'] },
  { id: 'COL1', name: 'Liga BetPlay', country: 'Colômbia', cc: 'COL', continent: 'América do Sul', tier: 1, base: 65, size: 20, article: '2026 Categoría Primera A season' },
  { id: 'CHI1', name: 'Primera División', country: 'Chile', cc: 'CHI', continent: 'América do Sul', tier: 1, base: 63, size: 16, article: '2026 Chilean Primera División', alt: ['2026 Chilean Primera División season', '2026 Liga de Primera'] },
  { id: 'PAR1', name: 'Primera División', country: 'Paraguai', cc: 'PAR', continent: 'América do Sul', tier: 1, base: 62, size: 12, article: '2026 Paraguayan Primera División season', alt: ['2026 Paraguayan Primera División', '2026 Primera División (Paraguay)', '2025 Paraguayan Primera División season'] },
  { id: 'ECU1', name: 'LigaPro Serie A', country: 'Equador', cc: 'ECU', continent: 'América do Sul', tier: 1, base: 63, size: 16, article: '2026 LigaPro Serie A', alt: ['2026 Ecuadorian Serie A'] },
  { id: 'PER1', name: 'Liga 1', country: 'Peru', cc: 'PER', continent: 'América do Sul', tier: 1, base: 60, size: 18, article: '2026 Liga 1 (Peru)', alt: ['2026 Peruvian Primera División'] },
  { id: 'BOL1', name: 'División Profesional', country: 'Bolívia', cc: 'BOL', continent: 'América do Sul', tier: 1, base: 56, size: 16, article: '2026 Bolivian Primera División season', alt: ['2026 Bolivian Primera División', '2025 Bolivian Primera División season', '2025 Bolivian Primera División'] },
  { id: 'VEN1', name: 'Liga FUTVE', country: 'Venezuela', cc: 'VEN', continent: 'América do Sul', tier: 1, base: 56, size: 14, article: '2026 Venezuelan Primera División season', alt: ['2026 Venezuelan Primera División', '2025 Venezuelan Primera División season'] },

  // ===== AMÉRICA DO NORTE / CENTRAL =====
  { id: 'USA1', name: 'MLS', country: 'EUA/Canadá', cc: 'USA', continent: 'América do Norte', tier: 1, base: 68, size: 30, article: '2026 Major League Soccer season' },
  { id: 'MEX1', name: 'Liga MX', country: 'México', cc: 'MEX', continent: 'América do Norte', tier: 1, base: 69, size: 18, article: '2026–27 Liga MX season' },

  // ===== EUROPA =====
  { id: 'ENG1', name: 'Premier League', country: 'Inglaterra', cc: 'ENG', continent: 'Europa', tier: 1, base: 80, size: 20, article: '2026–27 Premier League' },
  { id: 'ENG2', name: 'Championship', country: 'Inglaterra', cc: 'ENG', continent: 'Europa', tier: 2, base: 70, size: 24, article: '2026–27 EFL Championship' },
  { id: 'ESP1', name: 'LaLiga', country: 'Espanha', cc: 'ESP', continent: 'Europa', tier: 1, base: 78, size: 20, article: '2026–27 La Liga' },
  { id: 'ESP2', name: 'LaLiga 2', country: 'Espanha', cc: 'ESP', continent: 'Europa', tier: 2, base: 67, size: 22, article: '2026–27 Segunda División' },
  { id: 'ITA1', name: 'Serie A', country: 'Itália', cc: 'ITA', continent: 'Europa', tier: 1, base: 77, size: 20, article: '2026–27 Serie A' },
  { id: 'ITA2', name: 'Serie B', country: 'Itália', cc: 'ITA', continent: 'Europa', tier: 2, base: 66, size: 20, article: '2026–27 Serie B' },
  { id: 'GER1', name: 'Bundesliga', country: 'Alemanha', cc: 'GER', continent: 'Europa', tier: 1, base: 77, size: 18, article: '2026–27 Bundesliga' },
  { id: 'GER2', name: '2. Bundesliga', country: 'Alemanha', cc: 'GER', continent: 'Europa', tier: 2, base: 67, size: 18, article: '2026–27 2. Bundesliga' },
  { id: 'FRA1', name: 'Ligue 1', country: 'França', cc: 'FRA', continent: 'Europa', tier: 1, base: 75, size: 18, article: '2026–27 Ligue 1' },
  { id: 'FRA2', name: 'Ligue 2', country: 'França', cc: 'FRA', continent: 'Europa', tier: 2, base: 65, size: 18, article: '2026–27 Ligue 2' },
  { id: 'POR1', name: 'Liga Portugal', country: 'Portugal', cc: 'POR', continent: 'Europa', tier: 1, base: 71, size: 18, article: '2026–27 Primeira Liga' },
  { id: 'NED1', name: 'Eredivisie', country: 'Holanda', cc: 'NED', continent: 'Europa', tier: 1, base: 70, size: 18, article: '2026–27 Eredivisie' },
  { id: 'BEL1', name: 'Pro League', country: 'Bélgica', cc: 'BEL', continent: 'Europa', tier: 1, base: 69, size: 16, article: '2026–27 Belgian Pro League' },
  { id: 'TUR1', name: 'Süper Lig', country: 'Turquia', cc: 'TUR', continent: 'Europa', tier: 1, base: 70, size: 18, article: '2026–27 Süper Lig' },
  { id: 'SCO1', name: 'Premiership', country: 'Escócia', cc: 'SCO', continent: 'Europa', tier: 1, base: 65, size: 12, article: '2026–27 Scottish Premiership' },
  { id: 'GRE1', name: 'Super League', country: 'Grécia', cc: 'GRE', continent: 'Europa', tier: 1, base: 66, size: 14, article: '2026–27 Super League Greece' },
  { id: 'RUS1', name: 'Premier League', country: 'Rússia', cc: 'RUS', continent: 'Europa', tier: 1, base: 67, size: 16, article: '2026–27 Russian Premier League' },
  { id: 'UKR1', name: 'Premier League', country: 'Ucrânia', cc: 'UKR', continent: 'Europa', tier: 1, base: 63, size: 16, article: '2026–27 Ukrainian Premier League' },
  { id: 'AUT1', name: 'Bundesliga', country: 'Áustria', cc: 'AUT', continent: 'Europa', tier: 1, base: 65, size: 12, article: '2026–27 Austrian Football Bundesliga' },
  { id: 'SUI1', name: 'Super League', country: 'Suíça', cc: 'SUI', continent: 'Europa', tier: 1, base: 65, size: 12, article: '2026–27 Swiss Super League' },
  { id: 'DEN1', name: 'Superliga', country: 'Dinamarca', cc: 'DEN', continent: 'Europa', tier: 1, base: 65, size: 12, article: '2026–27 Danish Superliga' },
  { id: 'CRO1', name: 'HNL', country: 'Croácia', cc: 'CRO', continent: 'Europa', tier: 1, base: 63, size: 10, article: '2026–27 Croatian Football League', alt: ['2026–27 SuperSport HNL'] },
  { id: 'SRB1', name: 'SuperLiga', country: 'Sérvia', cc: 'SRB', continent: 'Europa', tier: 1, base: 62, size: 16, article: '2026–27 Serbian SuperLiga' },
  { id: 'CZE1', name: 'Chance Liga', country: 'Tchéquia', cc: 'CZE', continent: 'Europa', tier: 1, base: 64, size: 16, article: '2026–27 Czech First League' },
  { id: 'POL1', name: 'Ekstraklasa', country: 'Polônia', cc: 'POL', continent: 'Europa', tier: 1, base: 63, size: 18, article: '2026–27 Ekstraklasa' },
  { id: 'NOR1', name: 'Eliteserien', country: 'Noruega', cc: 'NOR', continent: 'Europa', tier: 1, base: 63, size: 16, article: '2026 Eliteserien' },
  { id: 'SWE1', name: 'Allsvenskan', country: 'Suécia', cc: 'SWE', continent: 'Europa', tier: 1, base: 63, size: 16, article: '2026 Allsvenskan' },

  // ===== ÁSIA =====
  { id: 'KSA1', name: 'Saudi Pro League', country: 'Arábia Saudita', cc: 'KSA', continent: 'Ásia', tier: 1, base: 69, size: 18, article: '2026–27 Saudi Pro League' },
  { id: 'JPN1', name: 'J1 League', country: 'Japão', cc: 'JPN', continent: 'Ásia', tier: 1, base: 67, size: 20, article: '2026–27 J1 League', alt: ['2026 J1 League'] },
  { id: 'KOR1', name: 'K League 1', country: 'Coreia do Sul', cc: 'KOR', continent: 'Ásia', tier: 1, base: 65, size: 12, article: '2026 K League 1' },
  { id: 'CHN1', name: 'Super League', country: 'China', cc: 'CHN', continent: 'Ásia', tier: 1, base: 62, size: 16, article: '2026 Chinese Super League' },
  { id: 'QAT1', name: 'Stars League', country: 'Catar', cc: 'QAT', continent: 'Ásia', tier: 1, base: 62, size: 12, article: '2026–27 Qatar Stars League' },
  { id: 'UAE1', name: 'Pro League', country: 'Emirados Árabes', cc: 'UAE', continent: 'Ásia', tier: 1, base: 62, size: 14, article: '2026–27 UAE Pro League' },

  // ===== ÁFRICA =====
  { id: 'EGY1', name: 'Premier League', country: 'Egito', cc: 'EGY', continent: 'África', tier: 1, base: 62, size: 21, article: '2026–27 Egyptian Premier League' },
  { id: 'MAR1', name: 'Botola Pro', country: 'Marrocos', cc: 'MAR', continent: 'África', tier: 1, base: 62, size: 16, article: '2026–27 Botola Pro' },
  { id: 'RSA1', name: 'Premiership', country: 'África do Sul', cc: 'RSA', continent: 'África', tier: 1, base: 60, size: 16, article: '2026–27 South African Premiership', alt: ['2026–27 South African Premier Division'] },
  { id: 'TUN1', name: 'Ligue 1', country: 'Tunísia', cc: 'TUN', continent: 'África', tier: 1, base: 58, size: 16, article: '2026–27 Tunisian Ligue Professionnelle 1' },
  { id: 'ALG1', name: 'Ligue 1', country: 'Argélia', cc: 'ALG', continent: 'África', tier: 1, base: 58, size: 16, article: '2026–27 Algerian Ligue Professionnelle 1' },

  // ===== OCEANIA =====
  { id: 'AUS1', name: 'A-League', country: 'Austrália/NZ', cc: 'AUS', continent: 'Oceania', tier: 1, base: 62, size: 12, article: '2026–27 A-League Men' },
];
