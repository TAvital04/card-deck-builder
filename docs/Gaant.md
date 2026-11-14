```mermaid
gantt
    title Hot Potato Project Timeline
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section DevOps Tal
    Scaffolding and CI           :done, t1, 2026-10-29, 1d
    Production Deploy            : t10, after t9, 3d

    section Database Michael
    Models and Connection        :done, t2, 2026-10-29, 1d
    Seeder                       :done, t6, 2026-11-06, 1d
    Gantt ERD Diagrams           :done, docs, 2026-11-14, 1d

    section API Toricelli
    Math Engine and Auth         :done, t3, 2026-11-03, 2d
    CRUD and Search API          :active, t7, 2026-11-10, 4d

    section Frontend An
    Scaffold and Auth UI         :done, t4, 2026-11-04, 5d
    Deck and Calc UI             : t8, after t7, 3d

    section Mobile Andres
    Flutter Scaffold             : t5, after t4, 2d
    Mobile Screens               : t9, after t8, 3d
