import { Match } from "./types";

export const FIXTURE: Omit<Match, "homeScore" | "awayScore" | "finished">[] = [
  // GRUPO A
  { id: "A1", matchNumber: 1, stage: "group", group: "A", homeTeam: "México", awayTeam: "Jamaica", homeFlag: "🇲🇽", awayFlag: "🇯🇲", datetime: "2026-06-11T18:00:00", venue: "Ciudad de México" },
  { id: "A2", matchNumber: 2, stage: "group", group: "A", homeTeam: "Ecuador", awayTeam: "Venezuela", homeFlag: "🇪🇨", awayFlag: "🇻🇪", datetime: "2026-06-11T21:00:00", venue: "Dallas" },
  { id: "A3", matchNumber: 13, stage: "group", group: "A", homeTeam: "México", awayTeam: "Ecuador", homeFlag: "🇲🇽", awayFlag: "🇪🇨", datetime: "2026-06-15T18:00:00", venue: "Ciudad de México" },
  { id: "A4", matchNumber: 14, stage: "group", group: "A", homeTeam: "Jamaica", awayTeam: "Venezuela", homeFlag: "🇯🇲", awayFlag: "🇻🇪", datetime: "2026-06-15T21:00:00", venue: "Atlanta" },
  { id: "A5", matchNumber: 25, stage: "group", group: "A", homeTeam: "Venezuela", awayTeam: "México", homeFlag: "🇻🇪", awayFlag: "🇲🇽", datetime: "2026-06-19T21:00:00", venue: "Guadalajara" },
  { id: "A6", matchNumber: 26, stage: "group", group: "A", homeTeam: "Ecuador", awayTeam: "Jamaica", homeFlag: "🇪🇨", awayFlag: "🇯🇲", datetime: "2026-06-19T21:00:00", venue: "Dallas" },

  // GRUPO B
  { id: "B1", matchNumber: 3, stage: "group", group: "B", homeTeam: "USA", awayTeam: "Belice/Caribe", homeFlag: "🇺🇸", awayFlag: "🏴", datetime: "2026-06-12T18:00:00", venue: "Los Ángeles" },
  { id: "B2", matchNumber: 4, stage: "group", group: "B", homeTeam: "Panamá", awayTeam: "Albania", homeFlag: "🇵🇦", awayFlag: "🇦🇱", datetime: "2026-06-12T21:00:00", venue: "Kansas City" },
  { id: "B3", matchNumber: 15, stage: "group", group: "B", homeTeam: "USA", awayTeam: "Panamá", homeFlag: "🇺🇸", awayFlag: "🇵🇦", datetime: "2026-06-16T18:00:00", venue: "Los Ángeles" },
  { id: "B4", matchNumber: 16, stage: "group", group: "B", homeTeam: "Albania", awayTeam: "Belice/Caribe", homeFlag: "🇦🇱", awayFlag: "🏴", datetime: "2026-06-16T21:00:00", venue: "Nueva York" },
  { id: "B5", matchNumber: 27, stage: "group", group: "B", homeTeam: "Belice/Caribe", awayTeam: "Panamá", homeFlag: "🏴", awayFlag: "🇵🇦", datetime: "2026-06-20T21:00:00", venue: "Seattle" },
  { id: "B6", matchNumber: 28, stage: "group", group: "B", homeTeam: "Albania", awayTeam: "USA", homeFlag: "🇦🇱", awayFlag: "🇺🇸", datetime: "2026-06-20T21:00:00", venue: "Kansas City" },

  // GRUPO C
  { id: "C1", matchNumber: 5, stage: "group", group: "C", homeTeam: "Canadá", awayTeam: "Honduras", homeFlag: "🇨🇦", awayFlag: "🇭🇳", datetime: "2026-06-12T21:00:00", venue: "Vancouver" },
  { id: "C2", matchNumber: 6, stage: "group", group: "C", homeTeam: "Marruecos", awayTeam: "Portugal", homeFlag: "🇲🇦", awayFlag: "🇵🇹", datetime: "2026-06-12T18:00:00", venue: "Toronto" },
  { id: "C3", matchNumber: 17, stage: "group", group: "C", homeTeam: "Canadá", awayTeam: "Marruecos", homeFlag: "🇨🇦", awayFlag: "🇲🇦", datetime: "2026-06-16T21:00:00", venue: "Vancouver" },
  { id: "C4", matchNumber: 18, stage: "group", group: "C", homeTeam: "Portugal", awayTeam: "Honduras", homeFlag: "🇵🇹", awayFlag: "🇭🇳", datetime: "2026-06-16T18:00:00", venue: "Boston" },
  { id: "C5", matchNumber: 29, stage: "group", group: "C", homeTeam: "Honduras", awayTeam: "Marruecos", homeFlag: "🇭🇳", awayFlag: "🇲🇦", datetime: "2026-06-20T21:00:00", venue: "Miami" },
  { id: "C6", matchNumber: 30, stage: "group", group: "C", homeTeam: "Portugal", awayTeam: "Canadá", homeFlag: "🇵🇹", awayFlag: "🇨🇦", datetime: "2026-06-20T21:00:00", venue: "Toronto" },

  // GRUPO D
  { id: "D1", matchNumber: 7, stage: "group", group: "D", homeTeam: "Argentina", awayTeam: "Nigeria", homeFlag: "🇦🇷", awayFlag: "🇳🇬", datetime: "2026-06-13T18:00:00", venue: "Dallas" },
  { id: "D2", matchNumber: 8, stage: "group", group: "D", homeTeam: "Croacia", awayTeam: "Chile", homeFlag: "🇭🇷", awayFlag: "🇨🇱", datetime: "2026-06-13T21:00:00", venue: "Atlanta" },
  { id: "D3", matchNumber: 19, stage: "group", group: "D", homeTeam: "Argentina", awayTeam: "Croacia", homeFlag: "🇦🇷", awayFlag: "🇭🇷", datetime: "2026-06-17T18:00:00", venue: "Dallas" },
  { id: "D4", matchNumber: 20, stage: "group", group: "D", homeTeam: "Nigeria", awayTeam: "Chile", homeFlag: "🇳🇬", awayFlag: "🇨🇱", datetime: "2026-06-17T21:00:00", venue: "Los Ángeles" },
  { id: "D5", matchNumber: 31, stage: "group", group: "D", homeTeam: "Chile", awayTeam: "Argentina", homeFlag: "🇨🇱", awayFlag: "🇦🇷", datetime: "2026-06-21T21:00:00", venue: "Miami" },
  { id: "D6", matchNumber: 32, stage: "group", group: "D", homeTeam: "Croacia", awayTeam: "Nigeria", homeFlag: "🇭🇷", awayFlag: "🇳🇬", datetime: "2026-06-21T21:00:00", venue: "Nueva York" },

  // GRUPO E
  { id: "E1", matchNumber: 9, stage: "group", group: "E", homeTeam: "España", awayTeam: "Sudáfrica", homeFlag: "🇪🇸", awayFlag: "🇿🇦", datetime: "2026-06-13T18:00:00", venue: "Los Ángeles" },
  { id: "E2", matchNumber: 10, stage: "group", group: "E", homeTeam: "Brasil", awayTeam: "Noruega", homeFlag: "🇧🇷", awayFlag: "🇳🇴", datetime: "2026-06-13T21:00:00", venue: "San Francisco" },
  { id: "E3", matchNumber: 21, stage: "group", group: "E", homeTeam: "España", awayTeam: "Brasil", homeFlag: "🇪🇸", awayFlag: "🇧🇷", datetime: "2026-06-17T18:00:00", venue: "Los Ángeles" },
  { id: "E4", matchNumber: 22, stage: "group", group: "E", homeTeam: "Sudáfrica", awayTeam: "Noruega", homeFlag: "🇿🇦", awayFlag: "🇳🇴", datetime: "2026-06-17T21:00:00", venue: "Seattle" },
  { id: "E5", matchNumber: 33, stage: "group", group: "E", homeTeam: "Noruega", awayTeam: "España", homeFlag: "🇳🇴", awayFlag: "🇪🇸", datetime: "2026-06-21T21:00:00", venue: "Kansas City" },
  { id: "E6", matchNumber: 34, stage: "group", group: "E", homeTeam: "Sudáfrica", awayTeam: "Brasil", homeFlag: "🇿🇦", awayFlag: "🇧🇷", datetime: "2026-06-21T21:00:00", venue: "Boston" },

  // GRUPO F
  { id: "F1", matchNumber: 11, stage: "group", group: "F", homeTeam: "Francia", awayTeam: "Arabia Saudita", homeFlag: "🇫🇷", awayFlag: "🇸🇦", datetime: "2026-06-14T18:00:00", venue: "Nueva York" },
  { id: "F2", matchNumber: 12, stage: "group", group: "F", homeTeam: "Dinamarca", awayTeam: "Bolivia", homeFlag: "🇩🇰", awayFlag: "🇧🇴", datetime: "2026-06-14T21:00:00", venue: "Chicago" },
  { id: "F3", matchNumber: 23, stage: "group", group: "F", homeTeam: "Francia", awayTeam: "Dinamarca", homeFlag: "🇫🇷", awayFlag: "🇩🇰", datetime: "2026-06-18T18:00:00", venue: "Boston" },
  { id: "F4", matchNumber: 24, stage: "group", group: "F", homeTeam: "Arabia Saudita", awayTeam: "Bolivia", homeFlag: "🇸🇦", awayFlag: "🇧🇴", datetime: "2026-06-18T21:00:00", venue: "San Francisco" },
  { id: "F5", matchNumber: 35, stage: "group", group: "F", homeTeam: "Bolivia", awayTeam: "Francia", homeFlag: "🇧🇴", awayFlag: "🇫🇷", datetime: "2026-06-22T21:00:00", venue: "Dallas" },
  { id: "F6", matchNumber: 36, stage: "group", group: "F", homeTeam: "Dinamarca", awayTeam: "Arabia Saudita", homeFlag: "🇩🇰", awayFlag: "🇸🇦", datetime: "2026-06-22T21:00:00", venue: "Chicago" },

  // GRUPO G
  { id: "G1", matchNumber: 37, stage: "group", group: "G", homeTeam: "Alemania", awayTeam: "Camerún", homeFlag: "🇩🇪", awayFlag: "🇨🇲", datetime: "2026-06-15T18:00:00", venue: "Philadelphia" },
  { id: "G2", matchNumber: 38, stage: "group", group: "G", homeTeam: "Japón", awayTeam: "Portugal", homeFlag: "🇯🇵", awayFlag: "🇵🇹", datetime: "2026-06-15T21:00:00", venue: "Miami" },
  { id: "G3", matchNumber: 39, stage: "group", group: "G", homeTeam: "Alemania", awayTeam: "Japón", homeFlag: "🇩🇪", awayFlag: "🇯🇵", datetime: "2026-06-19T18:00:00", venue: "Philadelphia" },
  { id: "G4", matchNumber: 40, stage: "group", group: "G", homeTeam: "Camerún", awayTeam: "Portugal", homeFlag: "🇨🇲", awayFlag: "🇵🇹", datetime: "2026-06-19T21:00:00", venue: "Boston" },
  { id: "G5", matchNumber: 41, stage: "group", group: "G", homeTeam: "Portugal", awayTeam: "Alemania", homeFlag: "🇵🇹", awayFlag: "🇩🇪", datetime: "2026-06-23T21:00:00", venue: "Nueva York" },
  { id: "G6", matchNumber: 42, stage: "group", group: "G", homeTeam: "Camerún", awayTeam: "Japón", homeFlag: "🇨🇲", awayFlag: "🇯🇵", datetime: "2026-06-23T21:00:00", venue: "Atlanta" },

  // GRUPO H
  { id: "H1", matchNumber: 43, stage: "group", group: "H", homeTeam: "Colombia", awayTeam: "Eslovaquia", homeFlag: "🇨🇴", awayFlag: "🇸🇰", datetime: "2026-06-15T18:00:00", venue: "Chicago" },
  { id: "H2", matchNumber: 44, stage: "group", group: "H", homeTeam: "Uruguay", awayTeam: "Senegal", homeFlag: "🇺🇾", awayFlag: "🇸🇳", datetime: "2026-06-15T21:00:00", venue: "Seattle" },
  { id: "H3", matchNumber: 45, stage: "group", group: "H", homeTeam: "Colombia", awayTeam: "Uruguay", homeFlag: "🇨🇴", awayFlag: "🇺🇾", datetime: "2026-06-19T18:00:00", venue: "Chicago" },
  { id: "H4", matchNumber: 46, stage: "group", group: "H", homeTeam: "Eslovaquia", awayTeam: "Senegal", homeFlag: "🇸🇰", awayFlag: "🇸🇳", datetime: "2026-06-19T21:00:00", venue: "Atlanta" },
  { id: "H5", matchNumber: 47, stage: "group", group: "H", homeTeam: "Senegal", awayTeam: "Colombia", homeFlag: "🇸🇳", awayFlag: "🇨🇴", datetime: "2026-06-23T21:00:00", venue: "Los Ángeles" },
  { id: "H6", matchNumber: 48, stage: "group", group: "H", homeTeam: "Eslovaquia", awayTeam: "Uruguay", homeFlag: "🇸🇰", awayFlag: "🇺🇾", datetime: "2026-06-23T21:00:00", venue: "Kansas City" },

  // GRUPO I
  { id: "I1", matchNumber: 49, stage: "group", group: "I", homeTeam: "Inglaterra", awayTeam: "Túnez", homeFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayFlag: "🇹🇳", datetime: "2026-06-16T18:00:00", venue: "San Francisco" },
  { id: "I2", matchNumber: 50, stage: "group", group: "I", homeTeam: "Países Bajos", awayTeam: "Australia", homeFlag: "🇳🇱", awayFlag: "🇦🇺", datetime: "2026-06-16T21:00:00", venue: "Dallas" },
  { id: "I3", matchNumber: 51, stage: "group", group: "I", homeTeam: "Inglaterra", awayTeam: "Países Bajos", homeFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", awayFlag: "🇳🇱", datetime: "2026-06-20T18:00:00", venue: "Los Ángeles" },
  { id: "I4", matchNumber: 52, stage: "group", group: "I", homeTeam: "Túnez", awayTeam: "Australia", homeFlag: "🇹🇳", awayFlag: "🇦🇺", datetime: "2026-06-20T21:00:00", venue: "Seattle" },
  { id: "I5", matchNumber: 53, stage: "group", group: "I", homeTeam: "Australia", awayTeam: "Inglaterra", homeFlag: "🇦🇺", awayFlag: "🏴󠁧󠁢󠁥󠁮󠁧󠁿", datetime: "2026-06-24T21:00:00", venue: "Miami" },
  { id: "I6", matchNumber: 54, stage: "group", group: "I", homeTeam: "Túnez", awayTeam: "Países Bajos", homeFlag: "🇹🇳", awayFlag: "🇳🇱", datetime: "2026-06-24T21:00:00", venue: "Philadelphia" },

  // GRUPO J
  { id: "J1", matchNumber: 55, stage: "group", group: "J", homeTeam: "Bélgica", awayTeam: "Ucrania", homeFlag: "🇧🇪", awayFlag: "🇺🇦", datetime: "2026-06-17T18:00:00", venue: "Nueva York" },
  { id: "J2", matchNumber: 56, stage: "group", group: "J", homeTeam: "Italia", awayTeam: "Ecuador", homeFlag: "🇮🇹", awayFlag: "🇪🇨", datetime: "2026-06-17T21:00:00", venue: "Boston" },
  { id: "J3", matchNumber: 57, stage: "group", group: "J", homeTeam: "Bélgica", awayTeam: "Italia", homeFlag: "🇧🇪", awayFlag: "🇮🇹", datetime: "2026-06-21T18:00:00", venue: "Chicago" },
  { id: "J4", matchNumber: 58, stage: "group", group: "J", homeTeam: "Ucrania", awayTeam: "Ecuador", homeFlag: "🇺🇦", awayFlag: "🇪🇨", datetime: "2026-06-21T21:00:00", venue: "San Francisco" },
  { id: "J5", matchNumber: 59, stage: "group", group: "J", homeTeam: "Ecuador", awayTeam: "Bélgica", homeFlag: "🇪🇨", awayFlag: "🇧🇪", datetime: "2026-06-25T21:00:00", venue: "Atlanta" },
  { id: "J6", matchNumber: 60, stage: "group", group: "J", homeTeam: "Ucrania", awayTeam: "Italia", homeFlag: "🇺🇦", awayFlag: "🇮🇹", datetime: "2026-06-25T21:00:00", venue: "Dallas" },

  // GRUPO K
  { id: "K1", matchNumber: 61, stage: "group", group: "K", homeTeam: "Portugal", awayTeam: "Irak", homeFlag: "🇵🇹", awayFlag: "🇮🇶", datetime: "2026-06-18T18:00:00", venue: "Kansas City" },
  { id: "K2", matchNumber: 62, stage: "group", group: "K", homeTeam: "Suiza", awayTeam: "Costa Rica", homeFlag: "🇨🇭", awayFlag: "🇨🇷", datetime: "2026-06-18T21:00:00", venue: "Philadelphia" },
  { id: "K3", matchNumber: 63, stage: "group", group: "K", homeTeam: "Portugal", awayTeam: "Suiza", homeFlag: "🇵🇹", awayFlag: "🇨🇭", datetime: "2026-06-22T18:00:00", venue: "Los Ángeles" },
  { id: "K4", matchNumber: 64, stage: "group", group: "K", homeTeam: "Irak", awayTeam: "Costa Rica", homeFlag: "🇮🇶", awayFlag: "🇨🇷", datetime: "2026-06-22T21:00:00", venue: "Seattle" },
  { id: "K5", matchNumber: 65, stage: "group", group: "K", homeTeam: "Costa Rica", awayTeam: "Portugal", homeFlag: "🇨🇷", awayFlag: "🇵🇹", datetime: "2026-06-26T21:00:00", venue: "Miami" },
  { id: "K6", matchNumber: 66, stage: "group", group: "K", homeTeam: "Irak", awayTeam: "Suiza", homeFlag: "🇮🇶", awayFlag: "🇨🇭", datetime: "2026-06-26T21:00:00", venue: "Chicago" },

  // GRUPO L
  { id: "L1", matchNumber: 67, stage: "group", group: "L", homeTeam: "Corea del Sur", awayTeam: "Ghana", homeFlag: "🇰🇷", awayFlag: "🇬🇭", datetime: "2026-06-19T18:00:00", venue: "Boston" },
  { id: "L2", matchNumber: 68, stage: "group", group: "L", homeTeam: "Rep. Checa", awayTeam: "Paraguay", homeFlag: "🇨🇿", awayFlag: "🇵🇾", datetime: "2026-06-19T21:00:00", venue: "Monterrey" },
  { id: "L3", matchNumber: 69, stage: "group", group: "L", homeTeam: "Corea del Sur", awayTeam: "Rep. Checa", homeFlag: "🇰🇷", awayFlag: "🇨🇿", datetime: "2026-06-23T18:00:00", venue: "Seattle" },
  { id: "L4", matchNumber: 70, stage: "group", group: "L", homeTeam: "Ghana", awayTeam: "Paraguay", homeFlag: "🇬🇭", awayFlag: "🇵🇾", datetime: "2026-06-23T21:00:00", venue: "Atlanta" },
  { id: "L5", matchNumber: 71, stage: "group", group: "L", homeTeam: "Paraguay", awayTeam: "Corea del Sur", homeFlag: "🇵🇾", awayFlag: "🇰🇷", datetime: "2026-06-27T21:00:00", venue: "Dallas" },
  { id: "L6", matchNumber: 72, stage: "group", group: "L", homeTeam: "Ghana", awayTeam: "Rep. Checa", homeFlag: "🇬🇭", awayFlag: "🇨🇿", datetime: "2026-06-27T21:00:00", venue: "San Francisco" },

  // OCTAVOS (Round of 32) - equipos TBD por clasificación
  { id: "R32_1", matchNumber: 73, stage: "round_of_32", homeTeam: "1A", awayTeam: "3E/F/G", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-01T18:00:00", venue: "Dallas" },
  { id: "R32_2", matchNumber: 74, stage: "round_of_32", homeTeam: "2B", awayTeam: "2C", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-01T21:00:00", venue: "Los Ángeles" },
  { id: "R32_3", matchNumber: 75, stage: "round_of_32", homeTeam: "1C", awayTeam: "3A/B/D", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-02T18:00:00", venue: "Nueva York" },
  { id: "R32_4", matchNumber: 76, stage: "round_of_32", homeTeam: "2D", awayTeam: "2A", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-02T21:00:00", venue: "Boston" },
  { id: "R32_5", matchNumber: 77, stage: "round_of_32", homeTeam: "1E", awayTeam: "3G/H/I", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-03T18:00:00", venue: "San Francisco" },
  { id: "R32_6", matchNumber: 78, stage: "round_of_32", homeTeam: "2F", awayTeam: "2E", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-03T21:00:00", venue: "Atlanta" },
  { id: "R32_7", matchNumber: 79, stage: "round_of_32", homeTeam: "1G", awayTeam: "3J/K/L", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-04T18:00:00", venue: "Chicago" },
  { id: "R32_8", matchNumber: 80, stage: "round_of_32", homeTeam: "2H", awayTeam: "2G", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-04T21:00:00", venue: "Seattle" },
  { id: "R32_9", matchNumber: 81, stage: "round_of_32", homeTeam: "1I", awayTeam: "3A/B/C", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-05T18:00:00", venue: "Miami" },
  { id: "R32_10", matchNumber: 82, stage: "round_of_32", homeTeam: "2J", awayTeam: "2I", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-05T21:00:00", venue: "Kansas City" },
  { id: "R32_11", matchNumber: 83, stage: "round_of_32", homeTeam: "1K", awayTeam: "3D/E/F", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-06T18:00:00", venue: "Philadelphia" },
  { id: "R32_12", matchNumber: 84, stage: "round_of_32", homeTeam: "2L", awayTeam: "2K", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-06T21:00:00", venue: "Dallas" },
  { id: "R32_13", matchNumber: 85, stage: "round_of_32", homeTeam: "1B", awayTeam: "3H/I/J", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-07T18:00:00", venue: "Los Ángeles" },
  { id: "R32_14", matchNumber: 86, stage: "round_of_32", homeTeam: "1L", awayTeam: "2K/L", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-07T21:00:00", venue: "Nueva York" },
  { id: "R32_15", matchNumber: 87, stage: "round_of_32", homeTeam: "1D", awayTeam: "3A/B/C/D", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-08T18:00:00", venue: "Boston" },
  { id: "R32_16", matchNumber: 88, stage: "round_of_32", homeTeam: "1F", awayTeam: "1H", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-08T21:00:00", venue: "Atlanta" },

  // ROUND OF 16
  { id: "R16_1", matchNumber: 89, stage: "round_of_16", homeTeam: "Gan. R32_1", awayTeam: "Gan. R32_2", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-11T21:00:00", venue: "Dallas" },
  { id: "R16_2", matchNumber: 90, stage: "round_of_16", homeTeam: "Gan. R32_3", awayTeam: "Gan. R32_4", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-11T21:00:00", venue: "Los Ángeles" },
  { id: "R16_3", matchNumber: 91, stage: "round_of_16", homeTeam: "Gan. R32_5", awayTeam: "Gan. R32_6", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-12T21:00:00", venue: "Nueva York" },
  { id: "R16_4", matchNumber: 92, stage: "round_of_16", homeTeam: "Gan. R32_7", awayTeam: "Gan. R32_8", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-12T21:00:00", venue: "Boston" },
  { id: "R16_5", matchNumber: 93, stage: "round_of_16", homeTeam: "Gan. R32_9", awayTeam: "Gan. R32_10", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-13T21:00:00", venue: "Miami" },
  { id: "R16_6", matchNumber: 94, stage: "round_of_16", homeTeam: "Gan. R32_11", awayTeam: "Gan. R32_12", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-13T21:00:00", venue: "Seattle" },
  { id: "R16_7", matchNumber: 95, stage: "round_of_16", homeTeam: "Gan. R32_13", awayTeam: "Gan. R32_14", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-14T21:00:00", venue: "San Francisco" },
  { id: "R16_8", matchNumber: 96, stage: "round_of_16", homeTeam: "Gan. R32_15", awayTeam: "Gan. R32_16", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-14T21:00:00", venue: "Chicago" },

  // CUARTOS
  { id: "QF_1", matchNumber: 97, stage: "quarterfinal", homeTeam: "Gan. R16_1", awayTeam: "Gan. R16_2", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-17T21:00:00", venue: "Dallas" },
  { id: "QF_2", matchNumber: 98, stage: "quarterfinal", homeTeam: "Gan. R16_3", awayTeam: "Gan. R16_4", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-17T21:00:00", venue: "Los Ángeles" },
  { id: "QF_3", matchNumber: 99, stage: "quarterfinal", homeTeam: "Gan. R16_5", awayTeam: "Gan. R16_6", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-18T21:00:00", venue: "Nueva York" },
  { id: "QF_4", matchNumber: 100, stage: "quarterfinal", homeTeam: "Gan. R16_7", awayTeam: "Gan. R16_8", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-18T21:00:00", venue: "Boston" },

  // SEMIS
  { id: "SF_1", matchNumber: 101, stage: "semifinal", homeTeam: "Gan. QF_1", awayTeam: "Gan. QF_2", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-14T21:00:00", venue: "Dallas" },
  { id: "SF_2", matchNumber: 102, stage: "semifinal", homeTeam: "Gan. QF_3", awayTeam: "Gan. QF_4", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-15T21:00:00", venue: "Los Ángeles" },

  // TERCER PUESTO
  { id: "TP", matchNumber: 103, stage: "third_place", homeTeam: "Per. SF_1", awayTeam: "Per. SF_2", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-18T21:00:00", venue: "Miami" },

  // FINAL
  { id: "FINAL", matchNumber: 104, stage: "final", homeTeam: "Gan. SF_1", awayTeam: "Gan. SF_2", homeFlag: "🏳", awayFlag: "🏳", datetime: "2026-07-19T21:00:00", venue: "Nueva York (MetLife)" },
];
