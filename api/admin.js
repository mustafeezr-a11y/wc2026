/**
 * /api/admin.js
 * Seed/manage Redis with all historical match data including knockout rounds.
 * GET /api/admin?action=backfill&secret=wc2026admin
 * GET /api/admin?action=stats&secret=wc2026admin
 * GET /api/admin?action=flush&secret=wc2026admin
 */
import { redis } from "./_redis.js";
const SECRET = process.env.ADMIN_SECRET||"wc2026admin";

const ALL_MATCHES = [
  // ════════════════ GROUP STAGE ════════════════
  // Group A
  {round:"group",group:"A",home:"Mexico",away:"South Africa",hg:2,ag:0,date:"2026-06-13",venue:"SoFi Stadium",venueCity:"Inglewood",venueState:"CA",scorers:[{player:"Julien Quinones",team:"home",clock:"34",type:"goal"},{player:"Mateo Chavez",team:"home",clock:"67",type:"goal"}],cards:[]},
  {round:"group",group:"A",home:"Korea Republic",away:"Czechia",hg:2,ag:1,date:"2026-06-13",venue:"Levi's Stadium",venueCity:"Santa Clara",venueState:"CA",scorers:[{player:"Hwang In-Beom",team:"home",clock:"12",type:"goal"},{player:"Oh Hyeon-Gyu",team:"home",clock:"77",type:"goal"},{player:"Ladislav Krejci",team:"away",clock:"55",type:"goal"}],cards:[]},
  {round:"group",group:"A",home:"Mexico",away:"Korea Republic",hg:1,ag:0,date:"2026-06-18",venue:"Estadio Azteca",venueCity:"Mexico City",venueState:"MEX",scorers:[{player:"Julien Quinones",team:"home",clock:"58",type:"goal"}],cards:[]},
  {round:"group",group:"A",home:"Czechia",away:"South Africa",hg:1,ag:1,date:"2026-06-18",venue:"AT&T Stadium",venueCity:"Arlington",venueState:"TX",scorers:[{player:"Ladislav Krejci",team:"home",clock:"41",type:"goal"},{player:"Teboho Mokoena",team:"away",clock:"88",type:"pen"}],cards:[]},
  {round:"group",group:"A",home:"Czechia",away:"Mexico",hg:0,ag:3,date:"2026-06-23",venue:"Estadio Azteca",venueCity:"Mexico City",venueState:"MEX",scorers:[{player:"Mateo Chavez",team:"away",clock:"53",type:"goal"},{player:"Julien Quinones",team:"away",clock:"74",type:"goal"},{player:"Alvaro Fidalgo",team:"away",clock:"90",type:"goal"}],cards:[]},
  {round:"group",group:"A",home:"South Africa",away:"Korea Republic",hg:1,ag:0,date:"2026-06-23",venue:"SoFi Stadium",venueCity:"Inglewood",venueState:"CA",scorers:[{player:"Thapelo Maseko",team:"home",clock:"83",type:"goal"}],cards:[]},
  // Group B
  {round:"group",group:"B",home:"Canada",away:"Bosnia and Herzegovina",hg:1,ag:1,date:"2026-06-14",venue:"BMO Field",venueCity:"Toronto",venueState:"CAN",scorers:[{player:"Jonathan David",team:"home",clock:"45",type:"pen"},{player:"Jovo Lukic",team:"away",clock:"67",type:"goal"}],cards:[]},
  {round:"group",group:"B",home:"Switzerland",away:"Qatar",hg:2,ag:1,date:"2026-06-14",venue:"BC Place",venueCity:"Vancouver",venueState:"CAN",scorers:[{player:"Breel Embolo",team:"home",clock:"22",type:"pen"},{player:"Boualem Khoukhi",team:"away",clock:"55",type:"goal"},{player:"Johan Manzambi",team:"home",clock:"74",type:"goal"}],cards:[]},
  {round:"group",group:"B",home:"Canada",away:"Qatar",hg:6,ag:0,date:"2026-06-19",venue:"Arrowhead Stadium",venueCity:"Kansas City",venueState:"MO",scorers:[{player:"Jonathan David",team:"home",clock:"8",type:"goal"},{player:"Cyle Larin",team:"home",clock:"23",type:"goal"},{player:"Jonathan David",team:"home",clock:"34",type:"goal"},{player:"Cyle Larin",team:"home",clock:"60",type:"goal"},{player:"Jonathan David",team:"home",clock:"71",type:"goal"},{player:"Jonathan David",team:"home",clock:"80",type:"goal"}],cards:[]},
  {round:"group",group:"B",home:"Switzerland",away:"Bosnia and Herzegovina",hg:3,ag:0,date:"2026-06-19",venue:"Gillette Stadium",venueCity:"Foxborough",venueState:"MA",scorers:[{player:"Johan Manzambi",team:"home",clock:"74",type:"goal"},{player:"Johan Manzambi",team:"home",clock:"89",type:"goal"},{player:"Granit Xhaka",team:"home",clock:"90",type:"goal"}],cards:[]},
  {round:"group",group:"B",home:"Switzerland",away:"Canada",hg:2,ag:1,date:"2026-06-24",venue:"BC Place",venueCity:"Vancouver",venueState:"CAN",scorers:[{player:"Granit Xhaka",team:"home",clock:"38",type:"goal"},{player:"Johan Manzambi",team:"home",clock:"62",type:"goal"},{player:"Cyle Larin",team:"away",clock:"80",type:"goal"}],cards:[]},
  {round:"group",group:"B",home:"Bosnia and Herzegovina",away:"Qatar",hg:3,ag:1,date:"2026-06-24",venue:"BMO Field",venueCity:"Toronto",venueState:"CAN",scorers:[{player:"Jovo Lukic",team:"home",clock:"11",type:"goal"},{player:"Edin Dzeko",team:"home",clock:"45",type:"goal"},{player:"Miralem Pjanic",team:"home",clock:"72",type:"goal"},{player:"Boualem Khoukhi",team:"away",clock:"50",type:"goal"}],cards:[]},
  // Group C
  {round:"group",group:"C",home:"Brazil",away:"Haiti",hg:3,ag:0,date:"2026-06-14",venue:"Hard Rock Stadium",venueCity:"Miami",venueState:"FL",scorers:[{player:"Matheus Cunha",team:"home",clock:"18",type:"goal"},{player:"Vinicius Jr",team:"home",clock:"41",type:"goal"},{player:"Matheus Cunha",team:"home",clock:"56",type:"goal"}],cards:[]},
  {round:"group",group:"C",home:"Morocco",away:"Scotland",hg:1,ag:0,date:"2026-06-14",venue:"Mercedes-Benz Stadium",venueCity:"Atlanta",venueState:"GA",scorers:[{player:"Ismael Saibari",team:"home",clock:"2",type:"goal"}],cards:[]},
  {round:"group",group:"C",home:"Brazil",away:"Morocco",hg:2,ag:1,date:"2026-06-19",venue:"NRG Stadium",venueCity:"Houston",venueState:"TX",scorers:[{player:"Vinicius Jr",team:"home",clock:"33",type:"goal"},{player:"Ismael Saibari",team:"away",clock:"51",type:"pen"},{player:"Matheus Cunha",team:"home",clock:"78",type:"goal"}],cards:[]},
  {round:"group",group:"C",home:"Scotland",away:"Haiti",hg:1,ag:0,date:"2026-06-19",venue:"Lumen Field",venueCity:"Seattle",venueState:"WA",scorers:[{player:"John McGinn",team:"home",clock:"29",type:"goal"}],cards:[]},
  {round:"group",group:"C",home:"Scotland",away:"Brazil",hg:0,ag:3,date:"2026-06-24",venue:"Hard Rock Stadium",venueCity:"Miami",venueState:"FL",scorers:[{player:"Vinicius Jr",team:"away",clock:"14",type:"goal"},{player:"Vinicius Jr",team:"away",clock:"44",type:"goal"},{player:"Matheus Cunha",team:"away",clock:"58",type:"goal"}],cards:[]},
  {round:"group",group:"C",home:"Morocco",away:"Haiti",hg:4,ag:2,date:"2026-06-24",venue:"Mercedes-Benz Stadium",venueCity:"Atlanta",venueState:"GA",scorers:[{player:"Ismael Saibari",team:"home",clock:"2",type:"goal"},{player:"Achraf Hakimi",team:"home",clock:"45",type:"goal"},{player:"Ismael Saibari",team:"home",clock:"90",type:"goal"},{player:"Gessime Yassine",team:"home",clock:"89",type:"goal"},{player:"Wilson Isidor",team:"away",clock:"31",type:"goal"},{player:"Wilson Isidor",team:"away",clock:"58",type:"goal"}],cards:[]},
  // Group D
  {round:"group",group:"D",home:"USA",away:"Paraguay",hg:4,ag:2,date:"2026-06-15",venue:"AT&T Stadium",venueCity:"Arlington",venueState:"TX",scorers:[{player:"Folarin Balogun",team:"home",clock:"7",type:"goal"},{player:"Folarin Balogun",team:"home",clock:"23",type:"goal"},{player:"Sebastian Berhalter",team:"home",clock:"62",type:"goal"},{player:"Christian Pulisic",team:"home",clock:"78",type:"goal"},{player:"Mauricio",team:"away",clock:"45",type:"goal"},{player:"Galarza",team:"away",clock:"80",type:"goal"}],cards:[]},
  {round:"group",group:"D",home:"Australia",away:"Turkiye",hg:2,ag:0,date:"2026-06-15",venue:"Levi's Stadium",venueCity:"Santa Clara",venueState:"CA",scorers:[{player:"Nestory Irankunda",team:"home",clock:"55",type:"goal"},{player:"Connor Metcalfe",team:"home",clock:"79",type:"goal"}],cards:[]},
  {round:"group",group:"D",home:"USA",away:"Australia",hg:2,ag:0,date:"2026-06-20",venue:"SoFi Stadium",venueCity:"Inglewood",venueState:"CA",scorers:[{player:"Auston Trusty",team:"home",clock:"3",type:"goal"},{player:"Sebastian Berhalter",team:"home",clock:"49",type:"goal"}],cards:[]},
  {round:"group",group:"D",home:"Turkiye",away:"Paraguay",hg:0,ag:1,date:"2026-06-20",venue:"NRG Stadium",venueCity:"Houston",venueState:"TX",scorers:[{player:"Mauricio",team:"away",clock:"61",type:"goal"}],cards:[]},
  {round:"group",group:"D",home:"Turkiye",away:"USA",hg:3,ag:2,date:"2026-06-25",venue:"SoFi Stadium",venueCity:"Inglewood",venueState:"CA",scorers:[{player:"Arda Guler",team:"home",clock:"10",type:"goal"},{player:"Burak Yilmaz",team:"home",clock:"31",type:"goal"},{player:"Kaan Ayhan",team:"home",clock:"90",type:"goal"},{player:"Auston Trusty",team:"away",clock:"3",type:"goal"},{player:"Sebastian Berhalter",team:"away",clock:"49",type:"goal"}],cards:[]},
  {round:"group",group:"D",home:"Paraguay",away:"Australia",hg:0,ag:0,date:"2026-06-25",venue:"AT&T Stadium",venueCity:"Arlington",venueState:"TX",scorers:[],cards:[]},
  // Group E
  {round:"group",group:"E",home:"Germany",away:"Curacao",hg:7,ag:1,date:"2026-06-15",venue:"Arrowhead Stadium",venueCity:"Kansas City",venueState:"MO",scorers:[{player:"Leroy Sane",team:"home",clock:"2",type:"goal"},{player:"Kai Havertz",team:"home",clock:"45",type:"pen"},{player:"Deniz Undav",team:"home",clock:"56",type:"goal"},{player:"Felix Nmecha",team:"home",clock:"64",type:"goal"},{player:"Deniz Undav",team:"home",clock:"88",type:"goal"},{player:"Livano Comenencia",team:"away",clock:"51",type:"goal"}],cards:[]},
  {round:"group",group:"E",home:"Ivory Coast",away:"Ecuador",hg:1,ag:0,date:"2026-06-15",venue:"Gillette Stadium",venueCity:"Foxborough",venueState:"MA",scorers:[{player:"Amad Diallo",team:"home",clock:"34",type:"goal"}],cards:[]},
  {round:"group",group:"E",home:"Germany",away:"Ivory Coast",hg:2,ag:1,date:"2026-06-20",venue:"Levi's Stadium",venueCity:"Santa Clara",venueState:"CA",scorers:[{player:"Deniz Undav",team:"home",clock:"15",type:"goal"},{player:"Kai Havertz",team:"home",clock:"71",type:"goal"},{player:"Amad Diallo",team:"away",clock:"58",type:"goal"}],cards:[]},
  {round:"group",group:"E",home:"Ecuador",away:"Curacao",hg:0,ag:0,date:"2026-06-20",venue:"Arrowhead Stadium",venueCity:"Kansas City",venueState:"MO",scorers:[],cards:[]},
  {round:"group",group:"E",home:"Ecuador",away:"Germany",hg:2,ag:1,date:"2026-06-25",venue:"MetLife Stadium",venueCity:"East Rutherford",venueState:"NJ",scorers:[{player:"Leroy Sane",team:"away",clock:"2",type:"goal"},{player:"Nilson Angulo",team:"home",clock:"9",type:"goal"},{player:"Gonzalo Plata",team:"home",clock:"77",type:"goal"}],cards:[]},
  {round:"group",group:"E",home:"Curacao",away:"Ivory Coast",hg:0,ag:2,date:"2026-06-25",venue:"BMO Field",venueCity:"Toronto",venueState:"CAN",scorers:[{player:"Nicolas Pepe",team:"away",clock:"7",type:"goal"},{player:"Nicolas Pepe",team:"away",clock:"64",type:"goal"}],cards:[]},
  // Group F
  {round:"group",group:"F",home:"Netherlands",away:"Japan",hg:2,ag:2,date:"2026-06-15",venue:"Lumen Field",venueCity:"Seattle",venueState:"WA",scorers:[{player:"Cody Gakpo",team:"home",clock:"22",type:"goal"},{player:"Crysencio Summerville",team:"home",clock:"55",type:"goal"},{player:"Daichi Kamada",team:"away",clock:"31",type:"goal"},{player:"Ayase Ueda",team:"away",clock:"67",type:"goal"}],cards:[]},
  {round:"group",group:"F",home:"Sweden",away:"Tunisia",hg:5,ag:1,date:"2026-06-15",venue:"Mercedes-Benz Stadium",venueCity:"Atlanta",venueState:"GA",scorers:[{player:"Alexander Isak",team:"home",clock:"8",type:"goal"},{player:"Yasin Ayari",team:"home",clock:"28",type:"goal"},{player:"Alexander Isak",team:"home",clock:"45",type:"goal"},{player:"Yasin Ayari",team:"home",clock:"63",type:"goal"},{player:"Viktor Gyokeres",team:"home",clock:"80",type:"goal"},{player:"Omar Rekik",team:"away",clock:"55",type:"goal"}],cards:[]},
  {round:"group",group:"F",home:"Netherlands",away:"Sweden",hg:5,ag:1,date:"2026-06-20",venue:"NRG Stadium",venueCity:"Houston",venueState:"TX",scorers:[{player:"Brian Brobbey",team:"home",clock:"12",type:"goal"},{player:"Cody Gakpo",team:"home",clock:"45",type:"goal"},{player:"Crysencio Summerville",team:"home",clock:"60",type:"goal"},{player:"Brian Brobbey",team:"home",clock:"73",type:"goal"},{player:"Brian Brobbey",team:"home",clock:"85",type:"goal"},{player:"Alexander Isak",team:"away",clock:"38",type:"goal"}],cards:[]},
  {round:"group",group:"F",home:"Japan",away:"Tunisia",hg:4,ag:0,date:"2026-06-20",venue:"Hard Rock Stadium",venueCity:"Miami",venueState:"FL",scorers:[{player:"Daichi Kamada",team:"home",clock:"4",type:"goal"},{player:"Keito Nakamura",team:"home",clock:"21",type:"goal"},{player:"Ayase Ueda",team:"home",clock:"52",type:"goal"},{player:"Ayase Ueda",team:"home",clock:"78",type:"goal"}],cards:[]},
  {round:"group",group:"F",home:"Tunisia",away:"Netherlands",hg:1,ag:3,date:"2026-06-25",venue:"BC Place",venueCity:"Vancouver",venueState:"CAN",scorers:[{player:"Hassem Mastouri",team:"home",clock:"54",type:"goal"},{player:"Brian Brobbey",team:"away",clock:"7",type:"goal"},{player:"Virgil van Dijk",team:"away",clock:"80",type:"goal"},{player:"Jordi van Hecke",team:"away",clock:"62",type:"goal"}],cards:[]},
  {round:"group",group:"F",home:"Japan",away:"Sweden",hg:1,ag:1,date:"2026-06-25",venue:"Gillette Stadium",venueCity:"Foxborough",venueState:"MA",scorers:[{player:"Daizen Maeda",team:"home",clock:"56",type:"goal"},{player:"Anthony Elanga",team:"away",clock:"62",type:"goal"}],cards:[]},
  // Group G
  {round:"group",group:"G",home:"Belgium",away:"Egypt",hg:1,ag:1,date:"2026-06-16",venue:"Estadio BBVA",venueCity:"Monterrey",venueState:"MEX",scorers:[{player:"Romelu Lukaku",team:"home",clock:"44",type:"goal"},{player:"Eman Ashour",team:"away",clock:"71",type:"goal"}],cards:[]},
  {round:"group",group:"G",home:"Iran",away:"New Zealand",hg:2,ag:2,date:"2026-06-16",venue:"SoFi Stadium",venueCity:"Inglewood",venueState:"CA",scorers:[{player:"Mehdi Taremi",team:"home",clock:"33",type:"goal"},{player:"Mohamed Mohebi",team:"home",clock:"70",type:"goal"},{player:"Elijah Just",team:"away",clock:"45",type:"goal"},{player:"Chris Wood",team:"away",clock:"82",type:"goal"}],cards:[]},
  {round:"group",group:"G",home:"Belgium",away:"Iran",hg:0,ag:0,date:"2026-06-21",venue:"Levi's Stadium",venueCity:"Santa Clara",venueState:"CA",scorers:[],cards:[]},
  {round:"group",group:"G",home:"Egypt",away:"New Zealand",hg:3,ag:1,date:"2026-06-21",venue:"Arrowhead Stadium",venueCity:"Kansas City",venueState:"MO",scorers:[{player:"Mohamed Salah",team:"home",clock:"18",type:"goal"},{player:"Eman Ashour",team:"home",clock:"44",type:"goal"},{player:"Mostafa Mohamed",team:"home",clock:"67",type:"goal"},{player:"Elijah Just",team:"away",clock:"72",type:"goal"}],cards:[]},
  {round:"group",group:"G",home:"New Zealand",away:"Belgium",hg:1,ag:5,date:"2026-06-26",venue:"BC Place",venueCity:"Vancouver",venueState:"CAN",scorers:[{player:"Elijah Just",team:"home",clock:"84",type:"goal"},{player:"Leandro Trossard",team:"away",clock:"23",type:"pen"},{player:"Leandro Trossard",team:"away",clock:"52",type:"goal"},{player:"Kevin De Bruyne",team:"away",clock:"66",type:"goal"},{player:"Romelu Lukaku",team:"away",clock:"86",type:"goal"},{player:"Alexis Saelemaekers",team:"away",clock:"90",type:"goal"}],cards:[]},
  {round:"group",group:"G",home:"Egypt",away:"Iran",hg:1,ag:1,date:"2026-06-26",venue:"Lumen Field",venueCity:"Seattle",venueState:"WA",scorers:[{player:"Mahmoud Saber",team:"home",clock:"5",type:"goal"},{player:"Ramin Rezaeian",team:"away",clock:"14",type:"goal"}],cards:[]},
  // Group H
  {round:"group",group:"H",home:"Spain",away:"Cape Verde",hg:0,ag:0,date:"2026-06-15",venue:"MetLife Stadium",venueCity:"East Rutherford",venueState:"NJ",scorers:[],cards:[]},
  {round:"group",group:"H",home:"Saudi Arabia",away:"Uruguay",hg:1,ag:1,date:"2026-06-15",venue:"Hard Rock Stadium",venueCity:"Miami",venueState:"FL",scorers:[{player:"Abdulelah Al Amri",team:"home",clock:"55",type:"goal"},{player:"Maximiliano Araujo",team:"away",clock:"33",type:"goal"}],cards:[]},
  {round:"group",group:"H",home:"Spain",away:"Saudi Arabia",hg:4,ag:0,date:"2026-06-21",venue:"Lumen Field",venueCity:"Seattle",venueState:"WA",scorers:[{player:"Mikel Oyarzabal",team:"home",clock:"11",type:"goal"},{player:"Lamine Yamal",team:"home",clock:"34",type:"goal"},{player:"Mikel Oyarzabal",team:"home",clock:"67",type:"goal"},{player:"Lamine Yamal",team:"home",clock:"81",type:"goal"}],cards:[]},
  {round:"group",group:"H",home:"Uruguay",away:"Cape Verde",hg:3,ag:1,date:"2026-06-21",venue:"BC Place",venueCity:"Vancouver",venueState:"CAN",scorers:[{player:"Maximiliano Araujo",team:"home",clock:"28",type:"goal"},{player:"Darwin Nunez",team:"home",clock:"59",type:"goal"},{player:"Darwin Nunez",team:"home",clock:"71",type:"goal"}],cards:[]},
  {round:"group",group:"H",home:"Cape Verde",away:"Saudi Arabia",hg:0,ag:0,date:"2026-06-26",venue:"NRG Stadium",venueCity:"Houston",venueState:"TX",scorers:[],cards:[]},
  {round:"group",group:"H",home:"Uruguay",away:"Spain",hg:0,ag:1,date:"2026-06-26",venue:"Estadio Akron",venueCity:"Guadalajara",venueState:"MEX",scorers:[{player:"Alex Baena",team:"away",clock:"8",type:"goal"}],cards:[]},
  // Group I
  {round:"group",group:"I",home:"France",away:"Senegal",hg:3,ag:1,date:"2026-06-16",venue:"AT&T Stadium",venueCity:"Arlington",venueState:"TX",scorers:[{player:"Kylian Mbappe",team:"home",clock:"15",type:"goal"},{player:"Ousmane Dembele",team:"home",clock:"45",type:"goal"},{player:"Kylian Mbappe",team:"home",clock:"71",type:"goal"},{player:"Ismaila Sarr",team:"away",clock:"38",type:"goal"}],cards:[]},
  {round:"group",group:"I",home:"Norway",away:"Iraq",hg:4,ag:1,date:"2026-06-16",venue:"Gillette Stadium",venueCity:"Foxborough",venueState:"MA",scorers:[{player:"Erling Haaland",team:"home",clock:"29",type:"goal"},{player:"Erling Haaland",team:"home",clock:"43",type:"goal"},{player:"Leo Ostigard",team:"home",clock:"76",type:"goal"},{player:"Ayman Hussein",team:"away",clock:"39",type:"goal"}],cards:[]},
  {round:"group",group:"I",home:"France",away:"Iraq",hg:3,ag:0,date:"2026-06-22",venue:"Mercedes-Benz Stadium",venueCity:"Atlanta",venueState:"GA",scorers:[{player:"Kylian Mbappe",team:"home",clock:"22",type:"goal"},{player:"Michael Olise",team:"home",clock:"45",type:"goal"},{player:"Ousmane Dembele",team:"home",clock:"78",type:"goal"}],cards:[]},
  {round:"group",group:"I",home:"Norway",away:"Senegal",hg:3,ag:2,date:"2026-06-22",venue:"NRG Stadium",venueCity:"Houston",venueState:"TX",scorers:[{player:"Erling Haaland",team:"home",clock:"11",type:"goal"},{player:"Erling Haaland",team:"home",clock:"56",type:"goal"},{player:"Marcus Holmgren Pedersen",team:"home",clock:"80",type:"goal"},{player:"Ismaila Sarr",team:"away",clock:"33",type:"goal"},{player:"Ibrahim Mbaye",team:"away",clock:"71",type:"goal"}],cards:[]},
  {round:"group",group:"I",home:"Norway",away:"France",hg:1,ag:4,date:"2026-06-26",venue:"Gillette Stadium",venueCity:"Foxborough",venueState:"MA",scorers:[{player:"Ousmane Dembele",team:"away",clock:"8",type:"goal"},{player:"Ousmane Dembele",team:"away",clock:"22",type:"goal"},{player:"Thelo Aasgaard",team:"home",clock:"24",type:"goal"},{player:"Ousmane Dembele",team:"away",clock:"32",type:"goal"},{player:"Desire Doue",team:"away",clock:"89",type:"goal"}],cards:[]},
  {round:"group",group:"I",home:"Senegal",away:"Iraq",hg:5,ag:0,date:"2026-06-26",venue:"BMO Field",venueCity:"Toronto",venueState:"CAN",scorers:[{player:"Habib Diarra",team:"home",clock:"4",type:"goal"},{player:"Ismaila Sarr",team:"home",clock:"56",type:"goal"},{player:"Pape Gueye",team:"home",clock:"61",type:"goal"},{player:"Pape Gueye",team:"home",clock:"69",type:"goal"},{player:"Iliman Ndiaye",team:"home",clock:"82",type:"goal"}],cards:[]},
  // Group J
  {round:"group",group:"J",home:"Argentina",away:"Algeria",hg:3,ag:0,date:"2026-06-16",venue:"SoFi Stadium",venueCity:"Inglewood",venueState:"CA",scorers:[{player:"Lionel Messi",team:"home",clock:"14",type:"goal"},{player:"Lionel Messi",team:"home",clock:"44",type:"goal"},{player:"Lionel Messi",team:"home",clock:"78",type:"goal"}],cards:[]},
  {round:"group",group:"J",home:"Jordan",away:"Austria",hg:1,ag:3,date:"2026-06-16",venue:"Hard Rock Stadium",venueCity:"Miami",venueState:"FL",scorers:[{player:"Nizar Al-Rashdan",team:"home",clock:"22",type:"goal"},{player:"Marcel Sabitzer",team:"away",clock:"33",type:"goal"},{player:"Christoph Baumgartner",team:"away",clock:"61",type:"goal"},{player:"Marko Arnautovic",team:"away",clock:"88",type:"goal"}],cards:[]},
  {round:"group",group:"J",home:"Argentina",away:"Austria",hg:2,ag:0,date:"2026-06-22",venue:"MetLife Stadium",venueCity:"East Rutherford",venueState:"NJ",scorers:[{player:"Lionel Messi",team:"home",clock:"33",type:"goal"},{player:"Lionel Messi",team:"home",clock:"55",type:"goal"}],cards:[]},
  {round:"group",group:"J",home:"Algeria",away:"Jordan",hg:2,ag:1,date:"2026-06-22",venue:"Levi's Stadium",venueCity:"Santa Clara",venueState:"CA",scorers:[{player:"Riyad Mahrez",team:"home",clock:"28",type:"goal"},{player:"Islam Slimani",team:"home",clock:"67",type:"goal"},{player:"Ali Iyad Olwan",team:"away",clock:"55",type:"goal"}],cards:[]},
  {round:"group",group:"J",home:"Argentina",away:"Jordan",hg:3,ag:1,date:"2026-06-27",venue:"Hard Rock Stadium",venueCity:"Miami",venueState:"FL",scorers:[{player:"Lautaro Martinez",team:"home",clock:"23",type:"goal"},{player:"Giovani Lo Celso",team:"home",clock:"61",type:"goal"},{player:"Lionel Messi",team:"home",clock:"78",type:"goal"},{player:"Yazan Al-Naimat",team:"away",clock:"45",type:"goal"}],cards:[]},
  {round:"group",group:"J",home:"Austria",away:"Algeria",hg:3,ag:3,date:"2026-06-27",venue:"Levi's Stadium",venueCity:"Santa Clara",venueState:"CA",scorers:[{player:"Marcel Sabitzer",team:"home",clock:"12",type:"goal"},{player:"Christoph Baumgartner",team:"home",clock:"67",type:"goal"},{player:"Riyad Mahrez",team:"away",clock:"8",type:"goal"},{player:"Youcef Atal",team:"away",clock:"55",type:"goal"},{player:"Islam Slimani",team:"away",clock:"88",type:"goal"}],cards:[]},
  // Group K
  {round:"group",group:"K",home:"Colombia",away:"Uzbekistan",hg:3,ag:1,date:"2026-06-17",venue:"Arrowhead Stadium",venueCity:"Kansas City",venueState:"MO",scorers:[{player:"Luis Diaz",team:"home",clock:"12",type:"goal"},{player:"James Rodriguez",team:"home",clock:"44",type:"goal"},{player:"Luis Diaz",team:"home",clock:"71",type:"goal"},{player:"Eldor Shomurodov",team:"away",clock:"55",type:"goal"}],cards:[]},
  {round:"group",group:"K",home:"Portugal",away:"Congo DR",hg:1,ag:1,date:"2026-06-17",venue:"BMO Field",venueCity:"Toronto",venueState:"CAN",scorers:[{player:"Cristiano Ronaldo",team:"home",clock:"44",type:"pen"},{player:"Yoane Wissa",team:"away",clock:"67",type:"goal"}],cards:[]},
  {round:"group",group:"K",home:"Colombia",away:"Congo DR",hg:1,ag:0,date:"2026-06-22",venue:"BC Place",venueCity:"Vancouver",venueState:"CAN",scorers:[{player:"James Rodriguez",team:"home",clock:"55",type:"goal"}],cards:[]},
  {round:"group",group:"K",home:"Portugal",away:"Uzbekistan",hg:5,ag:0,date:"2026-06-22",venue:"NRG Stadium",venueCity:"Houston",venueState:"TX",scorers:[{player:"Cristiano Ronaldo",team:"home",clock:"8",type:"goal"},{player:"Joao Cancelo",team:"home",clock:"22",type:"goal"},{player:"Bruno Fernandes",team:"home",clock:"44",type:"goal"},{player:"Joao Neves",team:"home",clock:"61",type:"goal"},{player:"Rafael Leao",team:"home",clock:"78",type:"goal"}],cards:[]},
  {round:"group",group:"K",home:"Colombia",away:"Portugal",hg:0,ag:0,date:"2026-06-27",venue:"Hard Rock Stadium",venueCity:"Miami",venueState:"FL",scorers:[],cards:[]},
  {round:"group",group:"K",home:"Congo DR",away:"Uzbekistan",hg:3,ag:1,date:"2026-06-27",venue:"BMO Field",venueCity:"Toronto",venueState:"CAN",scorers:[{player:"Yoane Wissa",team:"home",clock:"68",type:"pen"},{player:"Fiston Mayele",team:"home",clock:"78",type:"goal"},{player:"Yoane Wissa",team:"home",clock:"90",type:"goal"},{player:"Eldor Shomurodov",team:"away",clock:"10",type:"goal"}],cards:[]},
  // Group L
  {round:"group",group:"L",home:"England",away:"Croatia",hg:4,ag:2,date:"2026-06-17",venue:"AT&T Stadium",venueCity:"Arlington",venueState:"TX",scorers:[{player:"Harry Kane",team:"home",clock:"11",type:"goal"},{player:"Jude Bellingham",team:"home",clock:"34",type:"goal"},{player:"Harry Kane",team:"home",clock:"66",type:"goal"},{player:"Phil Foden",team:"home",clock:"85",type:"goal"},{player:"Martin Baturina",team:"away",clock:"44",type:"goal"},{player:"Petar Musa",team:"away",clock:"71",type:"goal"}],cards:[]},
  {round:"group",group:"L",home:"Ghana",away:"Panama",hg:1,ag:0,date:"2026-06-17",venue:"Estadio BBVA",venueCity:"Monterrey",venueState:"MEX",scorers:[{player:"Jordan Ayew",team:"home",clock:"55",type:"goal"}],cards:[]},
  {round:"group",group:"L",home:"England",away:"Ghana",hg:0,ag:0,date:"2026-06-22",venue:"Mercedes-Benz Stadium",venueCity:"Atlanta",venueState:"GA",scorers:[],cards:[]},
  {round:"group",group:"L",home:"Panama",away:"Croatia",hg:0,ag:1,date:"2026-06-22",venue:"Lumen Field",venueCity:"Seattle",venueState:"WA",scorers:[{player:"Martin Baturina",team:"away",clock:"67",type:"goal"}],cards:[]},
  {round:"group",group:"L",home:"Panama",away:"England",hg:0,ag:2,date:"2026-06-27",venue:"MetLife Stadium",venueCity:"East Rutherford",venueState:"NJ",scorers:[{player:"Jude Bellingham",team:"away",clock:"62",type:"goal"},{player:"Harry Kane",team:"away",clock:"67",type:"goal"}],cards:[]},
  {round:"group",group:"L",home:"Croatia",away:"Ghana",hg:2,ag:1,date:"2026-06-27",venue:"Arrowhead Stadium",venueCity:"Kansas City",venueState:"MO",scorers:[{player:"Petar Sucic",team:"home",clock:"31",type:"goal"},{player:"Nikola Vlasic",team:"home",clock:"83",type:"goal"},{player:"Donyell Luckassen",team:"away",clock:"73",type:"goal"}],cards:[]},

  // ════════════════ ROUND OF 32 ════════════════
  {round:"r32",matchNum:73,home:"South Africa",away:"Canada",hg:0,ag:1,date:"2026-06-28",venue:"SoFi Stadium",venueCity:"Inglewood",venueState:"CA",scorers:[{player:"Stephen Eustaquio",team:"away",clock:"90+5",type:"goal"}],cards:[{player:"Mbekezeli Mbokazi",team:"home",clock:"67",type:"Y"}]},
  {round:"r32",matchNum:76,home:"Brazil",away:"Japan",hg:null,ag:null,date:"2026-06-29",venue:"NRG Stadium",venueCity:"Houston",venueState:"TX",scorers:[],cards:[]},
  {round:"r32",matchNum:74,home:"Germany",away:"Paraguay",hg:null,ag:null,date:"2026-06-29",venue:"Gillette Stadium",venueCity:"Foxborough",venueState:"MA",scorers:[],cards:[]},
  {round:"r32",matchNum:75,home:"Netherlands",away:"Morocco",hg:null,ag:null,date:"2026-06-29",venue:"Estadio BBVA",venueCity:"Monterrey",venueState:"MEX",scorers:[],cards:[]},
  {round:"r32",matchNum:78,home:"Ivory Coast",away:"Norway",hg:null,ag:null,date:"2026-06-30",venue:"AT&T Stadium",venueCity:"Arlington",venueState:"TX",scorers:[],cards:[]},
  {round:"r32",matchNum:77,home:"France",away:"Sweden",hg:null,ag:null,date:"2026-06-30",venue:"MetLife Stadium",venueCity:"East Rutherford",venueState:"NJ",scorers:[],cards:[]},
  {round:"r32",matchNum:79,home:"Mexico",away:"Ecuador",hg:null,ag:null,date:"2026-06-30",venue:"Estadio Azteca",venueCity:"Mexico City",venueState:"MEX",scorers:[],cards:[]},
  {round:"r32",matchNum:80,home:"England",away:"Congo DR",hg:null,ag:null,date:"2026-07-01",venue:"Mercedes-Benz Stadium",venueCity:"Atlanta",venueState:"GA",scorers:[],cards:[]},
  {round:"r32",matchNum:82,home:"Belgium",away:"Senegal",hg:null,ag:null,date:"2026-07-01",venue:"Lumen Field",venueCity:"Seattle",venueState:"WA",scorers:[],cards:[]},
  {round:"r32",matchNum:81,home:"USA",away:"Bosnia and Herzegovina",hg:null,ag:null,date:"2026-07-01",venue:"Levi's Stadium",venueCity:"Santa Clara",venueState:"CA",scorers:[],cards:[]},
  {round:"r32",matchNum:84,home:"Spain",away:"Austria",hg:null,ag:null,date:"2026-07-02",venue:"SoFi Stadium",venueCity:"Inglewood",venueState:"CA",scorers:[],cards:[]},
  {round:"r32",matchNum:83,home:"Portugal",away:"Croatia",hg:null,ag:null,date:"2026-07-02",venue:"BMO Field",venueCity:"Toronto",venueState:"CAN",scorers:[],cards:[]},
  {round:"r32",matchNum:85,home:"Switzerland",away:"Algeria",hg:null,ag:null,date:"2026-07-02",venue:"BC Place",venueCity:"Vancouver",venueState:"CAN",scorers:[],cards:[]},
  {round:"r32",matchNum:88,home:"Australia",away:"Egypt",hg:null,ag:null,date:"2026-07-03",venue:"AT&T Stadium",venueCity:"Arlington",venueState:"TX",scorers:[],cards:[]},
  {round:"r32",matchNum:86,home:"Argentina",away:"Cape Verde",hg:null,ag:null,date:"2026-07-03",venue:"Hard Rock Stadium",venueCity:"Miami",venueState:"FL",scorers:[],cards:[]},
  {round:"r32",matchNum:87,home:"Colombia",away:"Ghana",hg:null,ag:null,date:"2026-07-03",venue:"Arrowhead Stadium",venueCity:"Kansas City",venueState:"MO",scorers:[],cards:[]},

  // ════════════════ ROUND OF 16 ════════════════
  {round:"r16",matchNum:90,home:"W73",away:"W75",hg:null,ag:null,date:"2026-07-04",venue:"NRG Stadium",venueCity:"Houston",venueState:"TX",scorers:[],cards:[]},
  {round:"r16",matchNum:89,home:"W74",away:"W77",hg:null,ag:null,date:"2026-07-04",venue:"Lincoln Financial Field",venueCity:"Philadelphia",venueState:"PA",scorers:[],cards:[]},
  {round:"r16",matchNum:91,home:"W76",away:"W78",hg:null,ag:null,date:"2026-07-05",venue:"MetLife Stadium",venueCity:"East Rutherford",venueState:"NJ",scorers:[],cards:[]},
  {round:"r16",matchNum:92,home:"W79",away:"W80",hg:null,ag:null,date:"2026-07-05",venue:"Estadio Azteca",venueCity:"Mexico City",venueState:"MEX",scorers:[],cards:[]},
  {round:"r16",matchNum:93,home:"W83",away:"W84",hg:null,ag:null,date:"2026-07-06",venue:"AT&T Stadium",venueCity:"Arlington",venueState:"TX",scorers:[],cards:[]},
  {round:"r16",matchNum:94,home:"W81",away:"W82",hg:null,ag:null,date:"2026-07-06",venue:"Lumen Field",venueCity:"Seattle",venueState:"WA",scorers:[],cards:[]},
  {round:"r16",matchNum:95,home:"W86",away:"W88",hg:null,ag:null,date:"2026-07-07",venue:"Mercedes-Benz Stadium",venueCity:"Atlanta",venueState:"GA",scorers:[],cards:[]},
  {round:"r16",matchNum:96,home:"W85",away:"W87",hg:null,ag:null,date:"2026-07-07",venue:"BC Place",venueCity:"Vancouver",venueState:"CAN",scorers:[],cards:[]},

  // ════════════════ QUARTER FINALS ════════════════
  {round:"qf",matchNum:97,home:"W89",away:"W90",hg:null,ag:null,date:"2026-07-09",venue:"Gillette Stadium",venueCity:"Foxborough",venueState:"MA",scorers:[],cards:[]},
  {round:"qf",matchNum:98,home:"W93",away:"W94",hg:null,ag:null,date:"2026-07-10",venue:"SoFi Stadium",venueCity:"Inglewood",venueState:"CA",scorers:[],cards:[]},
  {round:"qf",matchNum:99,home:"W91",away:"W92",hg:null,ag:null,date:"2026-07-11",venue:"Hard Rock Stadium",venueCity:"Miami",venueState:"FL",scorers:[],cards:[]},
  {round:"qf",matchNum:100,home:"W95",away:"W96",hg:null,ag:null,date:"2026-07-11",venue:"Arrowhead Stadium",venueCity:"Kansas City",venueState:"MO",scorers:[],cards:[]},

  // ════════════════ SEMI FINALS ════════════════
  {round:"sf",matchNum:101,home:"W97",away:"W98",hg:null,ag:null,date:"2026-07-14",venue:"AT&T Stadium",venueCity:"Arlington",venueState:"TX",scorers:[],cards:[]},
  {round:"sf",matchNum:102,home:"W99",away:"W100",hg:null,ag:null,date:"2026-07-15",venue:"Mercedes-Benz Stadium",venueCity:"Atlanta",venueState:"GA",scorers:[],cards:[]},

  // ════════════════ THIRD PLACE ════════════════
  {round:"third",matchNum:103,home:"L101",away:"L102",hg:null,ag:null,date:"2026-07-18",venue:"Hard Rock Stadium",venueCity:"Miami",venueState:"FL",scorers:[],cards:[]},

  // ════════════════ FINAL ════════════════
  {round:"final",matchNum:104,home:"W101",away:"W102",hg:null,ag:null,date:"2026-07-19",venue:"MetLife Stadium",venueCity:"East Rutherford",venueState:"NJ",scorers:[],cards:[]},
];

export default async function handler(req,res){
  const{action,secret}=req.query;
  if(secret!==SECRET) return res.status(401).json({error:"Unauthorized"});

  if(action==="stats"){
    const keys=await redis.keys("match:*");
    return res.status(200).json({matchesStored:keys.length,sampleKeys:keys.slice(0,5)});
  }

  if(action==="flush"){
    const keys=await redis.keys("match:*");
    if(keys.length>0){
      const p=redis.pipeline();
      for(const k of keys) p.del(k);
      await p.exec();
    }
    return res.status(200).json({deleted:keys.length});
  }

  if(action==="backfill"){
    const pipeline=redis.pipeline();
    for(const m of ALL_MATCHES){
      const status = m.hg!==null ? "final" : "scheduled";
      const doc={
        ...m, status,
        venueLocation:[m.venueCity,m.venueState].filter(Boolean).join(", "),
        updatedAt:Date.now(),
      };
      const key=`match:${m.round}:${m.home}|${m.away}`;
      pipeline.set(key, JSON.stringify(doc), {ex:60*60*24*90});
    }
    await pipeline.exec();
    return res.status(200).json({ok:true,written:ALL_MATCHES.length});
  }

  return res.status(400).json({error:"Use: backfill | stats | flush"});
}
