# סקירת עמידה בהנחיות — פרק ו' (יחידות 13–18)

מעבר שורה‑אחר‑שורה על כל ההנחיות מה‑PDF, מול מה שנבנה ואומת.
✅ = הושלם ואומת · ⚠️ = הושלם עם הערה · ❌ = חסר

---

## שלב א – בניית בסיס נתונים MySQL

| # | דרישה | סטטוס | היכן / איך אומת |
|---|--------|:----:|------------------|
| 1 | בסיס נתונים MySQL עם `users`, `todos`, `posts`, `comments` | ✅ | `server/sql/schema.sql`, רץ ב‑Docker, 8 טבלאות נוצרו |
| 2 | לכל user יש todos ו‑posts; לכל post יש comments | ✅ | FK + נתונים: 7 users, 37 todos, 14 posts, 23 comments |
| 3 | ניתן לצמצם כמות פריטים ושדות ב‑users | ✅ | טבלת users מצומצמת (name/username/email/phone/role) |
| 4 | המידע בטבלאות MySQL, ארכיטקטורת טבלאות מתוכננת | ✅ | סכמה עם PK/FK/INDEX/ENUM, charset utf8mb4 |
| 5 | טבלת `users+passwords` נפרדת + הגבלות גישה | ✅ | טבלת `credentials` (bcrypt), **ללא route**, נקראת רק ב‑login |

## שלב ב – שרת NodeJS + Express + REST API

| # | דרישה | סטטוס | היכן / איך אומת |
|---|--------|:----:|------------------|
| 1 | שרת NodeJS שמתחבר ל‑MySQL ומבצע שאילתות | ✅ | `src/db.js` — mysql2 pool, prepared statements |
| 2 | פונקציות ייעודיות לפעולות + בדיקתן | ✅ | `src/queries/*.queries.js` + `test-queries.js` (23/23 ✓) |
| 3 | מסגרת Express, נתיבים זהים ל‑jsonplaceholder | ✅ | `/users /todos /posts /comments /albums /photos` |
| 4 | GET / POST / PUT / DELETE על כל נתיב | ✅ | + PATCH. `test-api.sh` (26/26 ✓) |
| 5 | בדיקה ב‑Postman | ✅ | `server/postman/pulse.postman_collection.json` |

## שלב ג – לקוח React: login + register

| # | דרישה | סטטוס | היכן / איך אומת |
|---|--------|:----:|------------------|
| 1 | עמוד login בכתובת `/login` | ✅ | אומת בדפדפן |
| 2 | עמוד register בכתובת `/register` | ✅ | רישום דו‑שלבי קיים; register API אומת |
| 3 | טפסים: username + password + נוספים | ✅ | name/email/phone בנוסף |
| 4 | משתמש מורשה = אחד מ‑users עם סיסמתו | ✅ | `verifyCredentials` מול `credentials` (bcrypt) |
| 5 | כניסה לא מורשה נדחית עם הודעה, נשארת בעמוד | ✅ | אומת בדפדפן ("Incorrect username or password") |
| 6 | משתמש מורשה נשמר ב‑LS ומועבר ליישום | ✅ | `pulse.auth` + `pulse.token`, ניווט ל‑/home |
| 7 | כפתור Info מציג מידע אישי (לא סיסמה) | ✅ | אומת — אין סיסמה במידע המוצג |
| 8 | כפתור Logout מוחק מ‑LS ומחזיר לכניסה | ✅ | `clearToken()` + ניקוי LS + ניתוק session |
| 9 | כל עמוד עם URL פנימי אינפורמטיבי | ⚠️ | `/users/2/todos`, `/users/2/albums`, `/users/2/albums/:id/photos` ✓. עמוד ה‑Posts הוא פיד גלובלי ולכן ב‑`/posts` |

## שלב ד – Todos

| # | דרישה | סטטוס | היכן / איך אומת |
|---|--------|:----:|------------------|
| 1 | כפתור Todos מציג todos של המשתמש הפעיל | ✅ | אומת בדפדפן |
| 2 | מיון לפי id + checkbox ביצוע | ✅ | #7/#8/#9 ממוינים, checkbox עובד |
| 3 | GET לפי קריטריונים / שאילתות | ✅ | `?userId= &completed= &_sort= &_page= &_per_page=` |
| 4 | POST פריט חדש | ✅ | אומת — todo #46 נוסף ל‑MySQL |
| 5 | PUT עדכון (תוכן + מצב ביצוע) | ✅ | PUT + PATCH; toggle אומת ב‑DB |
| 6 | DELETE — "מה זו מחיקה?" | ✅ | **soft delete** — אומת: `is_deleted=1`, הרשומה נשמרת |

## שלב ה – Posts ו‑Comments

| # | דרישה | סטטוס | היכן / איך אומת |
|---|--------|:----:|------------------|
| 1 | כפתור Posts מציג posts | ✅ | אומת (5 posts + pagination) |
| 2 | מיון לפי id; לפי דרישה גם comments | ✅ | `ORDER BY id`; comments ב‑PostArticle |
| 3 | GET לפי קריטריונים | ✅ | `?userId= &_page= &_per_page=` |
| 4 | POST post / comment חדש | ✅ | אומת |
| 5 | PUT עדכון **רק אם שייך למשתמש** | ✅ | ownership middleware — אומת 403 למשתמש זר |
| 6 | DELETE **רק אם שייך** + "מה זו מחיקה?" | ✅ | ownership + soft delete; מחיקת post מבצעת cascade ל‑comments |

## שלבים נוספים – פעולות מתקדמות

| # | דרישה | סטטוס | היכן / איך אומת |
|---|--------|:----:|------------------|
| 1 | צמצום פעולות גישה לקוח↔שרת↔DB | ✅ | pagination, אינדקסים, join יחיד לבעלות, cache בלקוח |
| 2 | Albums ו‑Photos — DB + שרת + לקוח | ✅ | מלא בכל השכבות; pagination לתמונות |
| 3 | שאילתות מתקדמות עם פרמטרים ב‑URL | ✅ | filter/sort/pagination params, whitelisting נגד injection |
| 4 | שינוי סיסמה / שינוי פרטים / חסימת משתמש | ✅ | שינוי סיסמה + פרטים: UI ב‑ProfileSheet (אומת E2E); חסימה: API |
| 5 | חשבון מנהל (admin) | ✅ | `role='admin'`, `/admin/*`, requireAdmin (אומת 403 ללא‑admin) |

---

## אבטחה (מעבר לנדרש)
- סיסמאות ב‑**bcrypt** בטבלה נפרדת, לעולם לא מוחזרות.
- כל השאילתות ב‑**prepared statements** (הגנה מ‑SQL injection).
- אימות מבוסס‑טוקן; בעלות נאכפת **בצד השרת** (לא רק בלקוח).
- מיון/סינון מבוססי‑whitelist בלבד.

## הערה אחת לתשומת לב
- **URL של Posts**: עמוד ה‑Posts הוא פיד גלובלי (מציג posts של כל המשתמשים) ולכן הוא ב‑`/posts` ולא `/users/:id/posts`. ה‑URLs האינפורמטיביים האחרים (todos/albums/photos) כן מבוססי‑משתמש. אם רוצים — קל לשנות גם את Posts ל‑URL מבוסס‑משתמש.

## איך מריצים (תקציר)
```bash
cd server && npm install && npm run db:up && npm run seed && npm start
cd client && npm install && npm run dev
```
משתמשי בדיקה: `shaked.h`/`pulse123` (admin) · `maya_c`/`hello456` · `dan_l`/`sunny789`.
פירוט מלא ב‑`server/README.md`.

---

## סבב חיזוק נוסף (לפי הערות יעילות + אבטחה) — Pulse

| עיקרון | סטטוס | מימוש |
|--------|:----:|--------|
| **id ייחודי ולא רץ** | ✅ | כל הטבלאות עברו ל‑**UUID** (CHAR(36)) במקום AUTO_INCREMENT. לא ניתן לנחש/לספור רשומות. |
| **מינימום קריאות רשת / מחיקה מהשרת** | ✅ | מחיקת פוסט→cascade ל‑comments; מחיקת אלבום→cascade ל‑photos. הלקוח שולח **קריאה אחת**, לא לולאה. |
| **כל הגנת קליינט קיימת בשרת** | ✅ | ולידציית הרשמה (אורך סיסמה ≥6, פורמט username) נאכפת בשרת ב‑`POST /users`, לא רק בקליינט. |
| **חשיפת מינימום** | ✅ | `GET /users` מחזיר רק id+name+username. פרטים מלאים (email/phone/address) רק למשתמש עצמו או admin. |

אומת: queries 24/24 ✓ · API 26/26 ✓ · E2E בדפדפן (UUID ב‑URL, מחיקת פוסט = קריאה אחת, /users רזה).

> **עדכון URL:** סגמנט המשתמש ב‑URL עבר ל‑**username** (ייחודי + קריא, למשל `/users/talia.b/todos`), וה‑UUID נשאר פנימי לקריאות API. כך ה‑URL גם אינפורמטיבי וגם לא חושף מזהה רץ.
