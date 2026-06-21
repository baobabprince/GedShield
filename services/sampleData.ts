
export interface Sample {
    name: string;
    type: 'ged' | 'txt';
    content: string;
}

export const royalGedcom = `
0 @I1@ INDI
1 NAME Elizabeth II /Windsor/
1 SEX F
1 BIRT
2 DATE 21 APR 1926
2 PLAC Mayfair, London, England
2 SOUR London Gazette - Official Birth Announcement
1 DEAT
2 DATE 8 SEP 2022
2 PLAC Balmoral Castle, Scotland
2 SOUR BBC Special Report
1 BURI
2 DATE 19 SEP 2022
2 PLAC St George's Chapel, Windsor
1 TITL Queen of the United Kingdom
1 OCCU Monarch
1 NOTE Longest-reigning British monarch.
1 FAMS @F1@
1 FAMC @F7@
0 @I2@ INDI
1 NAME Philip /Mountbatten/
1 SEX M
1 BIRT
2 DATE 10 JUN 1921
2 PLAC Mon Repos, Corfu, Greece
1 DEAT
2 DATE 9 APR 2021
2 PLAC Windsor Castle, England
2 SOUR Palace Statement
1 TITL Duke of Edinburgh
1 OCCU Prince Consort
1 FAMS @F1@
0 @I3@ INDI
1 NAME Charles III /Windsor/
1 SEX M
1 BIRT
2 DATE 14 NOV 1948
2 PLAC Buckingham Palace, London
1 TITL King of the United Kingdom
1 OCCU Monarch
1 FAMC @F1@
1 FAMS @F2@
1 FAMS @F3@
0 @I4@ INDI
1 NAME Diana /Spencer/
1 SEX F
1 BIRT
2 DATE 1 JUL 1961
2 PLAC Park House, Sandringham, Norfolk
1 DEAT
2 DATE 31 AUG 1997
2 PLAC Paris, France
2 SOUR Pitie-Salpetriere Hospital Report
1 TITL Princess of Wales
1 NOTE "The People's Princess"
1 FAMS @F2@
0 @I5@ INDI
1 NAME Camilla /Parker Bowles/
1 SEX F
1 BIRT
2 DATE 17 JUL 1947
2 PLAC King's College Hospital, London
1 TITL Queen Consort
1 FAMS @F3@
0 @I6@ INDI
1 NAME William /Windsor/
1 SEX M
1 BIRT
2 DATE 21 JUN 1982
2 PLAC St Mary's Hospital, London
1 TITL Prince of Wales
1 FAMC @F2@
1 FAMS @F4@
0 @I7@ INDI
1 NAME Catherine /Middleton/
1 SEX F
1 BIRT
2 DATE 9 JAN 1982
2 PLAC Royal Berkshire Hospital, Reading
1 TITL Princess of Wales
1 FAMS @F4@
0 @I8@ INDI
1 NAME George /Windsor/
1 SEX M
1 BIRT
2 DATE 22 JUL 2013
2 PLAC St Mary's Hospital, London
1 TITL Prince George of Wales
1 FAMC @F4@
0 @I11@ INDI
1 NAME Harry /Windsor/
1 SEX M
1 BIRT
2 DATE 15 SEP 1984
2 PLAC London, England
1 TITL Duke of Sussex
1 FAMC @F2@
1 FAMS @F5@
0 @I12@ INDI
1 NAME Meghan /Markle/
1 SEX F
1 BIRT
2 DATE 4 AUG 1981
2 PLAC Los Angeles, California, USA
1 TITL Duchess of Sussex
1 FAMS @F5@
0 @I18@ INDI
1 NAME George VI /Windsor/
1 SEX M
1 BIRT
2 DATE 14 DEC 1895
2 PLAC Sandringham House, Norfolk
1 DEAT
2 DATE 6 FEB 1952
2 PLAC Sandringham House, Norfolk
1 TITL King of the United Kingdom
1 FAMS @F7@
0 @I19@ INDI
1 NAME Elizabeth /Bowes-Lyon/
1 SEX F
1 BIRT
2 DATE 4 AUG 1900
2 PLAC London, England
1 DEAT
2 DATE 30 MAR 2002
2 PLAC Royal Lodge, Windsor
1 TITL Queen Mother
1 FAMS @F7@

0 @F1@ FAM
1 HUSB @I2@
1 WIFE @I1@
1 CHIL @I3@
1 MARR
2 DATE 20 NOV 1947
2 PLAC Westminster Abbey, London
2 SOUR Abbey Archives
0 @F2@ FAM
1 HUSB @I3@
1 WIFE @I4@
1 CHIL @I6@
1 CHIL @I11@
1 MARR
2 DATE 29 JUL 1981
2 PLAC St Paul's Cathedral, London
0 @F3@ FAM
1 HUSB @I3@
1 WIFE @I5@
1 MARR
2 DATE 9 APR 2005
2 PLAC Windsor Guildhall
0 @F4@ FAM
1 HUSB @I6@
1 WIFE @I7@
1 CHIL @I8@
1 MARR
2 DATE 29 APR 2011
2 PLAC Westminster Abbey, London
0 @F5@ FAM
1 HUSB @I11@
1 WIFE @I12@
1 MARR
2 DATE 19 MAY 2018
2 PLAC St George's Chapel, Windsor
0 @F7@ FAM
1 HUSB @I18@
1 WIFE @I19@
1 CHIL @I1@
1 MARR
2 DATE 26 APR 1923
2 PLAC Westminster Abbey, London
`;

export const karateClubTxt = `
# Zachary's Karate Club (Social Network)
# Classic network for community detection
1 2
1 3
1 4
1 5
1 6
1 7
1 8
1 9
1 11
1 12
1 13
1 14
1 18
1 20
1 22
1 32
2 3
2 4
2 8
2 14
2 18
2 20
2 22
2 31
3 4
3 8
3 9
3 10
3 14
3 28
3 29
3 33
4 8
4 13
4 14
5 7
5 11
6 7
6 11
6 17
7 11
9 31
9 33
9 34
10 34
14 34
15 33
15 34
16 33
16 34
19 33
19 34
20 34
21 33
21 34
23 33
23 34
24 26
24 28
24 30
24 33
24 34
25 26
25 28
25 32
26 32
27 30
27 34
28 34
29 32
29 34
30 33
30 34
31 33
31 34
32 33
32 34
33 34
`;

export const florentineFamiliesTxt = `
# Florentine Families Marriage Network (Renaissance Florence)
# Used to study the rise of the Medici
Acciaiuoli Medici
Albizzi Guadagni
Albizzi Medici
Albizzi Strozzi
Barbadori Castellani
Barbadori Medici
Bischeri Guadagni
Bischeri Peruzzi
Bischeri Strozzi
Castellani Peruzzi
Castellani Strozzi
Guadagni Lamberteschi
Guadagni Tornabuoni
Medici Ridolfi
Medici Salviati
Medici Tornabuoni
Pazzi Salviati
Peruzzi Strozzi
Ridolfi Strozzi
Ridolfi Tornabuoni
`;

export const sampleData: Sample[] = [
    {
        name: 'משפחת המלוכה (GEDCOM מועשר)',
        type: 'ged',
        content: royalGedcom
    },
    {
        name: 'מועדון הקראטה (TXT - זיהוי קהילות)',
        type: 'txt',
        content: karateClubTxt
    },
    {
        name: 'משפחות פלורנטיניות (TXT - מרכזיות)',
        type: 'txt',
        content: florentineFamiliesTxt
    }
];
