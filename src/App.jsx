import { useState, useEffect, useCallback, useRef } from "react";
import { fetchLiveScores, fetchStoredResults, diffResults, mergeResults, buildScorerLeaderboard } from "./worldcup-live";

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
  {name:"Ismaila Sarr",          team:"Senegal",     goals:3, hattricks:0, pos:"FW"},
  {name:"Cristiano Ronaldo",     team:"Portugal",    goals:2, hattricks:0, pos:"FW"},
  {name:"Cyle Larin",            team:"Canada",      goals:2, hattricks:0, pos:"FW"},
  {name:"Ayase Ueda",            team:"Japan",       goals:2, hattricks:0, pos:"FW"},
  {name:"Daichi Kamada",         team:"Japan",       goals:2, hattricks:0, pos:"MF"},
  {name:"Kai Havertz",           team:"Germany",     goals:2, hattricks:0, pos:"FW"},
  {name:"Yasin Ayari",           team:"Sweden",      goals:2, hattricks:0, pos:"MF"},
  {name:"Maximiliano Araujo",    team:"Uruguay",     goals:2, hattricks:0, pos:"FW"},
  {name:"Jude Bellingham",       team:"England",     goals:2, hattricks:0, pos:"MF"},
  {name:"Ousmane Dembele",       team:"France",      goals:4, hattricks:1, pos:"FW"},
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
  {name:"Habib Diarra",            team:"Senegal",    goals:1, hattricks:0, pos:"MF"},
  {name:"Pape Gueye",             team:"Senegal",    goals:2, hattricks:0, pos:"MF"},
  {name:"Iliman Ndiaye",          team:"Senegal",    goals:1, hattricks:0, pos:"FW"},
  {name:"Thelo Aasgaard",         team:"Norway",     goals:1, hattricks:0, pos:"MF"},
  {name:"Desire Doue",            team:"France",     goals:1, hattricks:0, pos:"FW"},
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
    Senegal:     [{n:"Ismaila Sarr",p:"FW",goals:3,ht:0},{n:"Pape Gueye",p:"MF",goals:2,ht:0},{n:"Habib Diarra",p:"MF",goals:1,ht:0}],
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
// ── ROUND OF 32 — exact FIFA bracket (Match numbers from official bracket) ─
const R32_FIXTURE = [
  // ── LEFT SIDE of bracket ──
  {match:74,home:"Germany",      away:"Paraguay",             kickoff:"Jun 29 · 4:30 PM ET · Gillette Stadium, Boston"},
  {match:77,home:"France",       away:"Sweden",               kickoff:"Jun 30 · 5:00 PM ET · MetLife Stadium, NY/NJ"},
  {match:73,home:"South Africa", away:"Canada",               kickoff:"Jun 28 · 3:00 PM ET · SoFi Stadium, LA"},
  {match:75,home:"Netherlands",  away:"Morocco",              kickoff:"Jun 29 · 9:00 PM ET · Estadio BBVA, Monterrey"},
  {match:83,home:"2K",           away:"2L",                   kickoff:"Jul 2 · 7:00 PM ET · BMO Field, Toronto"},
  {match:84,home:"Spain",        away:"2J",                   kickoff:"Jul 2 · 3:00 PM ET · SoFi Stadium, LA"},
  {match:81,home:"USA",          away:"Bosnia and Herzegovina",kickoff:"Jul 1 · 8:00 PM ET · Levi's Stadium, San Francisco"},
  {match:82,home:"Belgium",      away:"3AEHIJ",               kickoff:"Jul 1 · 4:00 PM ET · Lumen Field, Seattle"},
  // ── RIGHT SIDE of bracket ──
  {match:76,home:"Brazil",       away:"Japan",                kickoff:"Jun 29 · 1:00 PM ET · NRG Stadium, Houston"},
  {match:78,home:"Ivory Coast",  away:"Norway",               kickoff:"Jun 30 · 1:00 PM ET · AT&T Stadium, Dallas"},
  {match:79,home:"Mexico",       away:"Ecuador",              kickoff:"Jun 30 · 9:00 PM ET · Estadio Azteca, Mexico City"},
  {match:80,home:"1L",           away:"Senegal",              kickoff:"Jul 1 · 12:00 PM ET · Mercedes-Benz Stadium, Atlanta"},
  {match:86,home:"Argentina",    away:"Cape Verde",           kickoff:"Jul 3 · 6:00 PM ET · Hard Rock Stadium, Miami"},
  {match:88,home:"Australia",    away:"Egypt",                kickoff:"Jul 3 · 2:00 PM ET · AT&T Stadium, Dallas"},
  {match:85,home:"Switzerland",  away:"3EFGIJ",               kickoff:"Jul 2 · 11:00 PM ET · BC Place, Vancouver"},
  {match:87,home:"1K",           away:"Croatia",              kickoff:"Jul 3 · 9:30 PM ET · Arrowhead Stadium, Kansas City"},
];
const R16_FIXTURE=[
  {match:89,home:"W74",away:"W77",kickoff:"Jul 4 · 5:00 PM ET · Gillette Stadium, Boston"},
  {match:90,home:"W73",away:"W75",kickoff:"Jul 4 · 1:00 PM ET · SoFi Stadium, LA"},
  {match:91,home:"W76",away:"W78",kickoff:"Jul 5 · 4:00 PM ET · NRG Stadium, Houston"},
  {match:92,home:"W79",away:"W80",kickoff:"Jul 5 · 8:00 PM ET · MetLife Stadium, NY/NJ"},
  {match:93,home:"W83",away:"W84",kickoff:"Jul 6 · 3:00 PM ET · SoFi Stadium, LA"},
  {match:94,home:"W81",away:"W82",kickoff:"Jul 6 · 8:00 PM ET · Lumen Field, Seattle"},
  {match:95,home:"W86",away:"W88",kickoff:"Jul 7 · 12:00 PM ET · Hard Rock Stadium, Miami"},
  {match:96,home:"W85",away:"W87",kickoff:"Jul 7 · 4:00 PM ET · BC Place, Vancouver"},
];
const QF_FIXTURE=[
  {match:97,home:"W89",away:"W90",kickoff:"Jul 9 · 4:00 PM ET · Gillette Stadium, Boston"},
  {match:98,home:"W93",away:"W94",kickoff:"Jul 10 · 3:00 PM ET · Lumen Field, Seattle"},
  {match:99,home:"W91",away:"W92",kickoff:"Jul 11 · 5:00 PM ET · NRG Stadium, Houston"},
  {match:100,home:"W95",away:"W96",kickoff:"Jul 11 · 9:00 PM ET · AT&T Stadium, Dallas"},
];
const SF_FIXTURE=[
  {match:101,home:"W97",away:"W98",kickoff:"Jul 14 · 3:00 PM ET · MetLife Stadium, NY/NJ"},
  {match:102,home:"W99",away:"W100",kickoff:"Jul 15 · 3:00 PM ET · SoFi Stadium, LA"},
];
const THIRD_FIXTURE=[{match:103,home:"L101",away:"L102",kickoff:"Jul 18 · 5:00 PM ET · AT&T Stadium, Dallas"}];
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
  // If slot is already a real team name (not a code like "1A","2B","3XYZ","WNN","LNN")
  if(slot && !/^[123WL]\w/.test(slot)) return{label:slot,team:slot,confirmed:true};
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
  const [scale,setScale]=useState(1);

  // Use refs for gesture state to avoid stale closures
  const g=useRef({
    scale:1, tx:0, ty:0,
    pinching:false, panning:false,
    initDist:0, initScale:1,
    initMidX:0, initMidY:0,
    initTx:0, initTy:0,
    startX:0, startY:0,
    lastTx:0, lastTy:0,
  });

  const applyTransform=(sc,tx,ty)=>{
    if(!contentRef.current) return;
    contentRef.current.style.transform=`translate(${tx}px,${ty}px) scale(${sc})`;
  };

  const clampPan=(sc,tx,ty)=>{
    const el=containerRef.current;
    const ct=contentRef.current;
    if(!el||!ct) return {tx,ty};
    const cW=el.offsetWidth;
    const cH=el.offsetHeight;
    const scaledW=ct.scrollWidth*sc;
    const scaledH=ct.scrollHeight*sc;
    const maxTx=0;
    const minTx=Math.min(0,cW-scaledW);
    const maxTy=0;
    const minTy=Math.min(0,cH-scaledH);
    return{
      tx:Math.min(maxTx,Math.max(minTx,tx)),
      ty:Math.min(maxTy,Math.max(minTy,ty)),
    };
  };

  useEffect(()=>{
    const el=containerRef.current;
    if(!el) return;

    const getTouchDist=(t1,t2)=>Math.hypot(t2.clientX-t1.clientX,t2.clientY-t1.clientY);
    const getTouchMid=(t1,t2,rect)=>({
      x:(t1.clientX+t2.clientX)/2-rect.left,
      y:(t1.clientY+t2.clientY)/2-rect.top,
    });

    const onTouchStart=(e)=>{
      const s=g.current;
      if(e.touches.length===2){
        // Always prevent default for 2-finger to block browser zoom
        e.preventDefault();
        s.pinching=true;
        s.panning=false;
        s.initDist=getTouchDist(e.touches[0],e.touches[1]);
        s.initScale=s.scale;
        s.initTx=s.tx;
        s.initTy=s.ty;
        const rect=el.getBoundingClientRect();
        const m=getTouchMid(e.touches[0],e.touches[1],rect);
        s.initMidX=m.x;
        s.initMidY=m.y;
      } else if(e.touches.length===1 && s.scale>1.05){
        // Only intercept single-touch when zoomed in
        e.preventDefault();
        s.panning=true;
        s.pinching=false;
        s.startX=e.touches[0].clientX;
        s.startY=e.touches[0].clientY;
        s.lastTx=s.tx;
        s.lastTy=s.ty;
      }
    };

    const onTouchMove=(e)=>{
      const s=g.current;
      if(s.pinching && e.touches.length===2){
        e.preventDefault();
        const newDist=getTouchDist(e.touches[0],e.touches[1]);
        const ratio=newDist/s.initDist;
        const newScale=Math.min(Math.max(s.initScale*ratio,0.8),4);
        // Scale around the initial pinch midpoint
        const scaleFactor=newScale/s.initScale;
        const newTx=s.initMidX-(s.initMidX-s.initTx)*scaleFactor;
        const newTy=s.initMidY-(s.initMidY-s.initTy)*scaleFactor;
        const clamped=clampPan(newScale,newTx,newTy);
        s.scale=newScale; s.tx=clamped.tx; s.ty=clamped.ty;
        applyTransform(s.scale,s.tx,s.ty);
        setScale(newScale);
      } else if(s.panning && e.touches.length===1){
        e.preventDefault();
        const dx=e.touches[0].clientX-s.startX;
        const dy=e.touches[0].clientY-s.startY;
        const clamped=clampPan(s.scale,s.lastTx+dx,s.lastTy+dy);
        s.tx=clamped.tx; s.ty=clamped.ty;
        applyTransform(s.scale,s.tx,s.ty);
      }
    };

    const onTouchEnd=(e)=>{
      const s=g.current;
      if(e.touches.length<2) s.pinching=false;
      if(e.touches.length===0) s.panning=false;
    };

    // Must use {passive:false} to be able to call preventDefault
    el.addEventListener("touchstart",onTouchStart,{passive:false});
    el.addEventListener("touchmove",onTouchMove,{passive:false});
    el.addEventListener("touchend",onTouchEnd,{passive:true});
    return()=>{
      el.removeEventListener("touchstart",onTouchStart);
      el.removeEventListener("touchmove",onTouchMove);
      el.removeEventListener("touchend",onTouchEnd);
    };
  },[]);

  const doZoom=(delta)=>{
    const s=g.current;
    const el=containerRef.current;
    if(!el) return;
    const newScale=Math.min(Math.max(s.scale+delta,0.8),4);
    // Zoom toward center of container
    const cx=el.offsetWidth/2;
    const cy=el.offsetHeight/2;
    const scaleFactor=newScale/s.scale;
    const newTx=cx-(cx-s.tx)*scaleFactor;
    const newTy=cy-(cy-s.ty)*scaleFactor;
    const clamped=clampPan(newScale,newTx,newTy);
    s.scale=newScale; s.tx=clamped.tx; s.ty=clamped.ty;
    applyTransform(s.scale,s.tx,s.ty);
    setScale(newScale);
    // Update touchAction so scroll works at scale=1
    if(containerRef.current) {
      containerRef.current.style.touchAction = newScale > 1.05 ? "none" : "pan-y";
    }
  };

  const doReset=()=>{
    const s=g.current;
    s.scale=1; s.tx=0; s.ty=0;
    applyTransform(1,0,0);
    setScale(1);
    // Restore page scroll by resetting touchAction
    if(containerRef.current) containerRef.current.style.touchAction="pan-y";
  };

  const btnStyle=(disabled)=>({
    width:36,height:36,borderRadius:8,border:`1px solid ${disabled?"#1e2a3a":C.border}`,
    background:disabled?"#0a1020":"rgba(15,21,32,0.95)",
    color:disabled?C.muted:C.text,cursor:disabled?"default":"pointer",
    fontSize:18,fontWeight:700,display:"flex",alignItems:"center",justifyContent:"center",
    boxShadow:"0 2px 8px #00000044",transition:"all 0.15s",
  });

  return(
    <div style={{position:"relative"}}>
      {/* Zoom control buttons — always visible */}
      <div style={{position:"absolute",top:8,right:8,zIndex:20,display:"flex",flexDirection:"column",gap:5}}>
        <button onClick={()=>doZoom(0.4)} style={btnStyle(scale>=4)} title="Zoom in">＋</button>
        <button onClick={()=>doZoom(-0.4)} style={btnStyle(scale<=0.8)} title="Zoom out">－</button>
        <button onClick={doReset} style={{...btnStyle(scale===1),fontSize:13,color:scale!==1?C.gold:C.muted}} title="Reset">↺</button>
      </div>
      {/* Zoom level indicator */}
      {scale!==1&&<div style={{position:"absolute",top:8,left:8,zIndex:20,background:"rgba(10,16,32,0.9)",border:`1px solid ${C.border}`,borderRadius:6,padding:"3px 8px",fontSize:10,color:C.gold,fontWeight:700}}>
        {Math.round(scale*100)}%
      </div>}
      <div ref={containerRef}
        style={{overflow:"hidden",touchAction:scale>1.05?"none":"pan-y",userSelect:"none",WebkitUserSelect:"none",cursor:scale>1?"grab":"default"}}>
        <div ref={contentRef}
          style={{transformOrigin:"0 0",willChange:"transform",display:"inline-block",minWidth:"100%"}}>
          {children}
        </div>
      </div>
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

function MatchRow({home,away,hg,ag,status,kickoff,prob_home,prob_away,compact,onSelect,onMatchClick,clock=""}){
  const played=hg!==null&&ag!==null,live=status==="in_progress",fin=status==="final";
  const hWin=played&&hg>ag,aWin=played&&ag>hg;
  const clickable=fin||live;
  return(
    <div onClick={clickable&&onMatchClick?()=>onMatchClick({home,away,hg,ag,status,kickoff,clock}):undefined}
      style={{background:C.card,borderRadius:10,padding:compact?"10px 14px":"14px 18px",marginBottom:7,
        border:`1px solid ${live?"#ff980055":fin&&onMatchClick?"#3d5afe44":C.border}`,
        boxShadow:live?"0 0 12px #ff980018":"none",
        cursor:clickable&&onMatchClick?"pointer":"default"}}>
      {kickoff&&<div style={{fontSize:10,color:fin?C.muted:C.gold,fontWeight:700,marginBottom:6,display:"flex",alignItems:"center",justifyContent:"space-between"}}>
        <span>🕐 {kickoff}</span>
        {clickable&&onMatchClick&&<span style={{fontSize:9,color:C.blue}}>tap for details ›</span>}
      </div>}
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

// Extract date portion from kickoff string e.g. "Jun 29 · 4:30 PM ET · ..." → "Jun 29"
function kickoffDate(kickoff){
  if(!kickoff) return "TBD";
  const m=kickoff.match(/^([A-Za-z]+ \d+)/);
  return m?m[1]:"TBD";
}
function kickoffTime(kickoff){
  if(!kickoff) return "";
  const m=kickoff.match(/(\d+:\d+ [AP]M ET)/);
  return m?m[1]:"";
}
function kickoffVenue(kickoff){
  if(!kickoff) return "";
  // Everything after the second ·
  const parts=kickoff.split(" · ");
  return parts.length>=3?parts.slice(2).join(" · "):"";
}

// Sort key for kickoff — converts "Jun 28 · 3:00 PM ET" to comparable number
function kickoffSortKey(kickoff){
  if(!kickoff) return 9999;
  const months={Jan:1,Feb:2,Mar:3,Apr:4,May:5,Jun:6,Jul:7,Aug:8,Sep:9,Oct:10,Nov:11,Dec:12};
  const dm=kickoff.match(/([A-Za-z]+) (\d+)/);
  const tm=kickoff.match(/(\d+):(\d+) ([AP]M)/);
  if(!dm) return 9999;
  const day=parseInt(dm[2]);
  const mon=months[dm[1]]||0;
  let hour=tm?parseInt(tm[1]):0;
  const min=tm?parseInt(tm[2]):0;
  if(tm&&tm[3]==="PM"&&hour!==12) hour+=12;
  if(tm&&tm[3]==="AM"&&hour===12) hour=0;
  return mon*10000+day*100+hour+min/100;
}

function KnockoutGrid({rounds,slotMap,accent=C.blue,title,info,onSelect,pinchable}){
  // Sort all matches by date+time
  const sorted=[...rounds].sort((a,b)=>kickoffSortKey(a.kickoff)-kickoffSortKey(b.kickoff));

  // Group by date
  const byDate={};
  for(const r of sorted){
    const d=kickoffDate(r.kickoff);
    if(!byDate[d]) byDate[d]=[];
    byDate[d].push(r);
  }
  const dates=Object.keys(byDate);

  const content=(
    <div style={{marginBottom:20}}>
      {title&&<div style={{display:"flex",alignItems:"center",gap:10,marginBottom:10}}>
        <div style={{width:3,height:18,background:accent,borderRadius:2}}/>
        <span style={{fontSize:12,fontWeight:800,color:C.text,letterSpacing:1}}>{title}</span>
      </div>}
      {info&&<div style={{background:"#1a237e18",border:`1px solid ${C.border}`,borderRadius:10,padding:"9px 13px",marginBottom:12,fontSize:12,color:C.sub}}>{info}</div>}
      <div style={{display:"flex",flexDirection:"column",gap:14}}>
        {dates.map(date=>(
          <CollapsibleSection key={date} title={`📅 ${date}`} count={byDate[date].length} defaultOpen={true} accent={accent}>
            <div style={{display:"flex",flexDirection:"column",gap:8,paddingTop:4}}>
              {byDate[date].map(r=>{
                const homeRes=resolveSlot(r.home,slotMap),awayRes=resolveSlot(r.away,slotMap);
                const time=kickoffTime(r.kickoff);
                const venue=kickoffVenue(r.kickoff);
                return(
                  <div key={r.match} style={{background:"#0a1020",borderRadius:12,border:`1px solid ${C.border}`,overflow:"hidden"}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,padding:"8px 14px 0",flexWrap:"wrap"}}>
                      <span style={{fontSize:9,fontWeight:700,color:accent,background:accent+"18",borderRadius:4,padding:"2px 7px"}}>#{r.match}</span>
                      {time&&<span style={{fontSize:10,fontWeight:700,color:C.gold}}>🕐 {time}</span>}
                      {venue&&<span style={{fontSize:10,color:C.muted}}>📍 {venue}</span>}
                    </div>
                    <div style={{display:"flex",alignItems:"center",padding:"9px 14px 10px",gap:8}}>
                      <TeamSlot res={homeRes} align="right" onSelect={onSelect}/>
                      <div style={{minWidth:36,textAlign:"center",fontSize:10,fontWeight:700,color:C.muted,borderLeft:`1px solid ${C.border}`,borderRight:`1px solid ${C.border}`,padding:"4px 6px"}}>vs</div>
                      <TeamSlot res={awayRes} align="left" onSelect={onSelect}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </CollapsibleSection>
        ))}
      </div>
    </div>
  );
  return pinchable ? <PinchZoom>{content}</PinchZoom> : content;
}

// ── STATIC MATCH DETAILS (venue, scorers, cards) ────────────────────────
// Key: "Home|Away"
const MATCH_DETAILS = {
  "Mexico|South Africa":{venue:"SoFi Stadium",location:"Inglewood, CA",scorers:[{name:"Alexis Vega",team:"home",min:34},{name:"Julian Quinones",team:"home",min:67}],cards:[],ft:"90+2"},
  "Korea Republic|Czechia":{venue:"Levi's Stadium",location:"Santa Clara, CA",scorers:[{name:"Hwang In-Beom",team:"home",min:12},{name:"Oh Hyeon-Gyu",team:"home",min:77},{name:"Ladislav Krejci",team:"away",min:55}],cards:[{name:"Tomas Soucek",team:"away",min:44,type:"Y"}],ft:"90"},
  "Mexico|Korea Republic":{venue:"Estadio Azteca",location:"Mexico City, MEX",scorers:[{name:"Julian Quinones",team:"home",min:58}],cards:[{name:"Hwang In-Beom",team:"away",min:72,type:"Y"}],ft:"90"},
  "Czechia|South Africa":{venue:"AT&T Stadium",location:"Arlington, TX",scorers:[{name:"Ladislav Krejci",team:"home",min:41},{name:"Teboho Mokoena",team:"away",min:88,extra:"pen"}],cards:[],ft:"90+4"},
  "Czechia|Mexico":{venue:"Estadio Azteca",location:"Mexico City, MEX",scorers:[{name:"Mateo Chavez",team:"away",min:53},{name:"Julian Quinones",team:"away",min:74},{name:"Alvaro Fidalgo",team:"away",min:90,extra:"+3"}],cards:[{name:"Ladislav Krejci",team:"home",min:61,type:"Y"}],ft:"90+3"},
  "South Africa|Korea Republic":{venue:"SoFi Stadium",location:"Inglewood, CA",scorers:[{name:"Thapelo Maseko",team:"home",min:83}],cards:[{name:"Son Heung-min",team:"away",min:45,type:"Y"},{name:"Bong-jin Kim",team:"away",min:88,type:"Y"}],ft:"90+5"},
  "Canada|Bosnia and Herzegovina":{venue:"BMO Field",location:"Toronto, CAN",scorers:[{name:"Jonathan David",team:"home",min:45,extra:"pen"},{name:"Jovo Lukic",team:"away",min:67}],cards:[],ft:"90+1"},
  "Switzerland|Qatar":{venue:"BC Place",location:"Vancouver, CAN",scorers:[{name:"Breel Embolo",team:"home",min:22,extra:"pen"},{name:"Boualem Khoukhi",team:"away",min:55}],cards:[],ft:"90"},
  "Canada|Qatar":{venue:"Arrowhead Stadium",location:"Kansas City, MO",scorers:[{name:"Jonathan David",team:"home",min:8},{name:"Cyle Larin",team:"home",min:23},{name:"Jonathan David",team:"home",min:34,extra:"HT"},{name:"Cyle Larin",team:"home",min:60},{name:"Jonathan David",team:"home",min:71},{name:"Canada OG",team:"home",min:80}],cards:[],ft:"90"},
  "Switzerland|Bosnia and Herzegovina":{venue:"Gillette Stadium",location:"Foxborough, MA",scorers:[{name:"Johan Manzambi",team:"home",min:74},{name:"Johan Manzambi",team:"home",min:89},{name:"Granit Xhaka",team:"home",min:90,extra:"+1"}],cards:[{name:"Jovo Lukic",team:"away",min:76,type:"R"}],ft:"90+2"},
  "Switzerland|Canada":{venue:"BC Place",location:"Vancouver, CAN",scorers:[{name:"Granit Xhaka",team:"home",min:38},{name:"Johan Manzambi",team:"home",min:62},{name:"Cyle Larin",team:"away",min:80}],cards:[],ft:"90"},
  "Bosnia and Herzegovina|Qatar":{venue:"BMO Field",location:"Toronto, CAN",scorers:[{name:"Jovo Lukic",team:"home",min:11},{name:"Edin Dzeko",team:"home",min:45},{name:"Miralem Pjanic",team:"home",min:72},{name:"Boualem Khoukhi",team:"away",min:50}],cards:[],ft:"90"},
  "Brazil|Haiti":{venue:"Hard Rock Stadium",location:"Miami, FL",scorers:[{name:"Matheus Cunha",team:"home",min:18},{name:"Vinicius Jr",team:"home",min:41},{name:"Matheus Cunha",team:"home",min:56}],cards:[],ft:"90"},
  "Morocco|Scotland":{venue:"Mercedes-Benz Stadium",location:"Atlanta, GA",scorers:[{name:"Ismael Saibari",team:"home",min:2}],cards:[{name:"John McGinn",team:"away",min:55,type:"Y"}],ft:"90"},
  "Brazil|Morocco":{venue:"NRG Stadium",location:"Houston, TX",scorers:[{name:"Vinicius Jr",team:"home",min:33},{name:"Ismael Saibari",team:"away",min:51,extra:"pen"}],cards:[],ft:"90+2"},
  "Scotland|Haiti":{venue:"Lumen Field",location:"Seattle, WA",scorers:[{name:"John McGinn",team:"home",min:29}],cards:[{name:"Duckens Nazon",team:"away",min:70,type:"Y"}],ft:"90"},
  "Scotland|Brazil":{venue:"Hard Rock Stadium",location:"Miami, FL",scorers:[{name:"Vinicius Jr",team:"away",min:14},{name:"Vinicius Jr",team:"away",min:44},{name:"Matheus Cunha",team:"away",min:58}],cards:[{name:"Andy Robertson",team:"home",min:67,type:"Y"}],ft:"90"},
  "Morocco|Haiti":{venue:"Mercedes-Benz Stadium",location:"Atlanta, GA",scorers:[{name:"Ismael Saibari",team:"home",min:2},{name:"Achraf Hakimi",team:"home",min:45},{name:"Ismael Saibari",team:"home",min:90,extra:"+1"},{name:"Gessime Yassine",team:"home",min:89},{name:"Wilson Isidor",team:"away",min:31},{name:"Wilson Isidor",team:"away",min:58}],cards:[],ft:"90+2"},
  "USA|Paraguay":{venue:"AT&T Stadium",location:"Arlington, TX",scorers:[{name:"Folarin Balogun",team:"home",min:7},{name:"Folarin Balogun",team:"home",min:23},{name:"Sebastian Berhalter",team:"home",min:62},{name:"Christian Pulisic",team:"home",min:78},{name:"Mauricio",team:"away",min:45},{name:"Galarza",team:"away",min:80}],cards:[],ft:"90"},
  "Australia|Turkiye":{venue:"Levi's Stadium",location:"Santa Clara, CA",scorers:[{name:"Nestory Irankunda",team:"home",min:55},{name:"Connor Metcalfe",team:"home",min:79}],cards:[{name:"Hakan Calhanoglu",team:"away",min:44,type:"Y"}],ft:"90+1"},
  "USA|Australia":{venue:"SoFi Stadium",location:"Inglewood, CA",scorers:[{name:"Auston Trusty",team:"home",min:3},{name:"Sebastian Berhalter",team:"home",min:49}],cards:[],ft:"90"},
  "Turkiye|Paraguay":{venue:"NRG Stadium",location:"Houston, TX",scorers:[{name:"Mauricio",team:"away",min:61}],cards:[{name:"Arda Guler",team:"home",min:40,type:"Y"}],ft:"90"},
  "Turkiye|USA":{venue:"SoFi Stadium",location:"Inglewood, CA",scorers:[{name:"Arda Guler",team:"home",min:10},{name:"Burak Yilmaz",team:"home",min:31},{name:"Kaan Ayhan",team:"home",min:90,extra:"+8"},{name:"Auston Trusty",team:"away",min:3},{name:"Sebastian Berhalter",team:"away",min:49}],cards:[{name:"Kaan Ayhan",team:"home",min:45,type:"Y"}],ft:"90+8"},
  "Paraguay|Australia":{venue:"AT&T Stadium",location:"Arlington, TX",scorers:[],cards:[{name:"Mauricio",team:"home",min:55,type:"Y"},{name:"Connor Metcalfe",team:"away",min:72,type:"Y"}],ft:"90"},
  "Germany|Curacao":{venue:"Arrowhead Stadium",location:"Kansas City, MO",scorers:[{name:"Leroy Sane",team:"home",min:2},{name:"Kai Havertz",team:"home",min:45,extra:"pen"},{name:"Deniz Undav",team:"home",min:56},{name:"Felix Nmecha",team:"home",min:64},{name:"Nathaniel Brown",team:"home",min:78},{name:"Jamal Musialia",team:"home",min:82},{name:"Deniz Undav",team:"home",min:88},{name:"Livano Comenencia",team:"away",min:51}],cards:[],ft:"90"},
  "Ivory Coast|Ecuador":{venue:"Gillette Stadium",location:"Foxborough, MA",scorers:[{name:"Amad Diallo",team:"home",min:34}],cards:[{name:"Moises Caicedo",team:"away",min:55,type:"Y"}],ft:"90"},
  "Germany|Ivory Coast":{venue:"Levi's Stadium",location:"Santa Clara, CA",scorers:[{name:"Deniz Undav",team:"home",min:15},{name:"Kai Havertz",team:"home",min:71},{name:"Amad Diallo",team:"away",min:58}],cards:[],ft:"90+2"},
  "Ecuador|Curacao":{venue:"Arrowhead Stadium",location:"Kansas City, MO",scorers:[],cards:[{name:"Armando Obispo",team:"away",min:33,type:"Y"}],ft:"90"},
  "Ecuador|Germany":{venue:"MetLife Stadium",location:"East Rutherford, NJ",scorers:[{name:"Leroy Sane",team:"away",min:2},{name:"Nilson Angulo",team:"home",min:9},{name:"Gonzalo Plata",team:"home",min:77}],cards:[{name:"Gonzalo Plata",team:"home",min:79,type:"Y"}],ft:"90+4"},
  "Curacao|Ivory Coast":{venue:"BMO Field",location:"Toronto, CAN",scorers:[{name:"Nicolas Pepe",team:"away",min:7},{name:"Nicolas Pepe",team:"away",min:64}],cards:[],ft:"90"},
  "Netherlands|Japan":{venue:"Lumen Field",location:"Seattle, WA",scorers:[{name:"Cody Gakpo",team:"home",min:22},{name:"Crysencio Summerville",team:"home",min:55},{name:"Daichi Kamada",team:"away",min:31},{name:"Ayase Ueda",team:"away",min:67}],cards:[],ft:"90"},
  "Sweden|Tunisia":{venue:"Mercedes-Benz Stadium",location:"Atlanta, GA",scorers:[{name:"Alexander Isak",team:"home",min:8},{name:"Yasin Ayari",team:"home",min:28},{name:"Alexander Isak",team:"home",min:45},{name:"Yasin Ayari",team:"home",min:63},{name:"Viktor Gyokeres",team:"home",min:80},{name:"Omar Rekik",team:"away",min:55}],cards:[],ft:"90"},
  "Netherlands|Sweden":{venue:"NRG Stadium",location:"Houston, TX",scorers:[{name:"Brian Brobbey",team:"home",min:12},{name:"Cody Gakpo",team:"home",min:45},{name:"Crysencio Summerville",team:"home",min:60},{name:"Brian Brobbey",team:"home",min:73},{name:"Brian Brobbey",team:"home",min:85},{name:"Alexander Isak",team:"away",min:38}],cards:[],ft:"90"},
  "Japan|Tunisia":{venue:"Hard Rock Stadium",location:"Miami, FL",scorers:[{name:"Daichi Kamada",team:"home",min:4},{name:"Keito Nakamura",team:"home",min:21},{name:"Ayase Ueda",team:"home",min:52},{name:"Ayase Ueda",team:"home",min:78}],cards:[],ft:"90"},
  "Tunisia|Netherlands":{venue:"BC Place",location:"Vancouver, CAN",scorers:[{name:"Skhiri",team:"home",min:3,extra:"OG"},{name:"Brian Brobbey",team:"away",min:7},{name:"Jordi van Hecke",team:"away",min:62},{name:"Virgil van Dijk",team:"away",min:80},{name:"Hassem Mastouri",team:"home",min:54}],cards:[{name:"Omar Rekik",team:"home",min:65,type:"Y"}],ft:"90"},
  "Japan|Sweden":{venue:"Gillette Stadium",location:"Foxborough, MA",scorers:[{name:"Daizen Maeda",team:"home",min:56},{name:"Anthony Elanga",team:"away",min:62}],cards:[],ft:"90"},
  "Belgium|Egypt":{venue:"Estadio BBVA",location:"Monterrey, MEX",scorers:[{name:"Romelu Lukaku",team:"home",min:44},{name:"Eman Ashour",team:"away",min:71}],cards:[],ft:"90"},
  "Iran|New Zealand":{venue:"SoFi Stadium",location:"Inglewood, CA",scorers:[{name:"Mehdi Taremi",team:"home",min:33},{name:"Mohamed Mohebi",team:"home",min:70},{name:"Elijah Just",team:"away",min:45},{name:"Chris Wood",team:"away",min:82}],cards:[],ft:"90+3"},
  "Belgium|Iran":{venue:"Levi's Stadium",location:"Santa Clara, CA",scorers:[],cards:[{name:"Mehdi Taremi",team:"away",min:55,type:"Y"}],ft:"90"},
  "Egypt|New Zealand":{venue:"Arrowhead Stadium",location:"Kansas City, MO",scorers:[{name:"Mohamed Salah",team:"home",min:18},{name:"Eman Ashour",team:"home",min:44},{name:"Mostafa Mohamed",team:"home",min:67},{name:"Elijah Just",team:"away",min:72}],cards:[],ft:"90"},
  "Spain|Cape Verde":{venue:"MetLife Stadium",location:"East Rutherford, NJ",scorers:[],cards:[{name:"Ryan Mendes",team:"away",min:38,type:"Y"}],ft:"90"},
  "Saudi Arabia|Uruguay":{venue:"Hard Rock Stadium",location:"Miami, FL",scorers:[{name:"Abdulelah Al Amri",team:"home",min:55},{name:"Maximiliano Araujo",team:"away",min:33}],cards:[],ft:"90+2"},
  "Spain|Saudi Arabia":{venue:"Lumen Field",location:"Seattle, WA",scorers:[{name:"Mikel Oyarzabal",team:"home",min:11},{name:"Lamine Yamal",team:"home",min:34},{name:"Mikel Oyarzabal",team:"home",min:67},{name:"Lamine Yamal",team:"home",min:81}],cards:[],ft:"90"},
  "Uruguay|Cape Verde":{venue:"BC Place",location:"Vancouver, CAN",scorers:[{name:"Maximiliano Araujo",team:"home",min:28},{name:"Darwin Nunez",team:"home",min:59},{name:"Darwin Nunez",team:"away",min:44,extra:"OG"},{name:"Cape Verde OG",team:"home",min:71}],cards:[],ft:"90+1"},
  "France|Senegal":{venue:"AT&T Stadium",location:"Arlington, TX",scorers:[{name:"Kylian Mbappe",team:"home",min:15},{name:"Ousmane Dembele",team:"home",min:45},{name:"Kylian Mbappe",team:"home",min:71},{name:"Ismaila Sarr",team:"away",min:38}],cards:[],ft:"90"},
  "Norway|Iraq":{venue:"Gillette Stadium",location:"Foxborough, MA",scorers:[{name:"Erling Haaland",team:"home",min:8},{name:"Erling Haaland",team:"home",min:34},{name:"Leo Ostigard",team:"home",min:67},{name:"Martin Odegaard",team:"home",min:85},{name:"Ayman Hussein",team:"away",min:55}],cards:[],ft:"90"},
  "France|Iraq":{venue:"Mercedes-Benz Stadium",location:"Atlanta, GA",scorers:[{name:"Kylian Mbappe",team:"home",min:22},{name:"Michael Olise",team:"home",min:45},{name:"Ousmane Dembele",team:"home",min:78}],cards:[],ft:"90"},
  "Norway|Senegal":{venue:"NRG Stadium",location:"Houston, TX",scorers:[{name:"Erling Haaland",team:"home",min:11},{name:"Erling Haaland",team:"home",min:56},{name:"Martin Baturina",team:"home",min:80},{name:"Ismaila Sarr",team:"away",min:33},{name:"Ibrahim Mbaye",team:"away",min:71}],cards:[],ft:"90+2"},
  "Argentina|Algeria":{venue:"SoFi Stadium",location:"Inglewood, CA",scorers:[{name:"Lionel Messi",team:"home",min:14},{name:"Lautaro Martinez",team:"home",min:44},{name:"Julian Alvarez",team:"home",min:78}],cards:[],ft:"90"},
  "Jordan|Austria":{venue:"Hard Rock Stadium",location:"Miami, FL",scorers:[{name:"Nizar Al-Rashdan",team:"home",min:22},{name:"Marcel Sabitzer",team:"away",min:33},{name:"Christoph Baumgartner",team:"away",min:61},{name:"Marko Arnautovic",team:"away",min:88}],cards:[],ft:"90+1"},
  "Argentina|Austria":{venue:"MetLife Stadium",location:"East Rutherford, NJ",scorers:[{name:"Lionel Messi",team:"home",min:33},{name:"Lionel Messi",team:"home",min:55,extra:"hat"},{name:"Lionel Messi",team:"home",min:78}],cards:[{name:"Romano Schmid",team:"away",min:44,type:"Y"}],ft:"90"},
  "Algeria|Jordan":{venue:"Levi's Stadium",location:"Santa Clara, CA",scorers:[{name:"Riyad Mahrez",team:"home",min:28},{name:"Islam Slimani",team:"home",min:67},{name:"Ali Iyad Olwan",team:"away",min:55}],cards:[],ft:"90"},
  "Colombia|Uzbekistan":{venue:"Arrowhead Stadium",location:"Kansas City, MO",scorers:[{name:"Luis Diaz",team:"home",min:12},{name:"James Rodriguez",team:"home",min:44},{name:"Luis Diaz",team:"home",min:71},{name:"Eldor Shomurodov",team:"away",min:55}],cards:[],ft:"90"},
  "Portugal|Congo DR":{venue:"BMO Field",location:"Toronto, CAN",scorers:[{name:"Cristiano Ronaldo",team:"home",min:44,extra:"pen"},{name:"Yoane Wissa",team:"away",min:67}],cards:[],ft:"90+2"},
  "Colombia|Congo DR":{venue:"BC Place",location:"Vancouver, CAN",scorers:[{name:"James Rodriguez",team:"home",min:55}],cards:[{name:"Yoane Wissa",team:"away",min:44,type:"Y"}],ft:"90"},
  "Portugal|Uzbekistan":{venue:"NRG Stadium",location:"Houston, TX",scorers:[{name:"Cristiano Ronaldo",team:"home",min:8},{name:"Joao Cancelo",team:"home",min:22},{name:"Bruno Fernandes",team:"home",min:44},{name:"Joao Neves",team:"home",min:61},{name:"Rafael Leao",team:"home",min:78}],cards:[],ft:"90"},
  "England|Croatia":{venue:"AT&T Stadium",location:"Arlington, TX",scorers:[{name:"Harry Kane",team:"home",min:11},{name:"Jude Bellingham",team:"home",min:34},{name:"Harry Kane",team:"home",min:66},{name:"Phil Foden",team:"home",min:85},{name:"Martin Baturina",team:"away",min:44},{name:"Petar Musa",team:"away",min:71}],cards:[],ft:"90"},
  "Ghana|Panama":{venue:"Estadio BBVA",location:"Monterrey, MEX",scorers:[{name:"Jordan Ayew",team:"home",min:55}],cards:[{name:"Adalberto Carrasquilla",team:"away",min:67,type:"Y"}],ft:"90"},
  "England|Ghana":{venue:"Mercedes-Benz Stadium",location:"Atlanta, GA",scorers:[],cards:[{name:"Thomas Partey",team:"away",min:44,type:"Y"}],ft:"90"},
  "Panama|Croatia":{venue:"Lumen Field",location:"Seattle, WA",scorers:[{name:"Martin Baturina",team:"away",min:67}],cards:[],ft:"90"},
  // ── Jun 26 MD3 ──
  "Norway|France":{venue:"Gillette Stadium",location:"Foxborough, MA",scorers:[
    {name:"Ousmane Dembele",team:"away",min:8},{name:"Ousmane Dembele",team:"away",min:22,extra:"hat"},
    {name:"Thelo Aasgaard",team:"home",min:24},{name:"Ousmane Dembele",team:"away",min:32,extra:"hat"},
    {name:"Desire Doue",team:"away",min:89}
  ],cards:[{name:"Thelo Aasgaard",team:"home",min:67,type:"Y"}],ft:"90+2"},
  // ── Jun 26 MD3 night matches ──
  "New Zealand|Belgium":{venue:"BC Place",location:"Vancouver, CAN",scorers:[
    {name:"Elijah Just",team:"home",min:84},{name:"Leandro Trossard",team:"away",min:23,extra:"pen"},{name:"Leandro Trossard",team:"away",min:52},
    {name:"Kevin De Bruyne",team:"away",min:66},{name:"Romelu Lukaku",team:"away",min:86},{name:"Alexis Saelemaekers",team:"away",min:90}
  ],cards:[{name:"Finn Surman",team:"home",min:23,type:"Y"}],ft:"90+3"},
  "Belgium|New Zealand":{venue:"BC Place",location:"Vancouver, CAN",scorers:[
    {name:"Leandro Trossard",team:"home",min:23,extra:"pen"},{name:"Leandro Trossard",team:"home",min:52},
    {name:"Kevin De Bruyne",team:"home",min:66},{name:"Romelu Lukaku",team:"home",min:86},
    {name:"Alexis Saelemaekers",team:"home",min:90},{name:"Elijah Just",team:"away",min:84}
  ],cards:[{name:"Finn Surman",team:"away",min:23,type:"Y"}],ft:"90+3"},
  "Egypt|Iran":{venue:"Lumen Field",location:"Seattle, WA",scorers:[
    {name:"Mahmoud Saber",team:"home",min:5},{name:"Ramin Rezaeian",team:"away",min:14}
  ],cards:[{name:"Mehdi Taremi",team:"away",min:55,extra:"pen missed"}],ft:"90+6"},
  "Cape Verde|Saudi Arabia":{venue:"NRG Stadium",location:"Houston, TX",scorers:[],cards:[],ft:"90+4"},
  "Uruguay|Spain":{venue:"Estadio Akron",location:"Guadalajara, MEX",scorers:[
    {name:"Alex Baena",team:"away",min:8}
  ],cards:[{name:"Rodrigo Bentancur",team:"home",min:45,type:"Y"}],ft:"90+5"},
  "Senegal|Iraq":{venue:"BMO Field",location:"Toronto, CAN",scorers:[
    {name:"Habib Diarra",team:"home",min:4},{name:"Ismaila Sarr",team:"home",min:56},
    {name:"Pape Gueye",team:"home",min:61},{name:"Pape Gueye",team:"home",min:69},
    {name:"Iliman Ndiaye",team:"home",min:82}
  ],cards:[{name:"Rebin Sulaka",team:"away",min:13,type:"R"}],ft:"90+4"},
};

// ── MATCH DETAIL MODAL ───────────────────────────────────────────────────
function MatchDetailModal({match, onClose}){
  if(!match) return null;
  const key1=`${match.home}|${match.away}`;
  const key2=`${match.away}|${match.home}`;
  // Try live scorers first, then static
  const liveScorers = match.scorers||[];
  const liveCards = match.cards||[];
  const detail = MATCH_DETAILS[key1] || MATCH_DETAILS[key2] || {};
  const isFlipped = !MATCH_DETAILS[key1] && !!MATCH_DETAILS[key2];
  const scorers = liveScorers.length ? liveScorers : (detail.scorers||[]);
  const cards = liveCards.length ? liveCards : (detail.cards||[]);
  const venue = match.venue || detail.venue || "";
  const location = match.venueLocation || detail.location || "";
  const ft = detail.ft || "90";
  const fin = match.status==="final";
  const live = match.status==="in_progress";

  // Group scorers by team
  const homeScorers = scorers.filter(s=> isFlipped ? s.team==="away" : s.team==="home");
  const awayScorers = scorers.filter(s=> isFlipped ? s.team==="home" : s.team==="away");
  const homeCards = cards.filter(s=> isFlipped ? s.team==="away" : s.team==="home");
  const awayCards = cards.filter(s=> isFlipped ? s.team==="home" : s.team==="away");

  const cardIcon = t => t==="R"?"🟥":t==="Y2"?"🟨🟥":"🟨";

  return(
    <div onClick={onClose} style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.88)",zIndex:1001,display:"flex",alignItems:"center",justifyContent:"center",padding:16,overflowY:"auto"}}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#0a1020",border:`1px solid ${C.border}`,borderRadius:16,width:"100%",maxWidth:500,maxHeight:"92vh",overflowY:"auto",padding:20}}>
        {/* Header */}
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:2,textTransform:"uppercase"}}>Match Details</div>
          <button onClick={onClose} style={{background:"rgba(255,255,255,0.08)",border:`1px solid ${C.border}`,color:C.sub,borderRadius:8,width:32,height:32,cursor:"pointer",fontSize:18}}>✕</button>
        </div>

        {/* Scoreboard */}
        <div style={{background:"#060d1a",borderRadius:12,padding:"16px 12px",marginBottom:14,textAlign:"center",border:`1px solid ${C.border}`}}>
          <div style={{fontSize:10,color:fin?C.green:live?C.orange:C.gold,fontWeight:700,letterSpacing:2,marginBottom:10}}>
            {fin?`⏱ FT · ${ft}'`:live?`● LIVE ${match.clock||""}`:match.kickoff||""}
          </div>
          <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:8}}>
            <div style={{flex:1,textAlign:"right"}}>
              <div style={{fontSize:26}}>{fl(match.home)||"🏳"}</div>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginTop:4}}>{match.home}</div>
              <RankBadge name={match.home} style={{display:"inline-block",marginTop:4}}/>
            </div>
            <div style={{minWidth:80,textAlign:"center"}}>
              {match.hg!==null?
                <div style={{fontSize:36,fontWeight:900,color:"#fff",letterSpacing:4}}>{match.hg}<span style={{color:C.muted,fontSize:24}}>–</span>{match.ag}</div>
                :<div style={{fontSize:20,fontWeight:700,color:C.muted}}>vs</div>}
            </div>
            <div style={{flex:1,textAlign:"left"}}>
              <div style={{fontSize:26}}>{fl(match.away)||"🏳"}</div>
              <div style={{fontSize:14,fontWeight:700,color:C.text,marginTop:4}}>{match.away}</div>
              <RankBadge name={match.away} style={{display:"inline-block",marginTop:4}}/>
            </div>
          </div>
        </div>

        {/* Venue */}
        {(venue||location)&&<div style={{display:"flex",alignItems:"center",gap:8,background:C.card,borderRadius:10,padding:"10px 14px",marginBottom:14,border:`1px solid ${C.border}`}}>
          <span style={{fontSize:16}}>🏟️</span>
          <div>
            {venue&&<div style={{fontSize:13,fontWeight:600,color:C.text}}>{venue}</div>}
            {location&&<div style={{fontSize:11,color:C.dim}}>{location}</div>}
          </div>
        </div>}

        {/* Scorers */}
        {scorers.length>0&&<div style={{marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>⚽ Goals</div>
          <div style={{background:C.card,borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`}}>
            {scorers.map((s,i)=>{
              const isHome = isFlipped ? s.team==="away" : s.team==="home";
              const teamName = isHome ? match.home : match.away;
              return(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:isHome?"flex-start":"flex-end",
                  padding:"9px 14px",borderBottom:i<scorers.length-1?`1px solid #0d1428`:"none",
                  background:i%2===0?C.card:"#0a1228"}}>
                  {isHome&&<><span style={{fontSize:16,marginRight:8}}>{fl(teamName)||"⚽"}</span>
                    <span style={{fontSize:12,fontWeight:600,color:C.text}}>{s.name||s.player}</span>
                    {s.extra==="OG"&&<span style={{fontSize:10,color:C.red,marginLeft:6,background:C.red+"22",padding:"1px 5px",borderRadius:4}}>OG</span>}
                    {(s.extra==="pen"||s.type==="Penalty - Scored")&&<span style={{fontSize:10,color:C.blue,marginLeft:6,background:C.blue+"22",padding:"1px 5px",borderRadius:4}}>pen</span>}
                    {s.extra==="hat"&&<span style={{fontSize:10,color:C.gold,marginLeft:6}}>🎩</span>}
                    <span style={{marginLeft:"auto",fontSize:11,fontWeight:700,color:C.gold}}>{s.min||s.clock}&apos;</span>
                  </>}
                  {!isHome&&<><span style={{marginRight:"auto",fontSize:11,fontWeight:700,color:C.gold}}>{s.min||s.clock}&apos;</span>
                    {s.extra==="OG"&&<span style={{fontSize:10,color:C.red,marginRight:6,background:C.red+"22",padding:"1px 5px",borderRadius:4}}>OG</span>}
                    {(s.extra==="pen"||s.type==="Penalty - Scored")&&<span style={{fontSize:10,color:C.blue,marginRight:6,background:C.blue+"22",padding:"1px 5px",borderRadius:4}}>pen</span>}
                    {s.extra==="hat"&&<span style={{fontSize:10,color:C.gold,marginRight:6}}>🎩</span>}
                    <span style={{fontSize:12,fontWeight:600,color:C.text}}>{s.name||s.player}</span>
                    <span style={{fontSize:16,marginLeft:8}}>{fl(teamName)||"⚽"}</span>
                  </>}
                </div>
              );
            })}
          </div>
        </div>}

        {/* Cards */}
        {cards.length>0&&<div style={{marginBottom:14}}>
          <div style={{fontSize:10,fontWeight:700,color:C.muted,letterSpacing:2,textTransform:"uppercase",marginBottom:8}}>🟨 Bookings</div>
          <div style={{background:C.card,borderRadius:10,overflow:"hidden",border:`1px solid ${C.border}`}}>
            {cards.map((c,i)=>{
              const isHome = isFlipped ? c.team==="away" : c.team==="home";
              const teamName = isHome ? match.home : match.away;
              return(
                <div key={i} style={{display:"flex",alignItems:"center",justifyContent:isHome?"flex-start":"flex-end",
                  padding:"8px 14px",borderBottom:i<cards.length-1?`1px solid #0d1428`:"none"}}>
                  {isHome&&<><span style={{fontSize:16,marginRight:8}}>{fl(teamName)||"🏳"}</span>
                    <span style={{fontSize:12,color:C.text}}>{c.name||c.player}</span>
                    <span style={{marginLeft:8}}>{cardIcon(c.type)}</span>
                    <span style={{marginLeft:"auto",fontSize:11,color:C.muted}}>{c.min||c.clock}&apos;</span>
                  </>}
                  {!isHome&&<><span style={{marginRight:"auto",fontSize:11,color:C.muted}}>{c.min||c.clock}&apos;</span>
                    <span style={{marginRight:8}}>{cardIcon(c.type)}</span>
                    <span style={{fontSize:12,color:C.text}}>{c.name||c.player}</span>
                    <span style={{fontSize:16,marginLeft:8}}>{fl(teamName)||"🏳"}</span>
                  </>}
                </div>
              );
            })}
          </div>
        </div>}

        {/* No events */}
        {fin&&scorers.length===0&&cards.length===0&&<div style={{textAlign:"center",padding:"20px",color:C.muted,fontSize:12}}>No goals or cards recorded</div>}
        {!fin&&!live&&<div style={{textAlign:"center",padding:"16px",color:C.muted,fontSize:12}}>Match details will appear here once kicked off</div>}
      </div>
    </div>
  );
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
  {group:"I",home:"Norway",away:"France",hg:1,ag:4,status:"final",kickoff:"Jun 26 · 3:00 PM ET"},
  {group:"I",home:"Senegal",away:"Iraq",hg:5,ag:0,status:"final",kickoff:"Jun 26 · 3:00 PM ET"},
  {group:"H",home:"Uruguay",away:"Spain",hg:0,ag:1,status:"final",kickoff:"Jun 26 · 8:00 PM ET",prob_home:14.3,prob_away:64.1},
  {group:"H",home:"Cape Verde",away:"Saudi Arabia",hg:0,ag:0,status:"final",kickoff:"Jun 26 · 8:00 PM ET",prob_home:36.7,prob_away:34.7},
  {group:"G",home:"Egypt",away:"Iran",hg:1,ag:1,status:"final",kickoff:"Jun 26 · 11:00 PM ET"},
  {group:"G",home:"New Zealand",away:"Belgium",hg:1,ag:5,status:"final",kickoff:"Jun 26 · 11:00 PM ET"},
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
  const[kvMatches,setKvMatches]=useState([]);
  const[kvScorers,setKvScorers]=useState([]);
  const[selectedMatch,setSelectedMatch]=useState(null);
  const[liveStatus,setLiveStatus]=useState("idle"); // idle | fetching | live | offline
  const prevResultsRef=useRef(null);

  // ── SYNC: fetch KV stored results + live ESPN feed ───────────────────────
  const fetchLive=useCallback(async()=>{
    setLiveStatus("fetching");
    try{
      // Run both in parallel
      const [stored, liveData] = await Promise.allSettled([
        fetchStoredResults(),
        fetchLiveScores(),
      ]);

      const kv = stored.status==="fulfilled" ? stored.value : null;
      const live = liveData.status==="fulfilled" ? liveData.value : null;

      // Update KV scorers if we got them
      if(kv?.scorers?.length){
        setKvScorers(kv.scorers);
      }
      const kvM = kv?.matches||[];
      if(kvM.length) setKvMatches(kvM);

      const merged = mergeResults(DEMO_RESULTS, kvM, live);
      if(diffResults(prevResultsRef.current, merged)){
        prevResultsRef.current=merged;
        setResults(merged);
        setLastUpdated(new Date().toLocaleTimeString("en-CA",{hour:"2-digit",minute:"2-digit",timeZoneName:"short"}));
      }
      setLiveStatus(live?"live":"offline");
    }catch{
      setLiveStatus("offline");
    }
  },[]);



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
      <style>{`@keyframes pulse{0%,100%{opacity:1}50%{opacity:0.3}} @keyframes spin{to{transform:rotate(360deg)}} *{box-sizing:border-box}`}</style>

      {selectedTeam&&<CountryModal team={selectedTeam} onClose={()=>setSelectedTeam(null)} standings={standings} results={results}/>}
      {selectedMatch&&<MatchDetailModal match={selectedMatch} onClose={()=>setSelectedMatch(null)}/>}

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
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                <span style={{fontSize:10,color:liveStatus==="live"?"#00e676":liveStatus==="fetching"?"#ffb74d":liveStatus==="offline"?C.orange:C.dim,fontWeight:700}}>
                  {liveStatus==="live"?"🟢 Live":liveStatus==="fetching"?"⟳ Syncing…":liveStatus==="offline"?"📡 Offline":""}
                </span>
                {lastUpdated&&<span style={{fontSize:10,color:C.muted}}>Synced {lastUpdated}</span>}
              </div>
              <button onClick={fetchLive} disabled={liveStatus==="fetching"}
                style={{display:"flex",alignItems:"center",gap:5,padding:"6px 13px",borderRadius:20,
                  border:`1px solid ${liveStatus==="fetching"?C.muted:C.blue}`,
                  background:liveStatus==="fetching"?"transparent":"rgba(59,130,246,0.12)",
                  color:liveStatus==="fetching"?C.muted:C.blue,
                  cursor:liveStatus==="fetching"?"not-allowed":"pointer",
                  fontSize:11,fontWeight:700,transition:"all 0.2s"}}>
                <span style={{display:"inline-block",animation:liveStatus==="fetching"?"spin 1s linear infinite":"none"}}>↻</span>
                {liveStatus==="fetching"?"Syncing…":"Sync Live"}
              </button>
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
          {finalGames.length>0&&<CollapsibleSection title="✅ Results" count={finalGames.length} defaultOpen={false} accent={C.green}>{finalGames.map((g,i)=><MatchRow key={i} {...g} compact onSelect={setSelectedTeam} onMatchClick={setSelectedMatch}/>)}</CollapsibleSection>}
          {liveGames.length>0&&<CollapsibleSection title="🔴 In Progress" count={liveGames.length} defaultOpen={true} accent={C.orange}>{liveGames.map((g,i)=><MatchRow key={i} {...g} onSelect={setSelectedTeam} onMatchClick={setSelectedMatch}/>)}</CollapsibleSection>}
          {scheduledGames.length>0&&<CollapsibleSection title="🕐 Upcoming" count={scheduledGames.length} defaultOpen={true} accent={C.blue}>{scheduledGames.map((g,i)=><MatchRow key={i} {...g} onSelect={setSelectedTeam}/>)}</CollapsibleSection>}
        </div>}

        {view==="groups"&&<div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginBottom:14}}>
            {"ABCDEFGHIJKL".split("").map(g=><button key={g} onClick={()=>setActiveGroup(g)} style={{padding:"6px 12px",borderRadius:8,border:"none",cursor:"pointer",fontWeight:700,fontSize:13,background:activeGroup===g?C.blue:"#111827",color:activeGroup===g?"#fff":C.dim}}>{g}</button>)}
          </div>
          <StandingsTable teams={groupTeams} onSelect={setSelectedTeam}/>
          <div style={{marginTop:12}}>{results.filter(g=>g.group===activeGroup).map((g,i)=><MatchRow key={i} {...g} compact onSelect={setSelectedTeam} onMatchClick={setSelectedMatch}/>)}</div>
        </div>}

        {view==="scorers"&&(()=>{
          // Use live KV scorers if available, else fall back to static SCORERS
          const scorerList = kvScorers.length>0
            ? buildScorerLeaderboard(kvScorers)
            : [...SCORERS].sort((a,b)=>b.goals-a.goals||b.hattricks-a.hattricks);
          const isLive = kvScorers.length>0;
          return(
          <div>
            <div style={{background:"#f57f1710",border:"1px solid #f57f1730",borderRadius:10,padding:"10px 14px",marginBottom:14,fontSize:12,color:"#ffb74d",display:"flex",alignItems:"center",justifyContent:"space-between"}}>
              <span>🥅 Golden Boot Race · {scorerList.length} players · Tap flag to view team</span>
              <span style={{fontSize:10,color:isLive?"#00e676":C.muted,fontWeight:700}}>{isLive?"● Live from KV":"● Static"}</span>
            </div>
            <div style={{background:C.card,borderRadius:12,overflow:"hidden",border:`1px solid ${C.border}`}}>
              <div style={{display:"grid",gridTemplateColumns:"28px 1fr 60px 50px 50px",padding:"8px 12px",background:"#0a1020",borderBottom:`1px solid ${C.border}`}}>
                {["#","Player","Team","Goals","HT"].map((h,i)=><div key={h} style={{fontSize:9,fontWeight:700,color:C.muted,textAlign:i>1?"center":"left",textTransform:"uppercase",letterSpacing:1}}>{h}</div>)}
              </div>
              {scorerList.map((s,idx)=>(
                <div key={s.name+idx} style={{display:"grid",gridTemplateColumns:"28px 1fr 60px 50px 50px",padding:"11px 12px",alignItems:"center",borderBottom:idx<scorerList.length-1?"1px solid #0d1428":"none",background:idx%2===0?C.card:"#0a1228"}}>
                  <div style={{fontSize:11,color:idx===0?C.gold:C.muted,fontWeight:700}}>{idx+1}</div>
                  <div style={{display:"flex",flexDirection:"column",gap:2}}>
                    <span style={{fontSize:13,fontWeight:600,color:idx<3?C.text:C.sub}}>{s.name}</span>
                    <span style={{fontSize:10,color:C.dim}}>{s.pens>0?`${s.pens} pen`:""}{s.ogs>0?` ${s.ogs} og`:""}{!s.pens&&!s.ogs?"FW":""}</span>
                  </div>
                  <div style={{textAlign:"center"}}><span onClick={()=>setSelectedTeam(s.team)} style={{fontSize:20,cursor:"pointer"}}>{fl(s.team)||"🏳"}</span></div>
                  <div style={{textAlign:"center"}}><span style={{fontSize:16,fontWeight:800,color:idx===0?C.gold:idx<3?"#fff":C.text}}>{s.total||s.goals}</span></div>
                  <div style={{textAlign:"center"}}>{(s.hattricks>0||(s.goals||0)>=3)?<span style={{fontSize:11,fontWeight:700,color:C.gold,background:C.gold+"22",borderRadius:4,padding:"2px 6px"}}>🎩</span>:<span style={{fontSize:11,color:C.muted}}>–</span>}</div>
                </div>
              ))}
            </div>
            <div style={{fontSize:10,color:C.muted,textAlign:"center",marginTop:10}}>Tap a flag to view full team profile · Data sourced from ESPN via Vercel KV</div>
          </div>
          );
        })()}

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
