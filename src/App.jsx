import { useState, useEffect, useCallback, useRef } from "react";
import { fetchLiveScores, diffResults, mergeResults } from "./worldcup-live";

// ── CONFIG ────────────────────────────────────────────────────────────────
const SHEET_CSV_URL = "YOUR_GOOGLE_SHEET_CSV_URL_HERE";
const AUTO_REFRESH_SECONDS = 30;
const isDemo = SHEET_CSV_URL === "YOUR_GOOGLE_SHEET_CSV_URL_HERE";

// ── FIFA RANKINGS ─────────────────────────────────────────────────────────
const FIFA_RANK = {
  Argentina:1,Spain:2,France:3,England:4,Portugal:5,
  Brazil:6,Morocco:7,Netherlands:8,Belgium:9,Germany:10,
  Croatia:11,Colombia:13,Mexico:14,Senegal:15,Uruguay:16,
  USA:17,Japan:18,Switzerland:19,Iran:20,Turkiye:22,
  Ecuador:23,Austria:24,"Korea Republic":25,Australia:27,
  Algeria:28,Egypt:29,Canada:30,Norway:31,"Ivory Coast":33,
  Panama:34,Sweden:38,Czechia:40,Paraguay:41,Scotland:42,
  Tunisia:45,"DR Congo":46,Uzbekistan:50,Qatar:56,Iraq:57,
  "South Africa":60,"Saudi Arabia":61,Jordan:63,
  "Bosnia and Herzegovina":64,"Cape Verde":67,Ghana:73,
  Curacao:82,Haiti:83,"New Zealand":85,"Congo DR":46,
};
const rank = (n) => FIFA_RANK[n] ? `#${FIFA_RANK[n]}` : null;

// ── SCORERS ───────────────────────────────────────────────────────────────
const SCORERS = [
  {name:"Lionel Messi",          team:"Argentina",   goals:5, hattricks:1, pos:"FW"},
  {name:"Erling Haaland",        team:"Norway",      goals:4, hattricks:0, pos:"FW"},
  {name:"Kylian Mbappe",         team:"France",      goals:4, hattricks:0, pos:"FW"},
  {name:"Vinicius Jr",           team:"Brazil",      goals:4, hattricks:0, pos:"FW"},
  {name:"Brian Brobbey",         team:"Netherlands", goals:3, hattricks:0, pos:"FW"},
  {name:"Deniz Undav",           team:"Germany",     goals:3, hattricks:0, pos:"FW"},
  {name:"Jonathan David",        team:"Canada",      goals:3, hattricks:1, pos:"FW"},
  {name:"Ismael Saibari",        team:"Morocco",     goals:3, hattricks:0, pos:"FW"},
  {name:"Matheus Cunha",         team:"Brazil",      goals:3, hattricks:0, pos:"FW"},
  {name:"Nicolas Pepe",          team:"Ivory Coast", goals:2, hattricks:0, pos:"FW"},
  {name:"Harry Kane",            team:"England",     goals:2, hattricks:0, pos:"FW"},
  {name:"Folarin Balogun",       team:"USA",         goals:2, hattricks:0, pos:"FW"},
  {name:"Cody Gakpo",            team:"Netherlands", goals:2, hattricks:0, pos:"FW"},
  {name:"Crysencio Summerville", team:"Netherlands", goals:2, hattricks:0, pos:"FW"},
  {name:"Johan Manzambi",        team:"Switzerland", goals:2, hattricks:0, pos:"FW"},
  {name:"Mikel Oyarzabal",       team:"Spain",       goals:2, hattricks:0, pos:"FW"},
  {name:"Lamine Yamal",          team:"Spain",       goals:2, hattricks:0, pos:"FW"},
  {name:"Ismaila Sarr",          team:"Senegal",     goals:2, hattricks:0, pos:"FW"},
  {name:"Cristiano Ronaldo",     team:"Portugal",    goals:2, hattricks:0, pos:"FW"},
  {name:"Cyle Larin",            team:"Canada",      goals:2, hattricks:0, pos:"FW"},
  {name:"Ayase Ueda",            team:"Japan",       goals:2, hattricks:0, pos:"FW"},
  {name:"Daichi Kamada",         team:"Japan",       goals:2, hattricks:0, pos:"MF"},
  {name:"Kai Havertz",           team:"Germany",     goals:2, hattricks:0, pos:"FW"},
  {name:"Yasin Ayari",           team:"Sweden",      goals:2, hattricks:0, pos:"MF"},
  {name:"Maximiliano Araujo",    team:"Uruguay",     goals:2, hattricks:0, pos:"FW"},
  {name:"Jude Bellingham",       team:"England",     goals:2, hattricks:0, pos:"MF"},
  {name:"Ousmane Dembele",       team:"France",      goals:2, hattricks:0, pos:"FW"},
  {name:"Alexander Isak",        team:"Sweden",      goals:2, hattricks:0, pos:"FW"},
  {name:"Elijah Just",           team:"New Zealand", goals:1, hattricks:0, pos:"FW"},
  {name:"Chris Wood",            team:"New Zealand", goals:1, hattricks:0, pos:"FW"},
  {name:"Granit Xhaka",          team:"Switzerland", goals:1, hattricks:0, pos:"MF"},
  {name:"Hwang In-Beom",         team:"Korea Republic",goals:1,hattricks:0,pos:"MF"},
  {name:"Oh Hyeon-Gyu",          team:"Korea Republic",goals:1,hattricks:0,pos:"FW"},
  {name:"Felix Nmecha",          team:"Germany",     goals:1, hattricks:0, pos:"MF"},
  {name:"Leroy Sane",            team:"Germany",     goals:1, hattricks:0, pos:"FW"},
  {name:"Nilson Angulo",         team:"Ecuador",     goals:1, hattricks:0, pos:"FW"},
  {name:"Gonzalo Plata",         team:"Ecuador",     goals:1, hattricks:0, pos:"FW"},
  {name:"Daizen Maeda",          team:"Japan",       goals:1, hattricks:0, pos:"FW"},
  {name:"Anthony Elanga",        team:"Sweden",      goals:1, hattricks:0, pos:"FW"},
  {name:"Viktor Gyokeres",       team:"Sweden",      goals:1, hattricks:0, pos:"FW"},
  {name:"Arda Guler",            team:"Turkiye",     goals:1, hattricks:0, pos:"MF"},
  {name:"Burak Yilmaz",          team:"Turkiye",     goals:1, hattricks:0, pos:"FW"},
  {name:"Kaan Ayhan",            team:"Turkiye",     goals:1, hattricks:0, pos:"DF"},
  {name:"Auston Trusty",         team:"USA",         goals:1, hattricks:0, pos:"DF"},
  {name:"Sebastian Berhalter",   team:"USA",         goals:1, hattricks:0, pos:"MF"},
  {name:"Thapelo Maseko",        team:"South Africa",goals:1, hattricks:0, pos:"DF"},
  {name:"Virgil van Dijk",       team:"Netherlands", goals:1, hattricks:0, pos:"DF"},
  {name:"Keito Nakamura",        team:"Japan",       goals:1, hattricks:0, pos:"FW"},
  {name:"Ayman Hussein",         team:"Iraq",        goals:1, hattricks:0, pos:"FW"},
  {name:"Nizar Al-Rashdan",      team:"Jordan",      goals:1, hattricks:0, pos:"MF"},
  {name:"Jovo Lukic",            team:"Bosnia and Herzegovina",goals:1,hattricks:0,pos:"FW"},
  {name:"Michael Olise",         team:"France",      goals:1, hattricks:0, pos:"FW"},
  {name:"Joao Cancelo",          team:"Portugal",    goals:1, hattricks:0, pos:"DF"},
  {name:"Mauricio",              team:"Paraguay",    goals:1, hattricks:0, pos:"FW"},
  {name:"Julien Quinones",       team:"Mexico",      goals:1, hattricks:0, pos:"FW"},
  {name:"Ladislav Krejci",       team:"Czechia",     goals:1, hattricks:0, pos:"MF"},
  {name:"Mateo Chavez",          team:"Mexico",      goals:1, hattricks:0, pos:"MF"},
  {name:"Alvaro Fidalgo",        team:"Mexico",      goals:1, hattricks:0, pos:"MF"},
  {name:"Gessime Yassine",       team:"Morocco",     goals:1, hattricks:0, pos:"FW"},
  {name:"Bradley Barcola",       team:"France",      goals:1, hattricks:0, pos:"FW"},
];

// ── TOP 3 PLAYERS PER TEAM ────────────────────────────────────────────────
const TOP_PLAYERS = {
  Argentina:   [{n:"Lionel Messi",p:"FW",goals:5,ht:1},{n:"Lautaro Martinez",p:"FW",goals:0,ht:0},{n:"Julian Alvarez",p:"FW",goals:0,ht:0}],
  France:      [{n:"Kylian Mbappe",p:"FW",goals:4,ht:0},{n:"Ousmane Dembele",p:"FW",goals:2,ht:0},{n:"Michael Olise",p:"FW",goals:1,ht:0}],
  Norway:      [{n:"Erling Haaland",p:"FW",goals:4,ht:0},{n:"Martin Odegaard",p:"MF",goals:0,ht:0},{n:"Alexander Sorloth",p:"FW",goals:0,ht:0}],
  England:     [{n:"Harry Kane",p:"FW",goals:2,ht:0},{n:"Bukayo Saka",p:"FW",goals:0,ht:0},{n:"Jude Bellingham",p:"MF",goals:2,ht:0}],
  Portugal:    [{n:"Cristiano Ronaldo",p:"FW",goals:2,ht:0},{n:"Joao Cancelo",p:"DF",goals:1,ht:0},{n:"Bruno Fernandes",p:"MF",goals:0,ht:0}],
  Brazil:      [{n:"Vinicius Jr",p:"FW",goals:4,ht:0},{n:"Matheus Cunha",p:"FW",goals:3,ht:0},{n:"Raphinha",p:"FW",goals:0,ht:0}],
  Canada:      [{n:"Jonathan David",p:"FW",goals:3,ht:1},{n:"Cyle Larin",p:"FW",goals:2,ht:0},{n:"Alphonso Davies",p:"DF",goals:0,ht:0}],
  Spain:       [{n:"Mikel Oyarzabal",p:"FW",goals:2,ht:0},{n:"Lamine Yamal",p:"FW",goals:2,ht:0},{n:"Ferran Torres",p:"FW",goals:0,ht:0}],
  USA:         [{n:"Folarin Balogun",p:"FW",goals:2,ht:0},{n:"Auston Trusty",p:"DF",goals:1,ht:0},{n:"Sebastian Berhalter",p:"MF",goals:1,ht:0}],
  Netherlands: [{n:"Brian Brobbey",p:"FW",goals:3,ht:0},{n:"Cody Gakpo",p:"FW",goals:2,ht:0},{n:"Crysencio Summerville",p:"FW",goals:2,ht:0}],
  Germany:     [{n:"Deniz Undav",p:"FW",goals:3,ht:0},{n:"Kai Havertz",p:"FW",goals:2,ht:0},{n:"Leroy Sane",p:"FW",goals:1,ht:0}],
  Mexico:      [{n:"Julien Quinones",p:"FW",goals:1,ht:0},{n:"Hirving Lozano",p:"FW",goals:0,ht:0},{n:"Raul Jimenez",p:"FW",goals:0,ht:0}],
  Switzerland: [{n:"Johan Manzambi",p:"FW",goals:2,ht:0},{n:"Granit Xhaka",p:"MF",goals:1,ht:0},{n:"Ruben Vargas",p:"FW",goals:0,ht:0}],
  Sweden:      [{n:"Alexander Isak",p:"FW",goals:2,ht:0},{n:"Yasin Ayari",p:"MF",goals:2,ht:0},{n:"Anthony Elanga",p:"FW",goals:1,ht:0}],
  Japan:       [{n:"Ayase Ueda",p:"FW",goals:2,ht:0},{n:"Daichi Kamada",p:"MF",goals:2,ht:0},{n:"Kaoru Mitoma",p:"FW",goals:0,ht:0}],
  Morocco:     [{n:"Ismael Saibari",p:"FW",goals:3,ht:0},{n:"Hakim Ziyech",p:"MF",goals:0,ht:0},{n:"Youssef En-Nesyri",p:"FW",goals:0,ht:0}],
  Belgium:     [{n:"Romelu Lukaku",p:"FW",goals:0,ht:0},{n:"Kevin De Bruyne",p:"MF",goals:0,ht:0},{n:"Leandro Trossard",p:"FW",goals:0,ht:0}],
  Colombia:    [{n:"Luis Diaz",p:"FW",goals:0,ht:0},{n:"James Rodriguez",p:"MF",goals:0,ht:0},{n:"Radamel Falcao",p:"FW",goals:0,ht:0}],
  Egypt:       [{n:"Mohamed Salah",p:"FW",goals:0,ht:0},{n:"Mostafa Mohamed",p:"FW",goals:0,ht:0},{n:"Trezeguet",p:"FW",goals:0,ht:0}],
  Iran:        [{n:"Sardar Azmoun",p:"FW",goals:0,ht:0},{n:"Mehdi Taremi",p:"FW",goals:0,ht:0},{n:"Alireza Jahanbakhsh",p:"FW",goals:0,ht:0}],
  "Korea Republic":[{n:"Hwang In-Beom",p:"MF",goals:1,ht:0},{n:"Oh Hyeon-Gyu",p:"FW",goals:1,ht:0},{n:"Son Heung-min",p:"FW",goals:0,ht:0}],
  Australia:   [{n:"Mitchell Duke",p:"FW",goals:0,ht:0},{n:"Ajdin Hrustic",p:"MF",goals:0,ht:0},{n:"Martin Boyle",p:"FW",goals:0,ht:0}],
  Senegal:     [{n:"Ismaila Sarr",p:"FW",goals:2,ht:0},{n:"Sadio Mane",p:"FW",goals:0,ht:0},{n:"Idrissa Gueye",p:"MF",goals:0,ht:0}],
  Uruguay:     [{n:"Maximiliano Araujo",p:"FW",goals:2,ht:0},{n:"Darwin Nunez",p:"FW",goals:0,ht:0},{n:"Federico Valverde",p:"MF",goals:0,ht:0}],
  "Ivory Coast":[{n:"Nicolas Pepe",p:"FW",goals:2,ht:0},{n:"Sebastien Haller",p:"FW",goals:0,ht:0},{n:"Franck Kessie",p:"MF",goals:0,ht:0}],
  Ecuador:     [{n:"Nilson Angulo",p:"FW",goals:1,ht:0},{n:"Gonzalo Plata",p:"FW",goals:1,ht:0},{n:"Enner Valencia",p:"FW",goals:0,ht:0}],
  Ghana:       [{n:"Jordan Ayew",p:"FW",goals:0,ht:0},{n:"Thomas Partey",p:"MF",goals:0,ht:0},{n:"Andre Ayew",p:"FW",goals:0,ht:0}],
  Croatia:     [{n:"Luka Modric",p:"MF",goals:0,ht:0},{n:"Ivan Perisic",p:"FW",goals:0,ht:0},{n:"Mateo Kovacic",p:"MF",goals:0,ht:0}],
  Czechia:     [{n:"Ladislav Krejci",p:"MF",goals:1,ht:0},{n:"Patrik Schick",p:"FW",goals:0,ht:0},{n:"Tomas Soucek",p:"MF",goals:0,ht:0}],
  "South Africa":[{n:"Thapelo Maseko",p:"DF",goals:1,ht:0},{n:"Percy Tau",p:"FW",goals:0,ht:0},{n:"Bongani Zungu",p:"MF",goals:0,ht:0}],
  Panama:      [{n:"Rolando Blackburn",p:"FW",goals:0,ht:0},{n:"Adalberto Carrasquilla",p:"MF",goals:0,ht:0},{n:"Jose Fajardo",p:"FW",goals:0,ht:0}],
  "Saudi Arabia":[{n:"Salem Al-Dawsari",p:"FW",goals:0,ht:0},{n:"Firas Al-Buraikan",p:"FW",goals:0,ht:0},{n:"Sami Al-Najei",p:"MF",goals:0,ht:0}],
  "Cape Verde":[{n:"Garry Rodrigues",p:"FW",goals:0,ht:0},{n:"Ryan Mendes",p:"FW",goals:0,ht:0},{n:"Stopira",p:"DF",goals:0,ht:0}],
  Iraq:        [{n:"Ayman Hussein",p:"FW",goals:1,ht:0},{n:"Bashar Resan",p:"MF",goals:0,ht:0},{n:"Amjad Attwan",p:"FW",goals:0,ht:0}],
  "New Zealand":[{n:"Elijah Just",p:"FW",goals:1,ht:0},{n:"Chris Wood",p:"FW",goals:1,ht:0},{n:"Clayton Lewis",p:"MF",goals:0,ht:0}],
  Jordan:      [{n:"Nizar Al-Rashdan",p:"MF",goals:1,ht:0},{n:"Mousa Tamari",p:"FW",goals:0,ht:0},{n:"Yazan Al-Naimat",p:"FW",goals:0,ht:0}],
  "Bosnia and Herzegovina":[{n:"Jovo Lukic",p:"FW",goals:1,ht:0},{n:"Edin Dzeko",p:"FW",goals:0,ht:0},{n:"Miralem Pjanic",p:"MF",goals:0,ht:0}],
  Paraguay:    [{n:"Mauricio",p:"FW",goals:1,ht:0},{n:"Miguel Almiron",p:"MF",goals:0,ht:0},{n:"Julio Enciso",p:"FW",goals:0,ht:0}],
  Turkiye:     [{n:"Arda Guler",p:"MF",goals:1,ht:0},{n:"Burak Yilmaz",p:"FW",goals:1,ht:0},{n:"Kaan Ayhan",p:"DF",goals:1,ht:0}],
  Tunisia:     [{n:"Youssef Msakni",p:"FW",goals:0,ht:0},{n:"Wahbi Khazri",p:"FW",goals:0,ht:0},{n:"Hannibal Mejbri",p:"MF",goals:0,ht:0}],
  Algeria:     [{n:"Riyad Mahrez",p:"FW",goals:0,ht:0},{n:"Islam Slimani",p:"FW",goals:0,ht:0},{n:"Andy Delort",p:"FW",goals:0,ht:0}],
  Scotland:    [{n:"Scott McTominay",p:"MF",goals:0,ht:0},{n:"Andy Robertson",p:"DF",goals:0,ht:0},{n:"Che Adams",p:"FW",goals:0,ht:0}],
  Austria:     [{n:"Marcel Sabitzer",p:"MF",goals:0,ht:0},{n:"Christoph Baumgartner",p:"MF",goals:0,ht:0},{n:"Marko Arnautovic",p:"FW",goals:0,ht:0}],
  Qatar:       [{n:"Akram Afif",p:"FW",goals:0,ht:0},{n:"Almoez Ali",p:"FW",goals:0,ht:0},{n:"Hassan Al-Haydos",p:"FW",goals:0,ht:0}],
  Haiti:       [{n:"Duckens Nazon",p:"FW",goals:0,ht:0},{n:"Frantzdy Pierrot",p:"FW",goals:0,ht:0},{n:"Derrick Etienne",p:"MF",goals:0,ht:0}],
  Uzbekistan:  [{n:"Eldor Shomurodov",p:"FW",goals:0,ht:0},{n:"Jaloliddin Masharipov",p:"MF",goals:0,ht:0},{n:"Dostonbek Khamdamov",p:"MF",goals:0,ht:0}],
  Curacao:     [{n:"Leandro Bacuna",p:"MF",goals:0,ht:0},{n:"Jurien Timber",p:"DF",goals:0,ht:0},{n:"Cuco Martina",p:"DF",goals:0,ht:0}],
  "Congo DR":  [{n:"Cedric Bakambu",p:"FW",goals:0,ht:0},{n:"Chancel Mbemba",p:"DF",goals:0,ht:0},{n:"Arthur Masuaku",p:"DF",goals:0,ht:0}],
};

// ── FLAGS ─────────────────────────────────────────────────────────────────
const FLAG = {
  Mexico:"🇲🇽","South Africa":"🇿🇦","Korea Republic":"🇰🇷",Czechia:"🇨🇿",
  Canada:"🇨🇦","Bosnia and Herzegovina":"🇧🇦",Qatar:"🇶🇦",Switzerland:"🇨🇭",
  Brazil:"🇧🇷",Morocco:"🇲🇦",Haiti:"🇭🇹",Scotland:"🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  USA:"🇺🇸",Paraguay:"🇵🇾",Australia:"🇦🇺",Turkiye:"🇹🇷",
  Germany:"🇩🇪","Ivory Coast":"🇨🇮",Ecuador:"🇪🇨",Curacao:"🇨🇼",
  Netherlands:"🇳🇱",Japan:"🇯🇵",Sweden:"🇸🇪",Tunisia:"🇹🇳",
  Belgium:"🇧🇪",Egypt:"🇪🇬",Iran:"🇮🇷","New Zealand":"🇳🇿",
  Spain:"🇪🇸",Uruguay:"🇺🇾","Cape Verde":"🇨🇻","Saudi Arabia":"🇸🇦",
  France:"🇫🇷",Senegal:"🇸🇳",Iraq:"🇮🇶",Norway:"🇳🇴",
  Argentina:"🇦🇷",Austria:"🇦🇹",Algeria:"🇩🇿","Congo DR":"🇨🇩",Jordan:"🇯🇴",
  Colombia:"🇨🇴",Portugal:"🇵🇹",Uzbekistan:"🇺🇿","DR Congo":"🇨🇩",
  England:"🏴󠁧󠁢󠁥󠁮󠁧󠁿",Ghana:"🇬🇭",Croatia:"🇭🇷",Panama:"🇵🇦",
};
const fl = (n) => FLAG[n] || null;

// ── SEED (all zeros — standings built from results only) ──────────────────
const SEED = {
  A:{"Mexico":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"South Africa":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Korea Republic":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Czechia":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
  B:{"Switzerland":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Canada":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Bosnia and Herzegovina":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Qatar":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
  C:{"Brazil":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Morocco":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Scotland":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Haiti":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
  D:{"USA":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Australia":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Paraguay":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Turkiye":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
  E:{"Germany":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Ivory Coast":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Ecuador":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Curacao":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
  F:{"Netherlands":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Japan":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Sweden":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Tunisia":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
  G:{"Egypt":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Iran":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Belgium":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"New Zealand":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
  H:{"Spain":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Uruguay":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Cape Verde":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Saudi Arabia":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
  I:{"France":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Norway":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Senegal":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Iraq":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
  J:{"Argentina":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Austria":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Algeria":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Jordan":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
  K:{"Colombia":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Portugal":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Congo DR":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Uzbekistan":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
  L:{"England":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Ghana":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Croatia":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0},"Panama":{pts:0,p:0,w:0,d:0,l:0,f:0,a:0}},
};

// ── KNOCKOUT FIXTURES ─────────────────────────────────────────────────────
const R32_FIXTURE = [
  {match:73,home:"2A",away:"2B",kickoff:"Jun 28 · 3:00 PM ET · SoFi Stadium, LA"},
  {match:74,home:"1E",away:"3ABCDF",kickoff:"Jun 29 · 4:30 PM ET · Gillette Stadium, Boston"},
  {match:75,home:"1F",away:"2C",kickoff:"Jun 29 · 1:00 PM ET · NRG Stadium, Houston"},
  {match:76,home:"1C",away:"2F",kickoff:"Jun 29 · 9:00 PM ET · Estadio BBVA, Monterrey"},
  {match:77,home:"1I",away:"3CDFGH",kickoff:"Jun 30 · 5:00 PM ET · MetLife Stadium, NY/NJ"},
  {match:78,home:"2E",away:"2I",kickoff:"Jun 30 · 1:00 PM ET · AT&T Stadium, Dallas"},
  {match:79,home:"1A",away:"3CEFHI",kickoff:"Jun 30 · 9:00 PM ET · Estadio Azteca, Mexico City"},
  {match:80,home:"1L",away:"3EHIJK",kickoff:"Jul 1 · 12:00 PM ET · Mercedes-Benz, Atlanta"},
  {match:81,home:"1D",away:"3BEFIJ",kickoff:"Jul 1 · 8:00 PM ET · Levi's Stadium, San Francisco"},
  {match:82,home:"1G",away:"3AEHIJ",kickoff:"Jul 1 · 4:00 PM ET · Lumen Field, Seattle"},
  {match:83,home:"2K",away:"2L",kickoff:"Jul 2 · 7:00 PM ET · BMO Field, Toronto"},
  {match:84,home:"1H",away:"2J",kickoff:"Jul 2 · 3:00 PM ET · SoFi Stadium, LA"},
  {match:85,home:"1B",away:"3EFGIJ",kickoff:"Jul 2 · 11:00 PM ET · BC Place, Vancouver"},
  {match:86,home:"1J",away:"2H",kickoff:"Jul 3 · 6:00 PM ET · Hard Rock Stadium, Miami"},
  {match:87,home:"1K",away:"3DEIJL",kickoff:"Jul 3 · 9:30 PM ET · Arrowhead Stadium, Kansas City"},
  {match:88,home:"2D",away:"2G",kickoff:"Jul 3 · 2:00 PM ET · AT&T Stadium, Dallas"},
];
const R16_FIXTURE=[{match:89,home:"W74",away:"W77",kickoff:"Jul 4 · 5:00 PM ET"},{match:90,home:"W73",away:"W75",kickoff:"Jul 4 · 1:00 PM ET"},{match:91,home:"W76",away:"W78",kickoff:"Jul 5 · 4:00 PM ET"},{match:92,home:"W79",away:"W80",kickoff:"Jul 5 · 8:00 PM ET"},{match:93,home:"W83",away:"W84",kickoff:"Jul 6 · 3:00 PM ET"},{match:94,home:"W81",away:"W82",kickoff:"Jul 6 · 8:00 PM ET"},{match:95,home:"W86",away:"W88",kickoff:"Jul 7 · 12:00 PM ET"},{match:96,home:"W85",away:"W87",kickoff:"Jul 7 · 4:00 PM ET"}];
const QF_FIXTURE=[{match:97,home:"W89",away:"W90",kickoff:"Jul 9 · 4:00 PM ET"},{match:98,home:"W93",away:"W94",kickoff:"Jul 10 · 3:00 PM ET"},{match:99,home:"W91",away:"W92",kickoff:"Jul 11 · 5:00 PM ET"},{match:100,home:"W95",away:"W96",kickoff:"Jul 11 · 9:00 PM ET"}];
const SF_FIXTURE=[{match:101,home:"W97",away:"W98",kickoff:"Jul 14 · 3:00 PM ET"},{match:102,home:"W99",away:"W100",kickoff:"Jul 15 · 3:00 PM ET"}];
const THIRD_FIXTURE=[{match:103,home:"L101",away:"L102",kickoff:"Jul 18 · 5:00 PM ET"}];
const FINAL_FIXTURE=[{match:104,home:"W101",away:"W102",kickoff:"Jul 19 · 3:00 PM ET · MetLife Stadium, NY/NJ"}];

// ── HELPERS ───────────────────────────────────────────────────────────────
function parseCSV(csv) {
  const lines=csv.trim().split("\n").filter(Boolean);
  if(lines.length<2) return [];
  const headers=lines[0].split(",").map(h=>h.trim().replace(/^"|"$/g,"").toLowerCase());
  return lines.slice(1).map(line=>{
    const vals=line.split(",").map(v=>v.trim().replace(/^"|"$/g,""));
    const row={};
    headers.forEach((h,i)=>row[h]=vals[i]||"");
    return{group:row.group?.toUpperCase()||null,home:row.home||"",away:row.away||"",hg:row.hg!==""&&row.hg!=="-"?parseInt(row.hg):null,ag:row.ag!==""&&row.ag!=="-"?parseInt(row.ag):null,status:row.status||"scheduled",kickoff:row.kickoff||"",prob_home:row.prob_home?parseFloat(row.prob_home):null,prob_away:row.prob_away?parseFloat(row.prob_away):null};
  }).filter(r=>r.home&&r.away);
}
function applyResult(s,group,home,away,hg,ag){
  const g=JSON.parse(JSON.stringify(s[group]||{}));
  if(!g[home])g[home]={pts:0,p:0,w:0,d:0,l:0,f:0,a:0};
  if(!g[away])g[away]={pts:0,p:0,w:0,d:0,l:0,f:0,a:0};
  g[home].p++;g[away].p++;g[home].f+=hg;g[home].a+=ag;g[away].f+=ag;g[away].a+=hg;
  if(hg>ag){g[home].pts+=3;g[home].w++;g[away].l++;}
  else if(hg<ag){g[away].pts+=3;g[away].w++;g[home].l++;}
  else{g[home].pts++;g[away].pts++;g[home].d++;g[away].d++;}
  return{...s,[group]:g};
}
function sortGroup(teams){
  return Object.entries(teams).map(([name,s])=>({name,...s,gd:(s.f||0)-(s.a||0)})).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.f-a.f);
}
function buildStandings(seed,results){
  let s=JSON.parse(JSON.stringify(seed));
  for(const r of results)if(r.hg!==null&&r.ag!==null&&r.group)s=applyResult(s,r.group,r.home,r.away,r.hg,r.ag);
  return s;
}
function getBestThirds(standings){
  return Object.entries(standings).map(([grp,teams])=>{const s=sortGroup(teams);return s.length>=3?{...s[2],group:grp}:null;}).filter(Boolean).sort((a,b)=>b.pts-a.pts||b.gd-a.gd||b.f-a.f);
}

// ── GROUP COMPLETE CHECK — only resolve R32 when group has 3 played games per team ──
function isGroupComplete(group, results) {
  const grpResults = results.filter(r => r.group === group && r.hg !== null && r.ag !== null);
  // 4 teams × 3 games each / 2 = 6 matches total per group
  return grpResults.length >= 6;
}

function buildSlotMap(standings, thirds, results) {
  const map = {};
  const thirdSlots = ["3ABCDF","3CDFGH","3CEFHI","3EHIJK","3BEFIJ","3AEHIJ","3EFGIJ","3DEIJL"];
  
  for (const grp of Object.keys(standings)) {
    // Only resolve group qualifiers if the group is complete
    if (!isGroupComplete(grp, results)) continue;
    const s = sortGroup(standings[grp]);
    if(s[0]) map[`1${grp}`]=s[0].name;
    if(s[1]) map[`2${grp}`]=s[1].name;
    if(s[2]) map[`3${grp}`]=s[2].name;
  }
  
  // Only assign best-thirds slots if ALL groups are complete
  const allComplete = Object.keys(standings).every(g => isGroupComplete(g, results));
  if (allComplete) {
    thirds.slice(0,8).forEach((t,i)=>{if(thirdSlots[i])map[thirdSlots[i]]=t.name;});
  }
  return map;
}

function resolveSlot(slot,slotMap){
  if(slotMap[slot])return{label:slotMap[slot],team:slotMap[slot],confirmed:true};
  return{label:slot,team:null,confirmed:false};
}

// ── KICKOFF SORT ──────────────────────────────────────────────────────────
function kickoffOrder(k){
  if(!k)return 999999;
  try{
    const parts=k.split(/[·:]/);
    const[mon,dayStr]=parts[0].trim().split(" ");
    const day=parseInt(dayStr),monNum=mon==="Jun"?6:7;
    const hrRaw=parseInt(parts[1].trim());
    const[minStr,ampm]=parts[2].trim().split(" ");
    const mn=parseInt(minStr);
    let h=hrRaw;
    if(ampm==="PM"&&h!==12)h+=12;
    if(ampm==="AM"&&h===12)h=0;
    return monNum*100000+day*1000+h*60+mn;
  }catch{return 999999;}
}

const C={bg:"#060d1a",card:"#0f1520",border:"#1e2a4a",muted:"#37474f",dim:"#546e7a",text:"#e8eaf6",sub:"#90a4ae",blue:"#3d5afe",blueDark:"#1a237e",green:"#00e676",orange:"#ff9800",red:"#ef5350",gold:"#ffd600"};

// ── COUNTRY MODAL ─────────────────────────────────────────────────────────
function findTeamGroup(team,seed){return Object.entries(seed).find(([,teams])=>team in teams)?.[0]||null;}

function CountryModal({team,onClose,standings,results}){
  if(!team)return null;
  const grpKey=findTeamGroup(team,standings);
  const grpTeams=grpKey?sortGroup(standings[grpKey]||[]):[];
  const myStats=grpKey?standings[grpKey]?.[team]:null;
  const myMatches=results.filter(r=>r.home===team||r.away===team);
  const myResults=myMatches.filter(r=>r.hg!==null&&r.ag!==null);
  const myUpcoming=myMatches.filter(r=>r.hg===null&&r.ag===null);
  const getRes=(r)=>{const isHome=r.home===team,myG=isHome?r.hg:r.ag,theirG=isHome?r.ag:r.hg;if(myG>theirG)return"W";if(myG<theirG)return"L";return"D";};
  const resColor=(r)=>r==="W"?"#00e676":r==="L"?"#ef5350":"#ffd600";
  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",zIndex:1000,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0a1020",border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:480,maxHeight:"90vh",overflowY:"auto",padding:20}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:18}}>
          <div style={{display:"flex",alignItems:"center",gap:12}}>
            <span style={{fontSize:44}}>{fl(team)||"🏳"}</span>
            <div><div style={{fontSize:20,fontWeight:800,color:C.text}}>{team}</div><div style={{fontSize:12,color:C.dim}}>FIFA {rank(team)||"–"} · {grpKey?`Group ${grpKey}`:"–"}</div></div>
          </div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:`1px solid ${C.border}`,color:C.sub,borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18}}>✕</button>
        </div>
        {myStats&&<div style={{display:"grid",gridTemplateColumns:"repeat(5,1fr)",gap:8,marginBottom:18}}>{[["Pts",myStats.pts,C.gold],["W",myStats.w,C.green],["D",myStats.d,C.gold],["L",myStats.l,C.red],["GD",(myStats.f||0)-(myStats.a||0),null]].map(([k,v,col])=>(
          <div key={k} style={{background:C.card,borderRadius:10,padding:"10px 4px",textAlign:"center",border:`1px solid ${C.border}`}}>
            <div style={{fontSize:20,fontWeight:800,color:col||(v>0?"#00e676":v<0?C.red:C.text)}}>{k==="GD"&&v>0?"+":""}{v}</div>
            <div style={{fontSize:10,color:C.dim,marginTop:2}}>{k}</div>
          </div>
        ))}</div>}
        {TOP_PLAYERS[team]&&<div style={{marginBottom:18}}><div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Key Players</div><div style={{background:C.card,borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`}}>{TOP_PLAYERS[team].map((p,i)=>(
          <div key={p.n} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",borderBottom:i<TOP_PLAYERS[team].length-1?`1px solid #0a1020`:"none"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,color:C.dim,width:14}}>{i+1}</span><div><div style={{fontSize:13,fontWeight:600,color:C.text}}>{p.n}</div><div style={{fontSize:10,color:C.dim}}>{p.p}</div></div></div>
            <div style={{display:"flex",alignItems:"center",gap:8}}>{p.goals>0&&<span style={{fontSize:12,fontWeight:700,color:C.gold}}>⚽ {p.goals}</span>}{p.ht>0&&<span style={{fontSize:10,fontWeight:700,color:C.gold,background:C.gold+"22",borderRadius:4,padding:"2px 5px"}}>HAT</span>}{p.goals===0&&<span style={{fontSize:11,color:C.muted}}>–</span>}</div>
          </div>
        ))}</div></div>}
        {myUpcoming.length>0&&<div style={{marginBottom:18}}><div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Upcoming</div>{myUpcoming.map((m,i)=>(
          <div key={i} style={{background:C.card,borderRadius:10,padding:"10px 12px",marginBottom:6,border:`1px solid ${C.border}`}}>
            <div style={{fontSize:11,color:C.gold,marginBottom:4}}>🕐 {m.kickoff}</div>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}><span style={{fontSize:12,color:C.text,fontWeight:600}}>{fl(m.home)} {m.home}</span><span style={{fontSize:11,color:C.dim}}>vs</span><span style={{fontSize:12,color:C.text,fontWeight:600}}>{m.away} {fl(m.away)}</span></div>
          </div>
        ))}</div>}
        {myResults.length>0&&<div style={{marginBottom:18}}><div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Results</div>{myResults.map((m,i)=>{const res=getRes(m),isHome=m.home===team,opp=isHome?m.away:m.home;return(
          <div key={i} style={{background:C.card,borderRadius:10,padding:"10px 12px",marginBottom:6,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontWeight:700,fontSize:12,color:resColor(res),background:resColor(res)+"22",borderRadius:6,padding:"2px 7px"}}>{res}</span><span style={{fontSize:12,color:C.sub}}>{fl(opp)} {opp}</span></div>
            <span style={{fontSize:14,fontWeight:800,color:C.text}}>{m.hg} – {m.ag}</span>
          </div>
        );})}
        </div>}
        {grpKey&&grpTeams.length>0&&<div style={{marginBottom:18}}><div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>Group {grpKey} Standing</div><div style={{background:C.card,borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`}}>{grpTeams.map((t,i)=>(
          <div key={t.name} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"9px 12px",borderBottom:i<grpTeams.length-1?`1px solid #0a1020`:"none",background:t.name===team?"rgba(253,214,0,0.06)":"transparent"}}>
            <div style={{display:"flex",alignItems:"center",gap:8}}><span style={{fontSize:11,color:C.dim,width:14}}>{i+1}</span><span style={{fontSize:18}}>{fl(t.name)||"🏳"}</span><span style={{fontSize:12,color:t.name===team?C.gold:C.text,fontWeight:t.name===team?700:500}}>{t.name}</span></div>
            <div style={{display:"flex",gap:10,alignItems:"center"}}><span style={{fontSize:11,color:C.dim}}>{t.w}W {t.d}D {t.l}L</span><span style={{fontSize:13,fontWeight:800,color:t.name===team?C.gold:C.blue}}>{t.pts}pts</span></div>
          </div>
        ))}</div></div>}
        <div style={{fontSize:11,color:C.muted,textAlign:"center"}}>FIFA ranking Jun 11 2026</div>
      </div>
    </div>
  );
}

// ── PINCH-TO-ZOOM WRAPPER ─────────────────────────────────────────────────
function PinchZoom({children}){
  const containerRef=useRef(null);
  const contentRef=useRef(null);
  const st=useRef({scale:1,tx:0,ty:0,initDist:0,initScale:1,initMid:{x:0,y:0},initTx:0,initTy:0,pinching:false,panning:false,lastTx:0,lastTy:0,startTouch:{x:0,y:0}});

  const apply=()=>{
    if(contentRef.current){
      contentRef.current.style.transform=`translate(${st.current.tx}px,${st.current.ty}px) scale(${st.current.scale})`;
    }
  };

  const dist=(a,b)=>Math.hypot(b.clientX-a.clientX,b.clientY-a.clientY);
  const mid=(a,b)=>({x:(a.clientX+b.clientX)/2,y:(a.clientY+b.clientY)/2});
  const clamp=(v,lo,hi)=>Math.min(Math.max(v,lo),hi);

  useEffect(()=>{
    const el=containerRef.current;
    if(!el) return;

    const onStart=(e)=>{
      const s=st.current;
      if(e.touches.length===2){
        e.preventDefault();
        s.pinching=true; s.panning=false;
        s.initDist=dist(e.touches[0],e.touches[1]);
        s.initScale=s.scale;
        s.initMid=mid(e.touches[0],e.touches[1]);
        s.initTx=s.tx; s.initTy=s.ty;
      } else if(e.touches.length===1 && s.scale>1){
        s.panning=true; s.pinching=false;
        s.startTouch={x:e.touches[0].clientX,y:e.touches[0].clientY};
        s.lastTx=s.tx; s.lastTy=s.ty;
      }
    };

    const onMove=(e)=>{
      const s=st.current;
      if(e.touches.length===2 && s.pinching){
        e.preventDefault();
        const d=dist(e.touches[0],e.touches[1]);
        const newScale=clamp(s.initScale*(d/s.initDist),0.5,5);
        const m=mid(e.touches[0],e.touches[1]);
        // Scale around pinch midpoint
        const scaleDiff=newScale-s.initScale;
        const tx=s.initTx-(s.initMid.x*scaleDiff/newScale);
        const ty=s.initTy-(s.initMid.y*scaleDiff/newScale);
        s.scale=newScale; s.tx=tx; s.ty=ty;
        apply();
      } else if(e.touches.length===1 && s.panning){
        e.preventDefault();
        const dx=e.touches[0].clientX-s.startTouch.x;
        const dy=e.touches[0].clientY-s.startTouch.y;
        s.tx=s.lastTx+dx; s.ty=s.lastTy+dy;
        apply();
      }
    };

    const onEnd=(e)=>{
      const s=st.current;
      if(e.touches.length<2) s.pinching=false;
      if(e.touches.length===0) s.panning=false;
    };

    el.addEventListener("touchstart",onStart,{passive:false});
    el.addEventListener("touchmove",onMove,{passive:false});
    el.addEventListener("touchend",onEnd,{passive:true});
    return()=>{
      el.removeEventListener("touchstart",onStart);
      el.removeEventListener("touchmove",onMove);
      el.removeEventListener("touchend",onEnd);
    };
  },[]);

  const reset=()=>{
    const s=st.current;
    s.scale=1;s.tx=0;s.ty=0;
    apply();
  };

  return(
    <div ref={containerRef} style={{overflow:"hidden",position:"relative",userSelect:"none",WebkitUserSelect:"none"}}>
      <div ref={contentRef} style={{transformOrigin:"0 0",willChange:"transform",display:"inline-block",minWidth:"100%"}}>
        {children}
      </div>
      <button onClick={reset} style={{position:"absolute",top:8,right:8,background:"rgba(15,21,32,0.9)",border:`1px solid ${C.border}`,color:C.sub,borderRadius:6,padding:"5px 10px",fontSize:11,cursor:"pointer",zIndex:10}}>↺ Reset</button>
    </div>
  );
}

// ── UI COMPONENTS ─────────────────────────────────────────────────────────
function Tab({label,active,onClick}){return<button onClick={onClick} style={{padding:"7px 13px",borderRadius:8,border:"none",cursor:"pointer",fontSize:12,fontWeight:700,whiteSpace:"nowrap",background:active?C.blue:"#111827",color:active?"#fff":C.dim}}>{label}</button>;}
function RankBadge({name,style={}}){const r=rank(name);if(!r)return null;return<span style={{fontSize:9,fontWeight:700,color:"#607d8b",background:"#0a1428",border:"1px solid #1e2a4a",borderRadius:3,padding:"1px 4px",lineHeight:1,whiteSpace:"nowrap",...style}}>{r}</span>;}
function ClickableFlag({name,onSelect}){const emoji=fl(name);if(!emoji)return null;return<span onClick={e=>{e.stopPropagation();onSelect&&onSelect(name);}} style={{fontSize:20,cursor:"pointer",userSelect:"none"}} title={`View ${name}`}>{emoji}</span>;}
function TeamName({name,align="right",bold=false,onSelect}){const isRight=align==="right";return(
  <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:isRight?"flex-end":"flex-start",gap:5}}>
    {isRight&&<><RankBadge name={name}/><span style={{fontSize:13,fontWeight:bold?700:500,color:bold?C.text:C.sub,textAlign:"right"}}>{name}</span><ClickableFlag name={name} onSelect={onSelect}/></>}
    {!isRight&&<><ClickableFlag name={name} onSelect={onSelect}/><span style={{fontSize:13,fontWeight:bold?700:500,color:bold?C.text:C.sub}}>{name}</span><RankBadge name={name}/></>}
  </div>
);}

function MatchRow({home,away,hg,ag,status,kickoff,prob_home,prob_away,compact,onSelect,clock=""}){
  const played=hg!==null&&ag!==null,live=status==="in_progress",fin=status==="final";
  const hWin=played&&hg>ag,aWin=played&&ag>hg;
  return(
    <div style={{background:C.card,borderRadius:10,padding:compact?"10px 14px":"14px 18px",marginBottom:7,border:`1px solid ${live?"#ff980055":C.border}`,boxShadow:live?"0 0 12px #ff980018":"none"}}>
      {kickoff&&!played&&<div style={{fontSize:10,color:C.gold,fontWeight:700,marginBottom:6}}>🕐 {kickoff}</div>}
      <div style={{display:"flex",alignItems:"center",gap:6}}>
        <TeamName name={home} align="right" bold={hWin} onSelect={onSelect}/>
        <div style={{textAlign:"center",minWidth:72}}>
          {live&&<div style={{fontSize:8,color:C.orange,fontWeight:700,letterSpacing:1,marginBottom:1,animation:"pulse 1s infinite"}}>● LIVE {clock?<span style={{fontSize:9,color:C.orange}}>{clock}&apos;</span>:""}</div>}
          {fin&&<div style={{fontSize:8,color:C.green,fontWeight:700,letterSpacing:1,marginBottom:1}}>FT</div>}
          {played?<div style={{fontSize:compact?17:20,fontWeight:900,color:"#fff",letterSpacing:2}}>{hg}<span style={{color:C.border}}> – </span>{ag}</div>
          :<div><div style={{fontSize:11,color:C.muted,fontWeight:700}}>vs</div>{prob_home&&<div style={{fontSize:9,color:C.dim,marginTop:2}}>{prob_home}% · {prob_away}%</div>}</div>}
        </div>
        <TeamName name={away} align="left" bold={aWin} onSelect={onSelect}/>
      </div>
    </div>
  );
}

function CollapsibleSection({title,count,defaultOpen=true,accent=C.blue,children}){
  const[open,setOpen]=useState(defaultOpen);
  return(
    <div style={{marginBottom:16}}>
      <button onClick={()=>setOpen(o=>!o)} style={{width:"100%",display:"flex",alignItems:"center",justifyContent:"space-between",background:"transparent",border:"none",cursor:"pointer",padding:"8px 0",marginBottom:open?8:0}}>
        <div style={{display:"flex",alignItems:"center",gap:10}}><div style={{width:3,height:18,borderRadius:2,background:accent}}/><span style={{fontSize:12,fontWeight:800,color:C.text,letterSpacing:1}}>{title}</span><span style={{fontSize:10,fontWeight:700,color:accent,background:accent+"22",borderRadius:12,padding:"2px 8px"}}>{count}</span></div>
        <span style={{fontSize:16,color:C.dim,transform:open?"rotate(0deg)":"rotate(-90deg)",transition:"transform 0.2s"}}>▾</span>
      </button>
      {open&&<div>{children}</div>}
    </div>
  );
}

function StandingsTable({teams,onSelect}){
  return(
    <div style={{background:C.card,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
      <div style={{display:"grid",gridTemplateColumns:"22px 1fr 34px 26px 26px 26px 26px 26px 26px 34px",padding:"8px 12px",background:"#0a1020",borderBottom:`1px solid ${C.border}`}}>
        {["#","Team","Pts","P","W","D","L","F","A","GD"].map((h,i)=><div key={h} style={{fontSize:9,fontWeight:700,color:C.muted,textAlign:i>1?"center":"left",textTransform:"uppercase",letterSpacing:1}}>{h}</div>)}
      </div>
      {teams.map((t,idx)=>{const isQ=idx<2,is3=idx===2;return(
        <div key={t.name} style={{display:"grid",gridTemplateColumns:"22px 1fr 34px 26px 26px 26px 26px 26px 26px 34px",padding:"11px 12px",alignItems:"center",borderBottom:idx<teams.length-1?"1px solid #0d1428":"none",borderLeft:`3px solid ${isQ?C.blue:is3?"#546e7a55":"transparent"}`,background:idx%2===0?C.card:"#0a1228"}}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700}}>{idx+1}</div>
          <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
            <span onClick={()=>onSelect&&onSelect(t.name)} style={{fontSize:16,cursor:"pointer"}}>{fl(t.name)||"🏳"}</span>
            <span style={{fontSize:13,fontWeight:600,color:isQ?C.text:C.sub}}>{t.name}</span>
            <RankBadge name={t.name}/>
            {isQ&&<span style={{fontSize:7,background:C.blueDark,color:"#7986cb",padding:"2px 4px",borderRadius:3,fontWeight:700}}>Q</span>}
            {is3&&<span style={{fontSize:7,background:"#37474f33",color:C.dim,padding:"2px 4px",borderRadius:3,fontWeight:700}}>3rd</span>}
          </div>
          <div style={{textAlign:"center",fontSize:13,fontWeight:800,color:isQ?C.blue:C.text}}>{t.pts}</div>
          {[t.p,t.w,t.d,t.l,t.f,t.a].map((v,i)=><div key={i} style={{textAlign:"center",fontSize:11,color:C.dim}}>{v}</div>)}
          <div style={{textAlign:"center",fontSize:11,fontWeight:700,color:t.gd>0?C.green:t.gd<0?C.red:C.dim}}>{t.gd>0?"+":""}{t.gd}</div>
        </div>
      );})}
    </div>
  );
}

function BestThirdsTable({thirds,onSelect}){
  return(
    <div style={{background:C.card,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
      <div style={{display:"grid",gridTemplateColumns:"22px 1fr 26px 32px 24px 24px 24px 24px 24px 24px 30px",padding:"8px 12px",background:"#0a1020",borderBottom:`1px solid ${C.border}`}}>
        {["#","Team","Grp","Pts","P","W","D","L","F","A","GD"].map((h,i)=><div key={h} style={{fontSize:9,fontWeight:700,color:C.muted,textAlign:i>1?"center":"left",textTransform:"uppercase",letterSpacing:1}}>{h}</div>)}
      </div>
      {thirds.map((t,idx)=>{const adv=idx<8;return(
        <div key={t.name} style={{display:"grid",gridTemplateColumns:"22px 1fr 26px 32px 24px 24px 24px 24px 24px 24px 30px",padding:"10px 12px",alignItems:"center",borderBottom:idx<thirds.length-1?"1px solid #0d1428":"none",borderLeft:`3px solid ${adv?C.gold+"99":"transparent"}`,background:idx%2===0?C.card:"#0a1228"}}>
          <div style={{fontSize:11,color:C.muted,fontWeight:700}}>{idx+1}</div>
          <div style={{display:"flex",alignItems:"center",gap:5,flexWrap:"wrap"}}>
            <span onClick={()=>onSelect&&onSelect(t.name)} style={{fontSize:16,cursor:"pointer"}}>{fl(t.name)||"🏳"}</span>
            <span style={{fontSize:13,fontWeight:600,color:adv?C.text:C.sub}}>{t.name}</span>
            <RankBadge name={t.name}/>
            {adv&&<span style={{fontSize:7,background:"#f57f1722",color:C.gold,padding:"2px 4px",borderRadius:3,fontWeight:700}}>ADV</span>}
          </div>
          <div style={{textAlign:"center",fontSize:11,fontWeight:700,color:C.blue}}>{t.group}</div>
          <div style={{textAlign:"center",fontSize:13,fontWeight:800,color:adv?C.gold:C.text}}>{t.pts}</div>
          {[t.p,t.w,t.d,t.l,t.f,t.a].map((v,i)=><div key={i} style={{textAlign:"center",fontSize:11,color:C.dim}}>{v}</div>)}
          <div style={{textAlign:"center",fontSize:11,fontWeight:700,color:t.gd>0?C.green:t.gd<0?C.red:C.dim}}>{t.gd>0?"+":""}{t.gd}</div>
        </div>
      );})}
    </div>
  );
}

function TeamSlot({res,align,onSelect}){
  const{label,team,confirmed}=res,emoji=team?fl(team):null,isRight=align==="right";
  return(
    <div style={{flex:1,display:"flex",alignItems:"center",gap:6,justifyContent:isRight?"flex-end":"flex-start"}}>
      {isRight&&<>{confirmed&&<RankBadge name={team}/>}<span style={{fontSize:13,fontWeight:confirmed?700:400,color:confirmed?C.text:C.muted,textAlign:"right",lineHeight:1.2}}>{label}</span>{emoji?<span onClick={()=>onSelect&&onSelect(team)} style={{fontSize:22,cursor:"pointer"}}>{emoji}</span>:<div style={{width:24,height:24,borderRadius:"50%",background:"#1e2a4a",border:`1px solid ${C.border}`,flexShrink:0}}/>}</>}
      {!isRight&&<>{emoji?<span onClick={()=>onSelect&&onSelect(team)} style={{fontSize:22,cursor:"pointer"}}>{emoji}</span>:<div style={{width:24,height:24,borderRadius:"50%",background:"#1e2a4a",border:`1px solid ${C.border}`,flexShrink:0}}/> }<span style={{fontSize:13,fontWeight:confirmed?700:400,color:confirmed?C.text:C.muted,lineHeight:1.2}}>{label}</span>{confirmed&&<RankBadge name={team}/>}</>}
    </div>
  );
}

function KnockoutMatchRow({r,slotMap,divider,accent,onSelect}){
  const homeRes=resolveSlot(r.home,slotMap),awayRes=resolveSlot(r.away,slotMap);
  return(
    <div style={{borderBottom:divider?`1px solid ${C.border}`:"none"}}>
      <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px 0",flexWrap:"wrap"}}>
        <span style={{fontSize:9,fontWeight:700,color:accent,background:accent+"18",borderRadius:4,padding:"2px 7px"}}>#{r.match}</span>
        {r.kickoff&&<span style={{fontSize:10,fontWeight:700,color:C.gold}}>🕐 {r.kickoff}</span>}
      </div>
      <div style={{display:"flex",alignItems:"center",padding:"9px 14px 10px",gap:8}}>
        <TeamSlot res={homeRes} align="right" onSelect={onSelect}/>
        <div style={{minWidth:36,textAlign:"center",fontSize:10,fontWeight:700,color:C.muted,borderLeft:`1px solid ${C.border}`,borderRight:`1px solid ${C.border}`,padding:"4px 6px"}}>vs</div>
        <TeamSlot res={awayRes} align="left" onSelect={onSelect}/>
      </div>
    </div>
  );
}

function KnockoutGrid({rounds,slotMap,accent=C.blue,title,info,onSelect,pinchable}){
  const pairs=[];for(let i=0;i<rounds.length;i+=2)pairs.push(rounds.slice(i,i+2));
  const content=(
    <div style={{marginBottom:20}}>
      {title&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}><div style={{width:3,height:18,background:accent,borderRadius:2}}/><span style={{fontSize:12,fontWeight:800,color:C.text,letterSpacing:1}}>{title}</span></div>}
      {info&&<div style={{background:"#1a237e18",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 13px",marginBottom:12,fontSize:12,color:C.sub}}>{info}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:10}}>
        {pairs.map((pair,pi)=>(
          <div key={pi} style={{background:"#0a1020",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
            {pair.map((r,ri)=><KnockoutMatchRow key={r.match} r={r} slotMap={slotMap} divider={ri<pair.length-1} accent={accent} onSelect={onSelect}/>)}
          </div>
        ))}
      </div>
    </div>
  );
  return pinchable ? <PinchZoom>{content}</PinchZoom> : content;
}

// ── DEMO RESULTS (static baseline) ───────────────────────────────────────
const DEMO_RESULTS=[
  {group:"A",home:"Mexico",away:"South Africa",hg:2,ag:0,status:"final",kickoff:"Jun 11 · 8:00 PM ET"},
  {group:"A",home:"Korea Republic",away:"Czechia",hg:2,ag:1,status:"final",kickoff:"Jun 11 · 5:00 PM ET"},
  {group:"A",home:"Mexico",away:"Korea Republic",hg:1,ag:0,status:"final",kickoff:"Jun 18 · 9:00 PM ET"},
  {group:"A",home:"Czechia",away:"South Africa",hg:1,ag:1,status:"final",kickoff:"Jun 18 · 9:00 PM ET"},
  {group:"A",home:"Czechia",away:"Mexico",hg:0,ag:3,status:"final",kickoff:"Jun 24 · 9:00 PM ET"},
  {group:"A",home:"South Africa",away:"Korea Republic",hg:1,ag:0,status:"final",kickoff:"Jun 24 · 9:00 PM ET"},
  {group:"B",home:"Canada",away:"Bosnia and Herzegovina",hg:1,ag:1,status:"final",kickoff:"Jun 12 · 3:00 PM ET"},
  {group:"B",home:"Switzerland",away:"Qatar",hg:1,ag:1,status:"final",kickoff:"Jun 12 · 3:00 PM ET"},
  {group:"B",home:"Canada",away:"Qatar",hg:6,ag:0,status:"final",kickoff:"Jun 19 · 6:00 PM ET"},
  {group:"B",home:"Switzerland",away:"Bosnia and Herzegovina",hg:4,ag:1,status:"final",kickoff:"Jun 19 · 6:00 PM ET"},
  {group:"B",home:"Switzerland",away:"Canada",hg:2,ag:1,status:"final",kickoff:"Jun 24 · 3:00 PM ET"},
  {group:"B",home:"Bosnia and Herzegovina",away:"Qatar",hg:3,ag:1,status:"final",kickoff:"Jun 24 · 3:00 PM ET"},
  {group:"C",home:"Brazil",away:"Haiti",hg:3,ag:0,status:"final",kickoff:"Jun 13 · 9:00 PM ET"},
  {group:"C",home:"Morocco",away:"Scotland",hg:1,ag:0,status:"final",kickoff:"Jun 13 · 6:00 PM ET"},
  {group:"C",home:"Brazil",away:"Morocco",hg:1,ag:1,status:"final",kickoff:"Jun 20 · 9:00 PM ET"},
  {group:"C",home:"Scotland",away:"Haiti",hg:1,ag:0,status:"final",kickoff:"Jun 20 · 6:00 PM ET"},
  {group:"C",home:"Scotland",away:"Brazil",hg:0,ag:3,status:"final",kickoff:"Jun 24 · 6:00 PM ET"},
  {group:"C",home:"Morocco",away:"Haiti",hg:4,ag:2,status:"final",kickoff:"Jun 24 · 6:00 PM ET"},
  {group:"D",home:"USA",away:"Paraguay",hg:4,ag:1,status:"final",kickoff:"Jun 12 · 9:00 PM ET"},
  {group:"D",home:"Australia",away:"Turkiye",hg:2,ag:0,status:"final",kickoff:"Jun 13 · 3:00 PM ET"},
  {group:"D",home:"USA",away:"Australia",hg:2,ag:0,status:"final",kickoff:"Jun 19 · 9:00 PM ET"},
  {group:"D",home:"Turkiye",away:"Paraguay",hg:0,ag:1,status:"final",kickoff:"Jun 19 · 6:00 PM ET"},
  {group:"E",home:"Germany",away:"Curacao",hg:7,ag:1,status:"final",kickoff:"Jun 14 · 3:00 PM ET"},
  {group:"E",home:"Ivory Coast",away:"Ecuador",hg:1,ag:0,status:"final",kickoff:"Jun 14 · 6:00 PM ET"},
  {group:"E",home:"Germany",away:"Ivory Coast",hg:2,ag:1,status:"final",kickoff:"Jun 20 · 6:00 PM ET"},
  {group:"E",home:"Ecuador",away:"Curacao",hg:0,ag:0,status:"final",kickoff:"Jun 20 · 9:00 PM ET"},
  {group:"F",home:"Netherlands",away:"Japan",hg:2,ag:2,status:"final",kickoff:"Jun 14 · 6:00 PM ET"},
  {group:"F",home:"Sweden",away:"Tunisia",hg:5,ag:1,status:"final",kickoff:"Jun 14 · 9:00 PM ET"},
  {group:"F",home:"Netherlands",away:"Sweden",hg:5,ag:1,status:"final",kickoff:"Jun 20 · 3:00 PM ET"},
  {group:"F",home:"Japan",away:"Tunisia",hg:4,ag:0,status:"final",kickoff:"Jun 20 · 6:00 PM ET"},
  {group:"G",home:"Belgium",away:"Egypt",hg:1,ag:1,status:"final",kickoff:"Jun 15 · 3:00 PM ET"},
  {group:"G",home:"Iran",away:"New Zealand",hg:2,ag:2,status:"final",kickoff:"Jun 15 · 6:00 PM ET"},
  {group:"G",home:"Belgium",away:"Iran",hg:0,ag:0,status:"final",kickoff:"Jun 21 · 3:00 PM ET"},
  {group:"G",home:"Egypt",away:"New Zealand",hg:3,ag:1,status:"final",kickoff:"Jun 21 · 6:00 PM ET"},
  {group:"H",home:"Spain",away:"Cape Verde",hg:0,ag:0,status:"final",kickoff:"Jun 15 · 9:00 PM ET"},
  {group:"H",home:"Saudi Arabia",away:"Uruguay",hg:1,ag:1,status:"final",kickoff:"Jun 15 · 6:00 PM ET"},
  {group:"H",home:"Spain",away:"Saudi Arabia",hg:4,ag:0,status:"final",kickoff:"Jun 21 · 9:00 PM ET"},
  {group:"H",home:"Uruguay",away:"Cape Verde",hg:2,ag:2,status:"final",kickoff:"Jun 21 · 6:00 PM ET"},
  {group:"I",home:"France",away:"Senegal",hg:3,ag:1,status:"final",kickoff:"Jun 16 · 3:00 PM ET"},
  {group:"I",home:"Norway",away:"Iraq",hg:4,ag:1,status:"final",kickoff:"Jun 16 · 6:00 PM ET"},
  {group:"I",home:"France",away:"Iraq",hg:3,ag:0,status:"final",kickoff:"Jun 22 · 3:00 PM ET"},
  {group:"I",home:"Norway",away:"Senegal",hg:3,ag:2,status:"final",kickoff:"Jun 22 · 6:00 PM ET"},
  {group:"J",home:"Argentina",away:"Algeria",hg:3,ag:0,status:"final",kickoff:"Jun 16 · 9:00 PM ET"},
  {group:"J",home:"Jordan",away:"Austria",hg:1,ag:3,status:"final",kickoff:"Jun 17 · 3:00 PM ET"},
  {group:"J",home:"Argentina",away:"Austria",hg:2,ag:0,status:"final",kickoff:"Jun 22 · 9:00 PM ET"},
  {group:"J",home:"Algeria",away:"Jordan",hg:2,ag:1,status:"final",kickoff:"Jun 22 · 6:00 PM ET"},
  {group:"K",home:"Colombia",away:"Uzbekistan",hg:3,ag:1,status:"final",kickoff:"Jun 17 · 6:00 PM ET"},
  {group:"K",home:"Portugal",away:"Congo DR",hg:1,ag:1,status:"final",kickoff:"Jun 17 · 9:00 PM ET"},
  {group:"K",home:"Colombia",away:"Congo DR",hg:1,ag:0,status:"final",kickoff:"Jun 23 · 10:00 PM ET"},
  {group:"K",home:"Portugal",away:"Uzbekistan",hg:5,ag:0,status:"final",kickoff:"Jun 23 · 1:00 PM ET"},
  {group:"L",home:"England",away:"Croatia",hg:4,ag:2,status:"final",kickoff:"Jun 17 · 3:00 PM ET"},
  {group:"L",home:"Ghana",away:"Panama",hg:1,ag:0,status:"final",kickoff:"Jun 17 · 6:00 PM ET"},
  {group:"L",home:"England",away:"Ghana",hg:0,ag:0,status:"final",kickoff:"Jun 23 · 4:00 PM ET"},
  {group:"L",home:"Panama",away:"Croatia",hg:0,ag:1,status:"final",kickoff:"Jun 23 · 7:00 PM ET"},
  // ── MD3 COMPLETED Jun 25 ──
  {group:"E",home:"Ecuador",away:"Germany",hg:2,ag:1,status:"final",kickoff:"Jun 25 · 4:00 PM ET"},
  {group:"E",home:"Curacao",away:"Ivory Coast",hg:0,ag:2,status:"final",kickoff:"Jun 25 · 4:00 PM ET"},
  {group:"F",home:"Tunisia",away:"Netherlands",hg:1,ag:3,status:"final",kickoff:"Jun 25 · 7:00 PM ET"},
  {group:"F",home:"Japan",away:"Sweden",hg:1,ag:1,status:"final",kickoff:"Jun 25 · 7:00 PM ET"},
  {group:"D",home:"Turkiye",away:"USA",hg:3,ag:2,status:"final",kickoff:"Jun 25 · 10:00 PM ET"},
  {group:"D",home:"Paraguay",away:"Australia",hg:0,ag:0,status:"final",kickoff:"Jun 25 · 10:00 PM ET"},
  // ── UPCOMING MD3 Jun 26-27 ──
  {group:"I",home:"Norway",away:"France",hg:null,ag:null,status:"scheduled",kickoff:"Jun 26 · 3:00 PM ET",prob_home:20,prob_away:59.3},
  {group:"I",home:"Senegal",away:"Iraq",hg:null,ag:null,status:"scheduled",kickoff:"Jun 26 · 3:00 PM ET",prob_home:79,prob_away:7.4},
  {group:"H",home:"Uruguay",away:"Spain",hg:null,ag:null,status:"scheduled",kickoff:"Jun 26 · 8:00 PM ET",prob_home:14.3,prob_away:64.1},
  {group:"H",home:"Cape Verde",away:"Saudi Arabia",hg:null,ag:null,status:"scheduled",kickoff:"Jun 26 · 8:00 PM ET",prob_home:36.7,prob_away:34.7},
  {group:"G",home:"Egypt",away:"Iran",hg:null,ag:null,status:"scheduled",kickoff:"Jun 26 · 11:00 PM ET"},
  {group:"G",home:"New Zealand",away:"Belgium",hg:null,ag:null,status:"scheduled",kickoff:"Jun 26 · 11:00 PM ET"},
  {group:"J",home:"Argentina",away:"Jordan",hg:null,ag:null,status:"scheduled",kickoff:"Jun 27 · 3:00 PM ET"},
  {group:"J",home:"Austria",away:"Algeria",hg:null,ag:null,status:"scheduled",kickoff:"Jun 27 · 3:00 PM ET"},
  {group:"L",home:"Panama",away:"England",hg:null,ag:null,status:"scheduled",kickoff:"Jun 27 · 5:00 PM ET"},
  {group:"L",home:"Croatia",away:"Ghana",hg:null,ag:null,status:"scheduled",kickoff:"Jun 27 · 5:00 PM ET"},
  {group:"K",home:"Colombia",away:"Portugal",hg:null,ag:null,status:"scheduled",kickoff:"Jun 27 · 7:30 PM ET"},
  {group:"K",home:"Congo DR",away:"Uzbekistan",hg:null,ag:null,status:"scheduled",kickoff:"Jun 27 · 7:30 PM ET"},
];

// ── FOOTER ────────────────────────────────────────────────────────────────
function Footer(){
  return(
    <footer style={{borderTop:`1px solid ${C.border}`,marginTop:40,padding:"20px 16px",textAlign:"center",background:"#060d1a"}}>
      <div style={{fontSize:12,color:C.dim,marginBottom:6}}>
        🏆 FIFA World Cup 2026 · USA · Canada · Mexico
      </div>
      <div style={{fontSize:11,color:"#37474f"}}>
        © 2026 Developed by <span style={{color:C.gold,fontWeight:700}}>MRTeam</span>
      </div>
      <div style={{fontSize:10,color:"#263238",marginTop:6}}>
        Data sourced from public APIs · Not affiliated with FIFA
      </div>
    </footer>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────
export default function WorldCup2026(){
  const[view,setView]=useState("live");
  const[activeGroup,setActiveGroup]=useState("A");
  const[results,setResults]=useState(DEMO_RESULTS);
  const[loading,setLoading]=useState(false);
  const[error,setError]=useState(null);
  const[lastUpdated,setLastUpdated]=useState(null);
  const[selectedTeam,setSelectedTeam]=useState(null);
  const[liveStatus,setLiveStatus]=useState("idle"); // idle | fetching | live | offline
  const prevResultsRef=useRef(null);

  // ── LIVE SCORE FETCH (ESPN free API) ────────────────────────────────────
  const fetchLive=useCallback(async()=>{
    setLiveStatus("fetching");
    try{
      const liveData=await fetchLiveScores();
      if(liveData&&liveData.length>0){
        const merged=mergeResults(DEMO_RESULTS,liveData);
        // Only update state if data actually changed
        if(diffResults(prevResultsRef.current,merged)){
          prevResultsRef.current=merged;
          setResults(merged);
          setLastUpdated(new Date().toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit",timeZoneName:"short"}));
        }
        setLiveStatus("live");
      } else {
        setLiveStatus("offline");
      }
    }catch{
      setLiveStatus("offline");
    }
  },[]);

  // ── GOOGLE SHEET FETCH (manual override) ────────────────────────────────
  const fetchSheet=useCallback(async()=>{
    if(isDemo) return fetchLive();
    setLoading(true);setError(null);
    try{
      const res=await fetch(`${SHEET_CSV_URL}&t=${Date.now()}`);
      if(!res.ok)throw new Error("Sheet fetch failed");
      const text=await res.text();
      const parsed=parseCSV(text);
      if(parsed.length>0){
        if(diffResults(prevResultsRef.current,parsed)){
          prevResultsRef.current=parsed;
          setResults(parsed);
          setLastUpdated(new Date().toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit",timeZoneName:"short"}));
        }
      }
    }catch(e){setError(e.message);}
    finally{setLoading(false);}
  },[fetchLive]);

  useEffect(()=>{fetchLive();},[fetchLive]);
  useEffect(()=>{
    if(!AUTO_REFRESH_SECONDS)return;
    const id=setInterval(fetchLive,AUTO_REFRESH_SECONDS*1000);
    return()=>clearInterval(id);
  },[fetchLive]);

  const standings=buildStandings(SEED,results);
  const thirds=getBestThirds(standings);
  const slotMap=buildSlotMap(standings,thirds,results);
  const liveGames=results.filter(g=>g.status==="in_progress");
  const finalGames=[...results].filter(g=>g.status==="final").reverse();
  const scheduledGames=[...results.filter(g=>g.status==="scheduled")].sort((a,b)=>kickoffOrder(a.kickoff)-kickoffOrder(b.kickoff));
  const groupTeams=sortGroup(standings[activeGroup]||{});

  const TABS=[
    {id:"live",label:"⚡ Live"},{id:"groups",label:"📊 Groups"},
    {id:"scorers",label:"🥅 Scorers"},{id:"thirds",label:"🥉 Best 3rds"},
    {id:"r32",label:"Round of 32"},{id:"r16",label:"Round of 16"},
    {id:"qf",label:"Quarterfinals"},{id:"sf",label:"Semifinals"},{id:"final",label:"🏆 Final"},
  ];

  const liveIndicator={idle:"",fetching:"⟳",live:"🟢 Live",offline:"📡 Offline"};

  return(
    <div style={{minHeight:"100vh",background:C.bg,color:C.text,fontFamily:"'Inter','Segoe UI',sans-serif",display:"flex",flexDirection:"column"}}>
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} *{box-sizing:border-box}`}</style>

      {selectedTeam&&<CountryModal team={selectedTeam} onClose={()=>setSelectedTeam(null)} standings={standings} results={results}/>}

      {/* Header */}
      <div style={{background:"linear-gradient(180deg,#0d1428 0%,#060d1a 100%)",borderBottom:`1px solid ${C.border}`,padding:"18px 18px 0"}}>
        <div style={{maxWidth:820,margin:"0 auto"}}>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:8,marginBottom:14}}>
            <div style={{display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:30}}>⚽</span>
              <div>
                <div style={{fontSize:10,letterSpacing:3,color:C.blue,textTransform:"uppercase",fontWeight:700}}>FIFA · Live Tracker</div>
                <div style={{fontSize:19,fontWeight:800,color:"#fff"}}>World Cup 2026</div>
              </div>
            </div>
            <div style={{display:"flex",alignItems:"center",gap:8,flexWrap:"wrap"}}>
              {liveGames.length>0&&<div style={{display:"flex",alignItems:"center",gap:6,background:"#ff980018",border:"1px solid #ff980044",borderRadius:20,padding:"4px 10px"}}><span style={{width:6,height:6,borderRadius:"50%",background:C.orange,display:"inline-block",animation:"pulse 1s infinite"}}/><span style={{fontSize:11,fontWeight:700,color:C.orange}}>{liveGames.length} LIVE</span></div>}
              <span style={{fontSize:10,color:liveStatus==="live"?"#00e676":liveStatus==="offline"?C.orange:C.dim}}>{liveIndicator[liveStatus]}</span>
              {lastUpdated&&<span style={{fontSize:10,color:C.muted}}>Synced {lastUpdated}</span>}
              <button onClick={fetchSheet} disabled={loading} style={{padding:"5px 11px",borderRadius:20,border:`1px solid ${C.border}`,background:"transparent",color:loading?C.muted:C.dim,cursor:loading?"not-allowed":"pointer",fontSize:11,fontWeight:700}}>{loading?"…":"↻"}</button>
            </div>
          </div>
          <div style={{display:"flex",gap:5,overflowX:"auto",paddingBottom:12}}>
            {TABS.map(t=><Tab key={t.id} label={t.label} active={view===t.id} onClick={()=>setView(t.id)}/>)}
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{maxWidth:820,margin:"0 auto",padding:"20px 14px",flex:1,width:"100%"}}>
        {view==="live"&&<div>
          {finalGames.length>0&&<CollapsibleSection title="✅ Results" count={finalGames.length} defaultOpen={false} accent={C.green}>{finalGames.map((g,i)=><MatchRow key={i} {...g} compact onSelect={setSelectedTeam}/>)}</CollapsibleSection>}
          {liveGames.length>0&&<CollapsibleSection title="🔴 In Progress" count={liveGames.length} defaultOpen={true} accent={C.orange}>{liveGames.map((g,i)=><MatchRow key={i} {...g} onSelect={setSelectedTeam}/>)}</CollapsibleSection>}
          {scheduledGames.length>0&&<CollapsibleSection title="🕐 Upcoming" count={scheduledGames.length} defaultOpen={true} accent={C.blue}>{scheduledGames.map((g,i)=><MatchRow key={i} {...g} onSelect={setSelectedTeam}/>)}</CollapsibleSection>}
        </div>}

        {view==="groups"&&<div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
            {"ABCDEFGHIJKL".split("").map(g=><button key={g} onClick={()=>setActiveGroup(g)} style={{padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:activeGroup===g?C.blue:"#111827",color:activeGroup===g?"#fff":C.dim}}>{g}</button>)}
          </div>
          <StandingsTable teams={groupTeams} onSelect={setSelectedTeam}/>
          <div style={{marginTop:12}}>{results.filter(g=>g.group===activeGroup).map((g,i)=><MatchRow key={i} {...g} compact onSelect={setSelectedTeam}/>)}</div>
        </div>}

        {view==="scorers"&&<div>
          <div style={{background:"#f57f1710",border:"1px solid #f57f1730",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#ffb74d"}}>🥅 Golden Boot Race · Updated through Matchday 3 (A–F) · Tap flag to view team</div>
          <div style={{background:C.card,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
            <div style={{display:"grid",gridTemplateColumns:"28px 1fr 60px 50px 50px",padding:"8px 12px",background:"#0a1020",borderBottom:`1px solid ${C.border}`}}>
              {["#","Player","Team","Goals","HT"].map((h,i)=><div key={h} style={{fontSize:9,fontWeight:700,color:C.muted,textAlign:i>1?"center":"left",textTransform:"uppercase",letterSpacing:1}}>{h}</div>)}
            </div>
            {[...SCORERS].sort((a,b)=>b.goals-a.goals||b.hattricks-a.hattricks).map((s,idx)=>(
              <div key={s.name} style={{display:"grid",gridTemplateColumns:"28px 1fr 60px 50px 50px",padding:"11px 12px",alignItems:"center",borderBottom:idx<SCORERS.length-1?"1px solid #0d1428":"none",background:idx%2===0?C.card:"#0a1228"}}>
                <div style={{fontSize:11,color:idx===0?C.gold:C.muted,fontWeight:700}}>{idx+1}</div>
                <div style={{display:"flex",flexDirection:"column",gap:2}}><span style={{fontSize:13,fontWeight:600,color:idx<3?C.text:C.sub}}>{s.name}</span><span style={{fontSize:10,color:C.dim}}>{s.pos}</span></div>
                <div style={{textAlign:"center"}}><span onClick={()=>setSelectedTeam(s.team)} style={{fontSize:20,cursor:"pointer"}}>{fl(s.team)||"🏳"}</span></div>
                <div style={{textAlign:"center"}}><span style={{fontSize:16,fontWeight:800,color:idx===0?C.gold:idx<3?"#fff":C.text}}>{s.goals}</span></div>
                <div style={{textAlign:"center"}}>{s.hattricks>0?<span style={{fontSize:11,fontWeight:700,color:C.gold,background:C.gold+"22",borderRadius:4,padding:"2px 6px"}}>🎩×{s.hattricks}</span>:<span style={{fontSize:11,color:C.muted}}>–</span>}</div>
              </div>
            ))}
          </div>
          <div style={{fontSize:10,color:C.muted,textAlign:"center",marginTop:10}}>Tap a flag to view full team profile</div>
        </div>}

        {view==="thirds"&&<div>
          <div style={{background:"#f57f1710",border:"1px solid #f57f1730",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#ffb74d"}}>Top 8 of 12 third-place teams advance to the Round of 32.</div>
          <BestThirdsTable thirds={thirds} onSelect={setSelectedTeam}/>
        </div>}

        {view==="r32"&&<KnockoutGrid rounds={R32_FIXTURE} slotMap={slotMap} accent={C.blue} title="Round of 32" info="Jun 28 – Jul 3 · Qualifiers shown only after group stage completes · Pinch to zoom" onSelect={setSelectedTeam} pinchable={true}/>}
        {view==="r16"&&<KnockoutGrid rounds={R16_FIXTURE} slotMap={slotMap} accent={C.blue} title="Round of 16" info="Jul 4 – Jul 7" onSelect={setSelectedTeam} pinchable={true}/>}
        {view==="qf"&&<KnockoutGrid rounds={QF_FIXTURE} slotMap={slotMap} accent="#7c4dff" title="Quarterfinals" info="Jul 9 – Jul 11" onSelect={setSelectedTeam} pinchable={true}/>}
        {view==="sf"&&<div>
          <KnockoutGrid rounds={SF_FIXTURE} slotMap={slotMap} accent="#aa00ff" title="Semifinals" onSelect={setSelectedTeam} pinchable={true}/>
          <KnockoutGrid rounds={THIRD_FIXTURE} slotMap={slotMap} accent={C.gold} title="3rd Place Match" onSelect={setSelectedTeam}/>
        </div>}
        {view==="final"&&<div>
          <div style={{background:"#f57f1710",border:"1px solid #f57f1730",borderRadius:12,padding:"20px",marginBottom:20,textAlign:"center"}}>
            <div style={{fontSize:40,marginBottom:8}}>🏆</div>
            <div style={{fontSize:18,fontWeight:900,color:C.gold,letterSpacing:2}}>WORLD CUP FINAL</div>
            <div style={{fontSize:12,color:C.dim,marginTop:4}}>MetLife Stadium · East Rutherford, NJ · July 19 · 3:00 PM ET</div>
          </div>
          <KnockoutGrid rounds={FINAL_FIXTURE} slotMap={slotMap} accent={C.gold} title="The Final" onSelect={setSelectedTeam}/>
          <KnockoutGrid rounds={THIRD_FIXTURE} slotMap={slotMap} accent={C.gold} title="3rd Place Match · Jul 18" onSelect={setSelectedTeam}/>
          <div style={{background:C.card,borderRadius:12,border:`1px solid ${C.border}`,padding:"16px"}}>
            <div style={{fontSize:11,fontWeight:700,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:12}}>🏅 Honours</div>
            {[["🥇","Winner","TBD"],["🥈","Runner-up","TBD"],["🥉","3rd Place","TBD"],["👟","Golden Boot","TBD"],["⚽","Golden Ball","TBD"]].map(([icon,label,val])=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",padding:"8px 0",borderBottom:`1px solid ${C.border}`}}>
                <span style={{fontSize:13,color:C.sub}}>{icon} {label}</span>
                <span style={{fontSize:13,fontWeight:700,color:C.dim}}>{val}</span>
              </div>
            ))}
          </div>
        </div>}
      </div>

      <Footer/>
    </div>
  );
}
