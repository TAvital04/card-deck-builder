```mermaid
gantt
    title Hot Potato Project Timeline
    dateFormat  YYYY-MM-DD
    axisFormat  %b %d

    section DevOps (Tal)
    Scaffolding & CI           :done,    t1, 2026-10-29, 1d
    Production Deploy          :         t10, after t9, 3d

    section Database (Michael)
    Models & Connection        :done,    t2, 2026-10-29, 1d
    Seeder                     :done,    t6, 2026-11-06, 1d

    section API (Toricelli)
    Math Engine & Auth         :done,    t3, 2026-11-03, 2d
    CRUD & Search API          :active,  t7, 2026-11-10, 4d

    section Frontend (An)
    Scaffold & Auth UI         :done,    t4, 2026-11-04, 5d
    Deck & Calc UI             :         t8, after t7, 3d

    section Mobile (Andres)
    Flutter Scaffold           :         t5, after t4, 2d
    Mobile Screens             :         t9, after t8, 3d
