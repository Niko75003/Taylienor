const ALBUMS=[
{id:'debut',title:'Taylor Swift',year:2006,version:'Original',a:'#6eaaa5',b:'#d8cba7',tracks:['Tim McGraw','Picture to Burn','Our Song']},
{id:'fearless',title:'Fearless (Taylor’s Version)',year:2021,version:'Taylor’s Version',a:'#c69c5e',b:'#e7d8b5',tracks:['Fearless','Love Story','You Belong with Me','Mr. Perfectly Fine']},
{id:'speak',title:'Speak Now (Taylor’s Version)',year:2023,version:'Taylor’s Version',a:'#6d4779',b:'#c8a1cb',tracks:['Mine','Enchanted','Long Live','I Can See You']},
{id:'red',title:'Red (Taylor’s Version)',year:2021,version:'Taylor’s Version',a:'#7e3030',b:'#c78a65',tracks:['Red','All Too Well','22','All Too Well (10 Minute Version)']},
{id:'1989',title:'1989 (Taylor’s Version)',year:2023,version:'Taylor’s Version',a:'#69a6c9',b:'#d9c9aa',tracks:['Blank Space','Style','Wildest Dreams','Is It Over Now?']},
{id:'reputation',title:'reputation',year:2017,version:'Original',a:'#191919',b:'#777',tracks:['…Ready for It?','Delicate','Getaway Car','New Year’s Day']},
{id:'lover',title:'Lover',year:2019,version:'Original',a:'#e790a9',b:'#8fbcd0',tracks:['Cruel Summer','Lover','The Archer','Daylight']},
{id:'folklore',title:'folklore',year:2020,version:'Original',a:'#4d4d4d',b:'#b8b8b8',tracks:['cardigan','exile','august','betty']},
{id:'evermore',title:'evermore',year:2020,version:'Original',a:'#6e3b28',b:'#aa795c',tracks:['willow','champagne problems','ivy','evermore']},
{id:'midnights',title:'Midnights',year:2022,version:'Original',a:'#25304d',b:'#846d85',tracks:['Lavender Haze','Anti-Hero','You’re on Your Own, Kid','Karma']},
{id:'ttpd',title:'THE TORTURED POETS DEPARTMENT',year:2024,version:'The Anthology',a:'#b5b0a8',b:'#4b4844',tracks:['Fortnight','Down Bad','So Long, London','I Can Do It with a Broken Heart']},
{id:'showgirl',title:'The Life of a Showgirl',year:2025,version:'Original',a:'#d26f42',b:'#4f8090',tracks:['The Fate of Ophelia','Opalite']}
];
const QUIZ=[
{q:'En quelle année Taylor Swift est-elle née ?',o:['1987','1988','1989','1990'],a:2,c:'Vie & personnalité'},
{q:'Quel album contient « Cruel Summer » ?',o:['reputation','Lover','folklore','Midnights'],a:1,c:'Discographie'},
{q:'Quel nombre est particulièrement associé à Taylor ?',o:['7','10','13','22'],a:2,c:'Fun facts'},
{q:'Quel album a été publié juste après folklore ?',o:['Midnights','evermore','Lover','Red (TV)'],a:1,c:'Chronologie'},
{q:'Quel album contient « august » ?',o:['folklore','evermore','Lover','1989'],a:0,c:'Discographie'},
{q:'Quel titre est une piste de Red (Taylor’s Version) ?',o:['cardigan','All Too Well','Delicate','Karma'],a:1,c:'Discographie'},
{q:'Comment s’appelle son frère ?',o:['Austin','Jack','Scott','Joe'],a:0,c:'Vie & personnalité'},
{q:'Quel album marque son virage pop pleinement assumé ?',o:['Fearless','Speak Now','1989','folklore'],a:2,c:'Carrière'},
{q:'Quel titre ouvre Midnights ?',o:['Anti-Hero','Lavender Haze','Maroon','Karma'],a:1,c:'Tracklists'},
{q:'Quel album contient « champagne problems » ?',o:['folklore','evermore','Midnights','Lover'],a:1,c:'Discographie'},
{q:'Quel album est sorti en 2017 ?',o:['Lover','reputation','1989','Red'],a:1,c:'Chronologie'},
{q:'Quel titre est associé à la piste 5 de Red ?',o:['22','All Too Well','Red','Treacherous'],a:1,c:'Tracklists'}
];