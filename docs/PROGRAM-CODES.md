# DIT program codes used by Epapers

Epapers uses readable program abbreviations in the API, frontend program selectors and CSV module imports. The supplied DIT Prospectus 2025/2026 lists the programme titles and campuses on PDF pages 22-24 (printed pages 5-7). The 22 abbreviations supplied by the project owner are used exactly; the prospectus does not establish these application code spellings as official DIT codes.

Programs remain separate per campus. Where the same program runs on Main and another campus, the Main code is unsuffixed and the other code has a campus suffix. A program offered only at Mwanza retains its own unsuffixed abbreviation. This preserves the database's globally unique program codes and keeps CSV imports unambiguous.

| Code | Programme | Campus | Previous code | Source |
|---|---|---|---|---|
| BENGBME | Bachelor of Engineering (B.Eng) in Biomedical Engineering | MAIN | P0405MA | Provided by owner |
| BENGCE | Bachelor of Engineering (B.Eng) in Civil Engineering | MAIN | P0102MA | Provided by owner |
| BENGCOE | Bachelor of Engineering (B.Eng) in Computer Engineering | MAIN | P0204MA | Provided by owner |
| BENGEE | Bachelor of Engineering (B.Eng) in Electrical Engineering | MAIN | P0304MA | Provided by owner |
| BENGETE | Bachelor of Engineering (B.Eng) in Electronics and Telecommunications Engineering | MAIN | P0404MA | Provided by owner |
| BENGGENERAL | Common Modules | MAIN | P0802MA | Internal grouping |
| BENGME | Bachelor of Engineering (B.Eng) in Mechanical Engineering | MAIN | P0503MA | Provided by owner |
| BENGMINE | Bachelor of Engineering (B.Eng) in Mining Engineering | MAIN | P0505MA | Provided by owner |
| BENGOGE | Bachelor of Engineering (B.Eng) in Oil and Gas Engineering | MAIN | P0504MA | Provided by owner |
| BTECHLS | Bachelor of Technology (B.Tech) in Laboratory Sciences | MAIN | P0604MA | Provided by owner |
| BTECHLS-MWANZA | Bachelor of Technology (B.Tech) in Laboratory Sciences | MWANZA | P0604MW | Campus variant |
| ODABPT | Ordinary Diploma in Agro Bioprocess Technology | MWANZA | P0707MW | Epapers convention |
| ODAPHT | Ordinary Diploma in Agricultural Post-Harvest Technology | MWANZA | P0705MW | Epapers convention |
| ODBME | Ordinary Diploma in Biomedical Equipment Engineering | MAIN | P0403MA | Provided by owner |
| ODBT | Ordinary Diploma in Biotechnology | MAIN | P0602MA | Epapers convention |
| ODCE | Ordinary Diploma in Civil Engineering | MAIN | P0101MA | Provided by owner |
| ODCE-SONGWE | Ordinary Diploma in Civil Engineering | SONGWE | P0101SO | Campus variant |
| ODCOE | Ordinary Diploma in Computer Engineering | MAIN | P0201MA | Provided by owner |
| ODCST | Ordinary Diploma in Communication System Technology | MAIN | P0402MA | Provided by owner |
| ODEE | Ordinary Diploma in Electrical Engineering | MAIN | P0301MA | Provided by owner |
| ODERE | Ordinary Diploma in Electrical and Renewable Energy Engineering | MAIN | P0302MA | Provided by owner |
| ODETE | Ordinary Diploma in Electronics and Telecommunications Engineering | MAIN | P0401MA | Provided by owner |
| ODFDT | Ordinary Diploma in Fashion and Design Technology | MWANZA | P0706MW | Epapers convention |
| ODFPT | Ordinary Diploma in Food Processing Technology | MWANZA | P0703MW | Epapers convention |
| ODFST | Ordinary Diploma in Food Science and Technology | MAIN | P0603MA | Epapers convention |
| ODGENERAL | Common Modules | MAIN | P0801MA | Internal grouping |
| ODIAE | Ordinary Diploma in Industrial Automation Engineering | MAIN | P0303MA | Provided by owner |
| ODIT | Ordinary Diploma in Information Technology | MAIN | P0202MA | Provided by owner |
| ODLPCT | Ordinary Diploma in Leather Processing Technology | MWANZA | P0701MW | Epapers convention |
| ODLPT | Ordinary Diploma in Leather Products Technology | MWANZA | P0702MW | Epapers convention |
| ODME | Ordinary Diploma in Mechanical Engineering | MAIN | P0501MA | Provided by owner |
| ODMFT | Ordinary Diploma in Multimedia and Film Technology | MAIN | P0203MA | Provided by owner |
| ODMINE | Ordinary Diploma in Mining Engineering | MAIN | P0502MA | Provided by owner |
| ODSLT | Ordinary Diploma in Science and Laboratory Technology | MAIN | P0601MA | Provided by owner |
| ODSLT-MWANZA | Ordinary Diploma in Science and Laboratory Technology | MWANZA | P0601MW | Campus variant |
| ODTT | Ordinary Diploma in Textile Technology | MWANZA | P0704MW | Epapers convention |


The extra diploma codes (ODBT, ODFST, ODLPCT, ODLPT, ODFPT, ODTT, ODAPHT, ODFDT and ODABPT) are descriptive Epapers conventions for the additional programmes in the prospectus. ODGENERAL and BENGGENERAL are existing internal Common Modules groupings, rather than separate awards. Existing department assignments flagged for verification remain flagged; changing program codes does not relocate a program.

Migration 0010_program_abbreviations updates the old seeded codes in place. It preserves program UUIDs, modules, submissions and paper links. Custom program codes are preserved. A conflicting live code causes the migration to fail rather than merge or delete programs.

The active seed is prisma/seed/curriculum-v2.json; curriculum-v1.json remains a historical mapping. Repeated seeding recognizes both the old and new code and updates the existing row, instead of creating a duplicate. Run npm run db:migrate first, then npm run db:seed for a fresh or existing installation.

For module CSV imports, use the exact code above in programCode, for example BENGME, ODME or ODCE-SONGWE. Frontend filters still submit program IDs, not code labels, so changing an abbreviation does not change the selected program's identity. Public GET /api/v1/programs returns the new code in its code field.
