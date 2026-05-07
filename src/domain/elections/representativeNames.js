// Representative name generation for the Khmer Empire
// Provides culturally appropriate names based on province demographics

import { generateSeatDetails } from './chambers/jurisdictionLabels'
import { SEAT_OFFSETS } from './constants/seatOffsets'

// Traditional Khmer given names
const KHMER_GIVEN_NAMES = {
  male: [
    'Sokha', 'Vannak', 'Dara', 'Rithy', 'Chhaya', 'Sopheap', 'Sambath', 'Kosal',
    'Sopheak', 'Makara', 'Vuthy', 'Narith', 'Ponlok', 'Sarath', 'Chenda', 'Ratha',
    'Visal', 'Sophal', 'Khemara', 'Buntha', 'Sovan', 'Vireak', 'Sothy', 'Chantha',
    'Sokun', 'Vuth', 'Thy', 'Sambath', 'Nhem', 'Chan', 'Khim', 'San', 'Khem',
    'Ros', 'Em', 'Thach', 'Soeng', 'Heng', 'Tang', 'Chin', 'Long', 'Chea',
    'Eang', 'Ngov', 'Chao', 'Moul', 'Khiev', 'Suan', 'Pho', 'Lao', 'Chhun',
    'Toch', 'Thai', 'Cheam', 'Sem', 'Ou', 'Thong', 'Pov', 'Seang', 'Oem',
    'Ngoun', 'Tes', 'Lay', 'Chak', 'Hong', 'Mom', 'Saem', 'Khon', 'Him',
    'Nhor', 'Samnang', 'Pheap', 'Thea', 'Srun', 'Kuoy', 'Kang', 'Soth',
    'Soun', 'Yin', 'Suy', 'Von', 'Koeun', 'Dam', 'Hin', 'Duong', 'Pang',
    'Phuong', 'Kruy', 'Ny', 'Vann', 'Sary', 'Say', 'Teav', 'Sum', 'Un',
    'Taing', 'Khy', 'Keo', 'Liv', 'Rin', 'Sou', 'Nget', 'Pich', 'Sai',
    'Ry', 'Nuon', 'Sith', 'Cheat', 'Ngoy', 'Ya', 'Duch', 'Phally', 'Pheak',
    'Roat', 'Ken', 'Vutha', 'Phat', 'Soeun', 'Chhay', 'Trang', 'Heang',
    'Chhuor', 'Chong', 'Khuon', 'Yan', 'Lach', 'Lun', 'Kuch', 'Thorn',
    'Noup', 'Phon', 'Nim', 'Run', 'Prum', 'Bien', 'Khan', 'Huon', 'Touch',
    'Kranh', 'Hak', 'Doeun', 'Tat', 'Morn', 'Tuot', 'Sean', 'Son', 'Hoy',
    'Huot', 'Hun', 'Thom', 'Kouch', 'Moeuk', 'Uy', 'Ran', 'Puth', 'Yam',
    'Yoeurn', 'Bo', 'Chork', 'Orm', 'Te', 'Noeurng', 'Nem', 'Nhim', 'Lak',
    'Soy', 'Lon', 'Saroeun', 'Khlaing', 'Dim', 'Sang', 'Phoung', 'Sat',
    'Nam', 'Thoeun', 'Saom', 'Kheang', 'Ret', 'Phe', 'Leng', 'Khann',
    'Yann', 'Chhem', 'Nop', 'Khorn', 'Neath', 'Thet', 'Thai', 'Sum',
    'Pring', 'Nup', 'Sambor', 'Moan', 'Khoeun', 'Khuo', 'Theang', 'Sin',
    'Khov', 'Khoem', 'Sao', 'Romam', 'Phin', 'Muoy', 'Sot', 'Klaut',
    'Chuon', 'Reang', 'Suon', 'Khean', 'Khla', 'Kin', 'Khem', 'Mao',
    'Choeurn', 'Hout', 'Tith', 'Tieng', 'Khieng', 'Khieu', 'Van', 'Lorn',
    'Khlot', 'Leang', 'Chhuot', 'Luon', 'Sokhom', 'Ong', 'Nol', 'Song',
    'Um', 'Che', 'Ngoy', 'Nun', 'Long', 'Nhep', 'Oeur', 'Kak', 'Thol',
    'Yoeu', 'Phem', 'Kong', 'Phoak', 'Nou', 'Mo', 'Yi', 'Chamroeun',
    'Nu', 'Chi', 'Chan', 'Thorn', 'Phorn', 'Seum', 'Ouk', 'Ngov', 'Siang',
    'Kunthea', 'Somal', 'Sophen', 'Sopheap'
  ],
  female: [
    'Sopheap', 'Bopha', 'Srey', 'Chhaya', 'Sopheap', 'Sambath', 'Kosal',
    'Sopheak', 'Makara', 'Vuthy', 'Chenda', 'Ratha', 'Visal', 'Sophal',
    'Khemara', 'Buntha', 'Sovan', 'Vireak', 'Sothy', 'Chantha', 'Sokun',
    'Bopha', 'Srey', 'Dara', 'Rithy', 'Chan', 'Khim', 'San', 'Khem', 'Ros',
    'Em', 'Thach', 'Soeng', 'Heng', 'Tang', 'Chin', 'Long', 'Chea', 'Eang',
    'Ngov', 'Chao', 'Moul', 'Khiev', 'Suan', 'Pho', 'Lao', 'Chhun', 'Toch',
    'Thai', 'Cheam', 'Sem', 'Ou', 'Thong', 'Pov', 'Seang', 'Oem', 'Ngoun',
    'Tes', 'Lay', 'Chak', 'Hong', 'Mom', 'Saem', 'Khon', 'Him', 'Nhor',
    'Samnang', 'Pheap', 'Thea', 'Srun', 'Kuoy', 'Kang', 'Soth', 'Soun',
    'Yin', 'Suy', 'Von', 'Koeun', 'Dam', 'Hin', 'Duong', 'Pang', 'Phuong',
    'Kruy', 'Ny', 'Vann', 'Sary', 'Say', 'Teav', 'Sum', 'Un', 'Taing',
    'Khy', 'Keo', 'Liv', 'Rin', 'Sou', 'Nget', 'Pich', 'Sai', 'Ry', 'Nuon',
    'Sith', 'Cheat', 'Ngoy', 'Ya', 'Duch', 'Phally', 'Pheak', 'Roat', 'Ken',
    'Vutha', 'Phat', 'Soeun', 'Chhay', 'Trang', 'Heang', 'Chhuor', 'Chong',
    'Khuon', 'Yan', 'Lach', 'Lun', 'Kuch', 'Thorn', 'Noup', 'Phon', 'Nim',
    'Run', 'Prum', 'Bien', 'Khan', 'Huon', 'Touch', 'Kranh', 'Hak', 'Doeun',
    'Tat', 'Morn', 'Tuot', 'Sean', 'Son', 'Hoy', 'Huot', 'Hun', 'Thom',
    'Kouch', 'Moeuk', 'Uy', 'Ran', 'Puth', 'Yam', 'Yoeurn', 'Bo', 'Chork',
    'Orm', 'Te', 'Noeurng', 'Nem', 'Nhim', 'Lak', 'Soy', 'Lon', 'Saroeun',
    'Khlaing', 'Dim', 'Sang', 'Phoung', 'Sat', 'Nam', 'Thoeun', 'Saom',
    'Kheang', 'Ret', 'Phe', 'Leng', 'Khann', 'Yann', 'Chhem', 'Nop', 'Khorn',
    'Neath', 'Thet', 'Thai', 'Sum', 'Pring', 'Nup', 'Sambor', 'Moan', 'Khoeun',
    'Khuo', 'Theang', 'Sin', 'Khov', 'Khoem', 'Sao', 'Romam', 'Phin', 'Muoy',
    'Sot', 'Klaut', 'Chuon', 'Reang', 'Suon', 'Khean', 'Khla', 'Kin', 'Khem',
    'Mao', 'Choeurn', 'Hout', 'Tith', 'Tieng', 'Khieng', 'Khieu', 'Van', 'Lorn',
    'Khlot', 'Leang', 'Chhuot', 'Luon', 'Sokhom', 'Ong', 'Nol', 'Song', 'Um',
    'Che', 'Ngoy', 'Nun', 'Long', 'Nhep', 'Oeur', 'Kak', 'Thol', 'Yoeu', 'Phem',
    'Kong', 'Phoak', 'Nou', 'Mo', 'Yi', 'Chamroeun', 'Nu', 'Chi', 'Chan',
    'Thorn', 'Phorn', 'Seum', 'Ouk', 'Ngov', 'Siang', 'Kunthea', 'Somal',
    'Sophen', 'Sopheap'
  ]
}

// Spanish given names (reflecting Spanish globalization influence)
const SPANISH_GIVEN_NAMES = {
  male: [
    'Carlos', 'Jose', 'Antonio', 'Manuel', 'Francisco', 'Juan', 'Pedro', 'Miguel',
    'Rafael', 'Fernando', 'Luis', 'Javier', 'Diego', 'Eduardo', 'Ricardo',
    'Santiago', 'Alejandro', 'Gabriel', 'Andres', 'Roberto', 'Daniel', 'Pablo',
    'Enrique', 'Jorge', 'Mario', 'Sergio', 'Alfonso', 'Adrián', 'Victor',
    'Hugo', 'Ivan', 'Marcos', 'Raul', 'Salvador', 'Julio', 'Alfredo', 'Esteban',
    'Guillermo', 'Ignacio', 'Cesar', 'Martin', 'Tomas', 'Felipe', 'Emilio',
    'Agustin', 'Gonzalo', 'Lucas', 'Domingo', 'Ismael', 'Matias', 'Nicolas',
    'Elias', 'Samuel', 'Leonardo', 'Marco', 'Anton', 'Cristian', 'Joel',
    'Kevin', 'Aaron', 'Brayan', 'Dylan', 'Erick', 'Jairo', 'Lorenzo', 'Orlando',
    'Rodrigo', 'Wilson', 'Yair', 'Zacarias', 'Anibal', 'Boris', 'Ciro',
    'Dario', 'Efrain', 'Fidel', 'Gustavo', 'Hernan', 'Isaias', 'Jonas',
    'Karel', 'Leonel', 'Maximiliano', 'Norberto', 'Octavio', 'Patricio',
    'Ramiro', 'Silvio', 'Tadeo', 'Ulises', 'Valentin', 'Walter', 'Xavier',
    'Yeray', 'Zuriel', 'Adan', 'Bruno', 'Claudio', 'Dante', 'Elian'
  ],
  female: [
    'Maria', 'Carmen', 'Ana', 'Isabel', 'Laura', 'Patricia', 'Elena', 'Sofia',
    'Lucia', 'Martina', 'Paula', 'Valentina', 'Carmela', 'Rosa', 'Dolores',
    'Cristina', 'Mercedes', 'Julia', 'Angela', 'Marta', 'Alba', 'Emilia',
    'Aurora', 'Victoria', 'Clara', 'Natalia', 'Eva', 'Noelia', 'Irene',
    'Monica', 'Ariadna', 'Esther', 'Raquel', 'Paloma', 'Ines', 'Rocio',
    'Celia', 'Alicia', 'Beatriz', 'Carolina', 'Diana', 'Elisa', 'Fernanda',
    'Gloria', 'Helena', 'Jimena', 'Karina', 'Lorena', 'Marina', 'Nerea',
    'Olga', 'Penelope', 'Reina', 'Salome', 'Tamara', 'Ursula', 'Veronica',
    'Wanda', 'Ximena', 'Yolanda', 'Zaira', 'Adela', 'Brisa', 'Camila',
    'Daniela', 'Ema', 'Florencia', 'Graciela', 'Haydee', 'Ivana', 'Jazmin',
    'Katia', 'Leticia', 'Milagros', 'Nadia', 'Octavia', 'Priscila', 'Querida',
    'Ramona', 'Sandra', 'Tatiana', 'Una', 'Vanesa', 'Wendy', 'Xenia',
    'Yamila', 'Zulema', 'Amalia', 'Bella', 'Consuelo', 'Drusila', 'Eugenia'
  ]
}

// Maori given names (reflecting Maori/Polynesian globalization influence)
const MAORI_GIVEN_NAMES = {
  male: [
    'Tane', 'Wiremu', 'Rangi', 'Maui', 'Tama', 'Koro', 'Hemi', 'Mani',
    'Ropata', 'Kahurangi', 'Tamati', 'Rawiri', 'Hohepa', 'Kahale', 'Mikaere',
    'Nikora', 'Anaru', 'Eruera', 'Hahona', 'Ihaia', 'Kahui', 'Manawa',
    'Ngaio', 'Omeka', 'Paikea', 'Raharuhi', 'Tawhiri', 'Uenuku', 'Vaka',
    'Whetu', 'Ariki', 'Benaiah', 'Caleb', 'Darcy', 'Enoka', 'Faolan',
    'Haami', 'Ieremia', 'Jonty', 'Kauri', 'Lani', 'Manaia', 'Niko',
    'Orpheus', 'Pango', 'Rere', 'Sione', 'Tui', 'Ulric', 'Viliami',
    'Whiro', 'Aperahama', 'Benjamin', 'Conrad', 'Dean', 'Eli', 'Finn',
    'George', 'Hunter', 'Isaac', 'Jacob', 'Kyle', 'Liam', 'Mason',
    'Noah', 'Oliver', 'Parker', 'Quinn', 'Ryan', 'Samuel', 'Thomas',
    'Uriah', 'Vincent', 'William', 'Xander', 'Yuri', 'Zane', 'Arlo',
    'Beckham', 'Cooper', 'Dallas', 'Ezekiel', 'Felix', 'Grayson', 'Hudson',
    'Indiana', 'Jasper', 'Kingsley', 'Lennox', 'Maddox', 'Nash', 'Oscar',
    'Phoenix', 'Roman', 'Silas', 'Theo', 'Usher', 'Vance', 'Walker'
  ],
  female: [
    'Aroha', 'Mere', 'Anahera', 'Kiri', 'Ruiha', 'Tia', 'Maia', 'Hine',
    'Kahurangi', 'Aria', 'Riana', 'Tawake', 'Waiata', 'Ngaire', 'Moana',
    'Hinemoa', 'Katarina', 'Awhina', 'Kahui', 'Manaia', 'Kowhai', 'Tui',
    'Kahikatea', 'Aimee', 'Breeze', 'Crystal', 'Dawn', 'Eden', 'Faith',
    'Grace', 'Hope', 'Ivy', 'Jade', 'Kiara', 'Lily', 'Meadow', 'Nova',
    'Ocean', 'Piper', 'Queenie', 'Rose', 'Skye', 'Talia', 'Unity',
    'Violet', 'Willow', 'Xanthe', 'Yasmine', 'Zara', 'Amara', 'Briar',
    'Coral', 'Dahlia', 'Elara', 'Fern', 'Gemma', 'Haven', 'Iris',
    'Jasmine', 'Kaia', 'Luna', 'Mila', 'Nala', 'Opal', 'Pearl',
    'Quilla', 'Ruby', 'Sage', 'Tara', 'Ula', 'Vega', 'Wren', 'Xena',
    'Yara', 'Zelda', 'Ayla', 'Belle', 'Clementine', 'Daisy', 'Esme',
    'Freya', 'Georgia', 'Harlow', 'Isla', 'Juniper', 'Kinsley', 'Lola',
    'Mabel', 'Nora', 'Olive', 'Poppy', 'Quincy', 'Remi', 'Stella'
  ]
}

// Common Khmer surnames
const KHMER_SURNAMES = [
  'Prak', 'Chan', 'Sim', 'Kim', 'Lim', 'Oum', 'Nhem', 'Sun', 'Mao', 'Khun',
  'San', 'Khem', 'Tep', 'Chhim', 'Ros', 'Em', 'Yem', 'Thach', 'Krouch', 'Soeung',
  'Heng', 'Tang', 'Khat', 'Chin', 'Ouk', 'Long', 'Than', 'Seng', 'Dy', 'Chea',
  'Hok', 'Eang', 'Ngov', 'Chhin', 'Chao', 'Ngin', 'Kham', 'Moul', 'Pen', 'Phan',
  'Khiev', 'Yos', 'Suan', 'Chum', 'Pho', 'Lao', 'Eng', 'Chhun', 'Toch', 'Va',
  'Thai', 'Cheam', 'Moeun', 'Khlot', 'Sem', 'Ou', 'Sin', 'Thong', 'Pov', 'Seang',
  'Oem', 'Ngoun', 'Tes', 'In', 'Lay', 'Chak', 'Khov', 'Hong', 'Mok', 'Oeun',
  'Oun', 'Som', 'Mom', 'Saem', 'Khon', 'Kosal', 'Him', 'Nhor', 'Samnang', 'Pheap',
  'Thea', 'Srun', 'Kuoy', 'Kang', 'Soth', 'Soun', 'Yin', 'Suy', 'Von', 'Koeun',
  'Pruot', 'Dam', 'Hin', 'Duong', 'Chheang', 'Teang', 'Pang', 'Phuong', 'Kruy',
  'Ny', 'Vann', 'Sary', 'Sok', 'Say', 'Teav', 'Iem', 'Sum', 'Voeun', 'Un',
  'Taing', 'Khy', 'Neang', 'Keo', 'Liv', 'Rin', 'Sou', 'Nget', 'Pich', 'Sai',
  'Ry', 'Nuon', 'Srey', 'Sith', 'Cheat', 'Pen', 'Ngoy', 'Ya', 'Duch', 'Ouch',
  'Sin', 'Sam', 'Phally', 'Nget', 'Pheak', 'Hy', 'Mao', 'Roat', 'Ken', 'Toeur',
  'Vutha', 'Pan', 'Ya', 'Pok', 'Soeun', 'Chhay', 'Trang', 'Chum', 'Sothea',
  'Heang', 'Chhuor', 'Chong', 'Voeurn', 'Loun', 'Nguon', 'Oeur', 'Sruon', 'Toch',
  'Sour', 'Yan', 'Pho', 'Lach', 'Ma', 'Lun', 'Kuch', 'Neang', 'Thorn', 'Noup',
  'Phon', 'Nim', 'Run', 'Prum', 'Bien', 'Khan', 'Huon', 'Touch', 'Kranh', 'Hak',
  'Doeun', 'Tat', 'Morn', 'Tuot', 'Ly', 'Sean', 'Soeung', 'Son', 'Hoy', 'Huot',
  'Hun', 'Thom', 'Kouch', 'Moeuk', 'Uy', 'Ran', 'Puth', 'Pich', 'Yam', 'Yoeurn',
  'Yim', 'Kran', 'Bo', 'Chork', 'Orm', 'Saing', 'Te', 'Noeurng', 'Chheng', 'Nem',
  'Nhim', 'Lak', 'Soy', 'Lon', 'Saroeun', 'Khlaing', 'Pha', 'Thom', 'Dim',
  'Sang', 'Phoung', 'Chhuon', 'Sat', 'Nam', 'Vong', 'Neang', 'Thoeun', 'Saom',
  'Kheang', 'Ret', 'Phe', 'Sambath', 'Leng', 'Khann', 'Sou', 'Yann', 'Chhem',
  'Nop', 'Khorn', 'Duong', 'Tann', 'Neath', 'Saing', 'Thet', 'Thai', 'Pring',
  'Nup', 'Sambor', 'Moan', 'Yos', 'So', 'Khuo', 'Phat', 'Theang', 'Ly', 'Sin',
  'Khov', 'Khoem', 'Sao', 'Chum', 'Romam', 'Phin', 'Muoy', 'Sot', 'Klaut',
  'Chuon', 'Chheang', 'Reang', 'Khoeun', 'Suon', 'Khean', 'Khla', 'Kin', 'Khem',
  'Choeurn', 'Hout', 'Tith', 'Chhin', 'Tieng', 'Khieng', 'Khieu', 'Van', 'Lorn',
  'Khlot', 'Leang', 'Chhuot', 'Luon', 'Sokhom', 'Suy', 'Ong', 'Nol', 'Song',
  'Um', 'Che', 'Nun', 'Heang', 'Long', 'Nhep', 'Oeur', 'Kak', 'Thol', 'Yoeu',
  'Phem', 'Kong', 'Phoak', 'Ma', 'Pon', 'So', 'Mao', 'Nou', 'Mo', 'Yi',
  'Chamroeun', 'Nu', 'Chi', 'Chan', 'Sopheak', 'Phorn', 'Sophal', 'Seum', 'Ouk'
]

// American given names (for American party / American influence areas)
const AMERICAN_GIVEN_NAMES = {
  male: [
    'David', 'John', 'Michael', 'James', 'Robert', 'William', 'Thomas', 'Daniel',
    'Christopher', 'Matthew', 'Andrew', 'Joseph', 'Ryan', 'Brandon', 'Tyler',
    'Jacob', 'Nicholas', 'Joshua', 'Samuel', 'Anthony', 'Alexander', 'Benjamin',
    'Jonathan', 'Kevin', 'Steven', 'Brian', 'Timothy', 'Jason', 'Jeffrey',
    'Eric', 'Mark', 'Charles', 'Paul', 'Stephen', 'Kenneth', 'Gregory',
    'Jesse', 'Ethan', 'Noah', 'Liam', 'Oliver', 'Elijah', 'Lucas', 'Mason',
    'Logan', 'Aiden', 'Jackson', 'Carter', 'Sebastian', 'Mateo', 'Leo',
    'Wyatt', 'Jack', 'Owen', 'Theodore', 'Dylan', 'Luke', 'Gabriel', 'Isaac',
    'Anthony', 'Grayson', 'Jayden', 'Elias', 'Lincoln', 'Hudson', 'Nathan',
    'Caleb', 'Adrian', 'Christian', 'Hunter', 'Cameron', 'Connor', 'Ezra',
    'Aaron', 'Landon', 'Colton', 'Bentley', 'Austin', 'Angel', 'Brayden',
    'Dominic', 'Jose', 'Ian', 'Jaxon', 'Adam', 'Gavin', 'Jordan', 'Nicholas',
    'Evan', 'Declan', 'Emmett', 'Micah', 'Rowan', 'Sawyer', 'Weston',
    'August', 'Beckett', 'Brooks', 'Dakota', 'Finn', 'Graham', 'Holden'
  ],
  female: [
    'Emma', 'Olivia', 'Sophia', 'Ava', 'Isabella', 'Mia', 'Charlotte', 'Amelia',
    'Harper', 'Evelyn', 'Abigail', 'Emily', 'Elizabeth', 'Sofia', 'Avery',
    'Ella', 'Madison', 'Scarlett', 'Victoria', 'Luna', 'Grace', 'Chloe',
    'Penelope', 'Layla', 'Riley', 'Zoey', 'Nora', 'Lily', 'Eleanor', 'Hannah',
    'Lillian', 'Addison', 'Aubrey', 'Natalie', 'Brooklyn', 'Stella', 'Leah',
    'Hazel', 'Violet', 'Aurora', 'Savannah', 'Audrey', 'Bella', 'Claire',
    'Skylar', 'Lucy', 'Paisley', 'Everly', 'Anna', 'Caroline', 'Nova',
    'Genesis', 'Emilia', 'Kennedy', 'Samantha', 'Maya', 'Willow', 'Kinsley',
    'Naomi', 'Aaliyah', 'Elena', 'Sarah', 'Ariana', 'Allison', 'Gabriella',
    'Alice', 'Madelyn', 'Cora', 'Ruby', 'Eva', 'Serenity', 'Autumn', 'Adeline',
    'Hailey', 'Gianna', 'Valentina', 'Isla', 'Eliana', 'Quinn', 'Ivy',
    'Sadie', 'Piper', 'Lydia', 'Alexa', 'Josephine', 'Emery', 'Julia',
    'Delilah', 'Arianna', 'Vivian', 'Kaylee', 'Sophie', 'Brielle', 'Madeline'
  ]
}

// American surnames
const AMERICAN_SURNAMES = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson',
  'Walker', 'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen',
  'Hill', 'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera',
  'Campbell', 'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans',
  'Turner', 'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart',
  'Morris', 'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz',
  'Morgan', 'Cooper', 'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos',
  'Kim', 'Cox', 'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood',
  'James', 'Bennett', 'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez',
  'Castillo', 'Sanders', 'Patel', 'Myers', 'Long', 'Ross', 'Foster', 'Jimenez'
]

// Roman given names (for Roman party / Roman influence areas)
const ROMAN_GIVEN_NAMES = {
  male: [
    'Marcus', 'Antonius', 'Julius', 'Claudius', 'Maximus', 'Augustus', 'Titus',
    'Lucius', 'Gaius', 'Decimus', 'Cassius', 'Flavius', 'Tiberius', 'Brutus',
    'Cicero', 'Horatius', 'Vergilius', 'Ovidius', 'Plinius', 'Seneca', 'Traianus',
    'Hadrianus', 'Antoninus', 'Commodus', 'Septimius', 'Valerius', 'Constantius',
    'Justinian', 'Aurelius', 'Fabius', 'Quintus', 'Sextus', 'Publius', 'Gnaeus',
    'Appius', 'Aulus', 'Manius', 'Servius', 'Spurius', 'Numerius', 'Vibius',
    'Agrippa', 'Drusus', 'Germanicus', 'Nero', 'Caligula', 'Vitellius', 'Vespasian',
    'Tacitus', 'Livius', 'Sallustius', 'Catullus', 'Propertius', 'Tibullus',
    'Martialis', 'Juvenalis', 'Persius', 'Lucanus', 'Silius', 'Statius', 'Valerius',
    'Pompeius', 'Crassus', 'Lentulus', 'Marcellus', 'Scipio', 'Gracchus', 'Brutus',
    'Cato', 'Cicero', 'Sallust', 'Caesar', 'Pompey', 'Lucretius', 'Manilius',
    'Phadrus', 'Macrobius', 'Martianus', 'Boethius', 'Cassiodorus', 'Sidonius',
    'Ennius', 'Naevius', 'Plautus', 'Terentius', 'Accius', 'Pacuvius', 'Attius'
  ],
  female: [
    'Claudia', 'Julia', 'Livia', 'Octavia', 'Flavia', 'Cornelia', 'Agrippina',
    'Drusilla', 'Antonia', 'Valeria', 'Maxima', 'Constantina', 'Faustina',
    'Antonina', 'Aurelia', 'Fabia', 'Quintina', 'Sexta', 'Publia', 'Gnaea',
    'Appia', 'Aula', 'Mania', 'Servia', 'Spuria', 'Numeria', 'Vibia',
    'Agrippina', 'Livilla', 'Messalina', 'Poppaea', 'Sabina', 'Plotina',
    'Matidia', 'Lucilla', 'Crispina', 'Bruttia', 'Furia', 'Hostia', 'Decia',
    'Rufina', 'Prisca', 'Vera', 'Casta', 'Pia', 'Festa', 'Laeta', 'Pulchra',
    'Bella', 'Fortunata', 'Felix', 'Felicitas', 'Pax', 'Victoria', 'Libertas',
    'Clementia', 'Concordia', 'Spes', 'Fides', 'Pietas', 'Virtus', 'Honos',
    'Salus', 'Securitas', 'Genius', 'Juno', 'Minerva', 'Diana', 'Vesta',
    'Ceres', 'Venus', 'Fortuna', 'Bellona', 'Cybele', 'Isis', 'Magna Mater',
    'Astarte', 'Tanit', 'Juno Regina', 'Juno Moneta', 'Juno Sospita',
    'Minerva Medica', 'Venus Genetrix', 'Venus Victrix', 'Diana Nemorensis'
  ]
}

// Roman surnames (cognomina and family names)
const ROMAN_SURNAMES = [
  'Antonius', 'Julius', 'Claudius', 'Maximus', 'Augustus', 'Titus', 'Lucius',
  'Gaius', 'Decimus', 'Cassius', 'Flavius', 'Tiberius', 'Brutus', 'Cicero',
  'Horatius', 'Vergilius', 'Ovidius', 'Plinius', 'Seneca', 'Traianus',
  'Aurelius', 'Fabius', 'Quintus', 'Sextus', 'Publius', 'Gnaeus', 'Appius',
  'Aulus', 'Manius', 'Servius', 'Spurius', 'Agrippa', 'Drusus', 'Germanicus',
  'Nero', 'Caligula', 'Vitellius', 'Vespasian', 'Tacitus', 'Livius', 'Sallustius',
  'Catullus', 'Propertius', 'Tibullus', 'Martialis', 'Juvenalis', 'Persius',
  'Lucanus', 'Silius', 'Statius', 'Valerius', 'Pompeius', 'Crassus', 'Lentulus',
  'Marcellus', 'Scipio', 'Gracchus', 'Cato', 'Caesar', 'Pompey', 'Lucretius',
  'Manilius', 'Phadrus', 'Macrobius', 'Martianus', 'Boethius', 'Cassiodorus',
  'Sidonius', 'Ennius', 'Naevius', 'Plautus', 'Terentius', 'Accius', 'Pacuvius',
  'Attius', 'Africanus', 'Asiaticus', 'Coruncanius', 'Mus', 'Rullianus',
  'Blaesus', 'Curio', 'Dentatus', 'Dolabella', 'Figulus', 'Glabrio',
  'Lepidus', 'Macer', 'Murena', 'Nerva', 'Piso', 'Rufus', 'Sabinus',
  'Silanus', 'Varro', 'Volusius', 'Cimber', 'Gallus', 'Hispanus', 'Italicus',
  'Macedonicus', 'Numidicus', 'Siculus', 'Thracius', 'Ahenobarbus', 'Barba',
  'Bibulus', 'Calvus', 'Canus', 'Cicero', 'Cilo', 'Cordus', 'Cornutus',
  'Cotta', 'Curvus', 'Ferox', 'Fronto', 'Geminus', 'Labeo', 'Lactus',
  'Laevinus', 'Lanatus', 'Lentulus', 'Libo', 'Longus', 'Lucullus', 'Macer',
  'Malleolus', 'Marcellus', 'Merula', 'Messalla', 'Metellus', 'Murena',
  'Nasica', 'Nero', 'Nepos', 'Nerva', 'Niger', 'Novatus', 'Otho', 'Paetus',
  'Pansa', 'Paulus', 'Piso', 'Plancus', 'Priscus', 'Publicola', 'Pulcher',
  'Rufus', 'Rullus', 'Sabinus', 'Scaurus', 'Silanus', 'Silo', 'Strabo',
  'Sulla', 'Taurus', 'Titianus', 'Torquatus', 'Tubero', 'Tubertus', 'Tullus',
  'Varro', 'Vatia', 'Verrucosus', 'Vespillo', 'Vitulus', 'Volusius'
]

// Seeded random generator for consistent results
function mulberry32(a) {
  return function () {
    let t = a += 0x6D2B79F5
    t = Math.imul(t ^ t >>> 15, t | 1)
    t ^= t + Math.imul(t ^ t >>> 7, t | 61)
    return ((t ^ t >>> 14) >>> 0) / 4294967296
  }
}

// Hash string to number for seeding
function hashString(str) {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash
  }
  return Math.abs(hash)
}

// Pick random item from array using seeded RNG
function pickRandom(array, rng) {
  return array[Math.floor(rng() * array.length)]
}

// Determine name style based on province demographics
function determineNameStyle(demographics) {
  const { coreKhmer, american, roman, frontier, urban } = demographics

  // Calculate weights for different name styles
  const traditionalWeight = (coreKhmer / 100) * 0.8 + 0.2
  const americanWeight = (american / 100) * 0.9
  const romanWeight = (roman / 100) * 0.9
  const frontierWeight = (frontier / 100) * 0.7

  // Normalize weights
  const total = traditionalWeight + americanWeight + romanWeight + frontierWeight
  const roll = Math.random() * total

  if (roll < traditionalWeight) {
    return 'traditional'
  } else if (roll < traditionalWeight + americanWeight) {
    return 'american'
  } else if (roll < traditionalWeight + americanWeight + romanWeight) {
    return 'roman'
  } else {
    return 'frontier'
  }
}

// Generate a name based on style, demographics, and party
function generateName(style, gender, rng, party = null) {
  const isMale = gender === 'male'

  // Party-specific naming: American and Roman parties get their respective cultural ties
  const isAmericanParty = party === 'american' || party === 'yellow'
  const isRomanParty = party === 'roman' || party === 'orange'

  if (isAmericanParty) {
    // American party: American given name + American OR Khmer surname
    const useAmericanSurname = rng() < 0.5
    const givenName = pickRandom(AMERICAN_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)
    const surname = useAmericanSurname
      ? pickRandom(AMERICAN_SURNAMES, rng)
      : pickRandom(KHMER_SURNAMES, rng)
    return `${givenName} ${surname}`
  }

  if (isRomanParty) {
    // Roman party: Roman given name + Roman OR Khmer surname
    const useRomanSurname = rng() < 0.5
    const givenName = pickRandom(ROMAN_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)
    const surname = useRomanSurname
      ? pickRandom(ROMAN_SURNAMES, rng)
      : pickRandom(KHMER_SURNAMES, rng)
    return `${givenName} ${surname}`
  }

  // Non-party-specific naming based on style/demographics
  switch (style) {
    case 'american':
      // American influence: American given + Khmer surname (globalization)
      return `${pickRandom(AMERICAN_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)} ${pickRandom(KHMER_SURNAMES, rng)}`
    case 'roman':
      // Roman influence: Roman given + Khmer surname (globalization)
      return `${pickRandom(ROMAN_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)} ${pickRandom(KHMER_SURNAMES, rng)}`
    case 'frontier':
      // Frontier: Traditional Khmer with occasional Maori/Spanish influence
      const frontierGlobalization = rng()
      if (frontierGlobalization < 0.15) {
        // Spanish influence
        return `${pickRandom(SPANISH_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)} ${pickRandom(KHMER_SURNAMES, rng)}`
      } else if (frontierGlobalization < 0.25) {
        // Maori influence
        return `${pickRandom(MAORI_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)} ${pickRandom(KHMER_SURNAMES, rng)}`
      }
      return `${pickRandom(KHMER_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)} ${pickRandom(KHMER_SURNAMES, rng)}`
    case 'traditional':
    default:
      // Traditional Khmer base with small globalization chance
      const traditionalGlobalization = rng()
      if (traditionalGlobalization < 0.08) {
        // Spanish influence
        return `${pickRandom(SPANISH_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)} ${pickRandom(KHMER_SURNAMES, rng)}`
      } else if (traditionalGlobalization < 0.12) {
        // Maori influence
        return `${pickRandom(MAORI_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)} ${pickRandom(KHMER_SURNAMES, rng)}`
      } else if (traditionalGlobalization < 0.18) {
        // Roman influence
        return `${pickRandom(ROMAN_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)} ${pickRandom(KHMER_SURNAMES, rng)}`
      } else if (traditionalGlobalization < 0.25) {
        // American influence
        return `${pickRandom(AMERICAN_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)} ${pickRandom(KHMER_SURNAMES, rng)}`
      }
      return `${pickRandom(KHMER_GIVEN_NAMES[isMale ? 'male' : 'female'], rng)} ${pickRandom(KHMER_SURNAMES, rng)}`
  }
}

// Calculate province demographics for a seat
function getProvinceDemographics(province) {
  if (!province) {
    return { coreKhmer: 100, american: 0, roman: 0, frontier: 0, urban: 50 }
  }

  const features = province.features || {}
  const originIndex = features.imperial_origin_index || 0
  const foreignIndex = features.foreign_origin_index || 0

  return {
    coreKhmer: Math.round(Math.max(0, 1 - originIndex - foreignIndex) * 100),
    american: Math.round((features.american_identity_index || 0) * 100),
    roman: Math.round((features.roman_identity_index || 0) * 100),
    frontier: Math.round((features.frontier_index || 0) * 100),
    urban: Math.round((features.urbanization_index || 0) * 100),
  }
}

// Main function to generate representative names
export function generateRepresentativeNames(seatDetails, provinces, seed = 'default') {
  const names = {}
  const usedNames = new Set()

  // Create RNG from seed
  const rng = mulberry32(hashString(seed))

  for (const seat of seatDetails || []) {
    // Find province for this seat
    const province = provinces?.find((p) =>
      p.name === seat.jurisdiction ||
      p.counties?.some((c) => c.name === seat.jurisdiction)
    )

    const demographics = getProvinceDemographics(province)
    const style = determineNameStyle(demographics)

    // Alternate gender based on seat index for balance
    const gender = seat.seatIndex % 2 === 0 ? 'male' : 'female'

    // Generate unique name (pass party for party-aware naming)
    let name
    let attempts = 0
    do {
      name = generateName(style, gender, rng, seat.party)
      attempts++
    } while (usedNames.has(name) && attempts < 100)

    usedNames.add(name)
    names[`${seat.party}_${seat.seatIndex}`] = name
  }

  return names
}

// Build a stable roster key independent of how other parties' seat counts shift.
// scopeKey already encodes both the geographic scope and chamber type.
function rosterKey(party, withinPartyIndex, scopeKey) {
  return `${party}_${withinPartyIndex}_${scopeKey}`
}

// Generate names for a scope+chamber block, applying incumbents where available,
// and recording new roster entries. Returns { names, rosterEntries }.
function generateScopeBlockNames(seatDetails, provinces, seed, scopeKey, incumbentRoster) {
  const names = {}
  const rosterEntries = {}
  const usedNames = new Set()
  const rng = mulberry32(hashString(seed))

  for (const seat of seatDetails || []) {
    const key = rosterKey(seat.party, seat.withinPartyIndex ?? 0, scopeKey)
    let name = incumbentRoster[key]

    if (!name) {
      const province = provinces?.find((p) =>
        p.name === seat.jurisdiction ||
        p.counties?.some((c) => c.name === seat.jurisdiction)
      )
      const demographics = getProvinceDemographics(province)
      const style = determineNameStyle(demographics)
      const gender = seat.seatIndex % 2 === 0 ? 'male' : 'female'
      let attempts = 0
      do {
        name = generateName(style, gender, rng, seat.party)
        attempts++
      } while (usedNames.has(name) && attempts < 100)
    }

    usedNames.add(name)
    names[`${seat.party}_${seat.seatIndex}`] = name
    rosterEntries[key] = name
  }

  return { names, rosterEntries }
}

// Generate all representative names for all scopes at once
export function generateAllScopeNames(results, store, electionStore) {
  if (!results?.provinces) return

  const resultsValue = results
  const countryName = store?.currentData?.country?.basic_info?.name || 'Khmer Empire'
  const seed = resultsValue.config?.seed || 'default'
  const incumbentRoster = electionStore.incumbentRoster || {}
  const newRoster = {}

  function processBlock(rawSeatDetails, chamberType, offset, scopeKey) {
    const seatDetails = rawSeatDetails.map((s) => ({ ...s, chamberType, seatIndex: s.seatIndex + offset }))
    if (!seatDetails.length) return
    const nameSeed = `${countryName}_${seed}-${scopeKey}-${chamberType}`
    const { names, rosterEntries } = generateScopeBlockNames(seatDetails, resultsValue.provinces, nameSeed, `${scopeKey}_${chamberType}`, incumbentRoster)
    electionStore.representativeNames = { ...electionStore.representativeNames, ...names }
    Object.assign(newRoster, rosterEntries)
  }

  // National
  processBlock(
    generateSeatDetails({ seats: resultsValue.national?.assembly?.seats || {}, chamberType: 'assembly', scope: 'national', provinces: resultsValue.provinces }),
    'assembly', SEAT_OFFSETS.national.assembly, 'national'
  )
  processBlock(
    generateSeatDetails({ seats: resultsValue.national?.prelates?.seats || {}, chamberType: 'prelates', scope: 'national', provinces: resultsValue.provinces }),
    'prelates', SEAT_OFFSETS.national.prelates, 'national'
  )

  // Regional
  Object.values(resultsValue.regions || {}).forEach((region) => {
    const scopeKey = `region_${region.name}`
    processBlock(
      generateSeatDetails({ seats: region?.assembly?.seats || {}, chamberType: 'assembly', scope: 'regional', provinces: resultsValue.provinces, selectedRegionName: region.name }),
      'assembly', SEAT_OFFSETS.regional.assembly, scopeKey
    )
    processBlock(
      generateSeatDetails({ seats: region?.prelates?.seats || {}, chamberType: 'prelates', scope: 'regional', provinces: resultsValue.provinces, selectedRegionName: region.name }),
      'prelates', SEAT_OFFSETS.regional.prelates, scopeKey
    )
  })

  // Provincial
  resultsValue.provinces.forEach((province) => {
    const scopeKey = `province_${province.name}`
    processBlock(
      generateSeatDetails({ seats: province?.assembly?.seats || {}, chamberType: 'assembly', scope: 'provincial', provinces: resultsValue.provinces, selectedProvince: province }),
      'assembly', SEAT_OFFSETS.provincial.assembly, scopeKey
    )
    processBlock(
      generateSeatDetails({ seats: province?.prelates?.seats || {}, chamberType: 'prelates', scope: 'provincial', provinces: resultsValue.provinces, selectedProvince: province }),
      'prelates', SEAT_OFFSETS.provincial.prelates, scopeKey
    )
  })

  electionStore.saveCurrentRoster(newRoster)
}
